-- Keep every valid supporter source when donation and admin features coexist.
begin;

-- A delayed Mercado Pago "created" event must never downgrade a payment that
-- was already accredited. approved_at is retained by every previous webhook,
-- so it is authoritative evidence for repairing only affected rows.
update public.donation_orders
set status='approved', updated_at=now()
where approved_at is not null
  and status in ('creating','created','pending');

-- Reconcile real Mercado Pago donations in case an earlier webhook was handled
-- before the supporter automation was installed.
update public.donation_supporter_eligibility eligibility
set active = exists (
  select 1 from public.donation_orders donation
  where donation.user_id = eligibility.user_id
    and donation.environment = 'production'
    and donation.status in ('approved', 'partially_refunded')
), updated_at = now();

insert into public.donation_supporter_eligibility(user_id, active, updated_at)
select distinct donation.user_id, true, now()
from public.donation_orders donation
where donation.environment = 'production'
  and donation.status in ('approved', 'partially_refunded')
on conflict(user_id) do update
set active = true, updated_at = excluded.updated_at;

-- Repair the initial display for confirmed donors and administrators affected
-- by the overwritten eligibility rule. They may hide it again in profile settings.
insert into public.profile_insignias(user_id, selected, show_supporter_card)
select eligibility.user_id, '{}'::text[], true
from public.donation_supporter_eligibility eligibility
where eligibility.active
on conflict(user_id) do update
set show_supporter_card=true,
    selected=array(select badge from unnest(public.profile_insignias.selected) badge where badge<>'supporter');

insert into public.profile_insignias(user_id, selected, show_supporter_card)
select distinct role_link.user_id, '{}'::text[], true
from public.user_roles role_link
join public.roles role on role.id = role_link.role_id
where role.name = 'admin'
on conflict(user_id) do update
set show_supporter_card=true,
    selected=array(select badge from unnest(public.profile_insignias.selected) badge where badge<>'supporter');

create or replace function public.insignia_eligible(p_user uuid) returns text[]
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(distinct badge),'{}'::text[]) from (
    select case item_id
      when 'cross' then 'intercessor'
      when 'candle' then 'constancy'
      when 'gospel' then 'gospel'
    end badge
    from public.altar_achievements
    where user_id=p_user and item_id in ('cross','candle','gospel') and level>=1
    union all
    select 'supporter' from public.supporter_recognitions
      where user_id=p_user and active
    union all
    select 'supporter' from public.donation_supporter_eligibility
      where user_id=p_user and active
    union all
    select 'supporter' where exists (
      select 1 from public.user_roles role_link
      join public.roles role on role.id=role_link.role_id
      where role_link.user_id=p_user and role.name='admin'
    )
  ) earned
  where badge is not null;
$$;

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

  -- Provider notifications may arrive out of order. Never turn an accredited
  -- contribution back into a newly-created or pending checkout.
  if mapped_status in ('created','pending') then
    if donation.status in ('approved','partially_refunded','refunded') then
      mapped_status:=donation.status;
    elsif donation.approved_at is not null then
      mapped_status:='approved';
    end if;
  end if;

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

revoke all on function public.insignia_eligible(uuid) from public,anon,authenticated;
revoke all on function public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  to service_role;

commit;
