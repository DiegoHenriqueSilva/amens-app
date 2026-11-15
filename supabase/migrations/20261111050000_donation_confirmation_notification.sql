-- Persist one inbox notification for each confirmed production donation.
begin;

alter table public.donation_orders
  add column if not exists confirmation_notified_at timestamptz;

-- The first real donation was confirmed before this behavior existed.
do $$
declare donation record;
begin
  for donation in
    select id,user_id,amount_cents
    from public.donation_orders
    where environment='production' and status='approved'
      and confirmation_notified_at is null
    for update
  loop
    insert into public.notifications(user_id,message,type)
    values (
      donation.user_id,
      '💛 Sua doação de R$ ' || (donation.amount_cents/100)::text || ',' ||
        lpad((donation.amount_cents%100)::text,2,'0') ||
        ' foi confirmada! Obrigado por fortalecer esta corrente de oração. Você agora é Apoiador(a) do Améns.',
      'donation_confirmed'
    );
    update public.donation_orders set confirmation_notified_at=now()
    where id=donation.id;
  end loop;
end $$;

create or replace function public.apply_mercadopago_order(
  p_provider_order_id text,
  p_external_reference text,
  p_status text,
  p_status_detail text,
  p_live_mode boolean,
  p_amount_cents integer
) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  donation donation_orders;
  mapped_status text;
  supporter_was_active boolean := false;
begin
  select * into donation from donation_orders
    where provider_order_id=p_provider_order_id and id::text=p_external_reference
    for update;
  if not found or donation.amount_cents<>p_amount_cents
    or (donation.environment='production')<>p_live_mode then
    return false;
  end if;

  mapped_status:=case
    when p_status='processed' and p_status_detail='accredited' then 'approved'
    when p_status='processed' and p_status_detail='partially_refunded' then 'partially_refunded'
    when p_status in ('processing','action_required') then 'pending'
    when p_status='created' then 'created'
    when p_status='failed' then 'rejected'
    when p_status in ('canceled','cancelled') then 'cancelled'
    when p_status='refunded' then 'refunded'
    when p_status='expired' then 'expired'
    else 'pending'
  end;

  update donation_orders set status=mapped_status,status_detail=p_status_detail,
    approved_at=case when mapped_status='approved' then coalesce(approved_at,now()) else approved_at end,
    updated_at=now()
  where id=donation.id;

  if donation.environment='production' then
    select coalesce(active,false) into supporter_was_active
    from donation_supporter_eligibility where user_id=donation.user_id;

    insert into donation_supporter_eligibility(user_id,active,updated_at)
      values(donation.user_id,exists(select 1 from donation_orders
        where user_id=donation.user_id and environment='production'
          and status in ('approved','partially_refunded')),now())
      on conflict(user_id) do update set active=excluded.active,updated_at=excluded.updated_at;

    if mapped_status in ('approved','partially_refunded') and not supporter_was_active then
      insert into profile_insignias(user_id,selected,show_supporter_card)
        values(donation.user_id,'{}'::text[],true)
        on conflict(user_id) do update
        set show_supporter_card=true,
            selected=array(select badge from unnest(profile_insignias.selected) badge where badge<>'supporter');
    end if;

    if mapped_status='approved' and donation.confirmation_notified_at is null then
      insert into notifications(user_id,message,type)
      values (
        donation.user_id,
        '💛 Sua doação de R$ ' || (donation.amount_cents/100)::text || ',' ||
          lpad((donation.amount_cents%100)::text,2,'0') ||
          ' foi confirmada! Obrigado por fortalecer esta corrente de oração. Você agora é Apoiador(a) do Améns.',
        'donation_confirmed'
      );
      update donation_orders set confirmation_notified_at=now() where id=donation.id;
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  to service_role;

commit;
