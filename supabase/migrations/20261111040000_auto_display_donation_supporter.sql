-- A confirmed production donation displays supporter recognition automatically.
-- The member can still hide it later in their own profile settings.
begin;

-- Supporter is a dedicated profile recognition, not one of the three selectable badges.
update public.profile_insignias p
set selected = array(
  select badge from unnest(p.selected) badge where badge <> 'supporter'
),
show_supporter_card = true
where 'supporter' = any(p.selected)
  and 'supporter' = any(public.insignia_eligible(p.user_id));

-- Apply the new default to production donations that were approved before this migration.
insert into public.profile_insignias(user_id, selected, show_supporter_card)
select user_id, '{}'::text[], true
from public.donation_supporter_eligibility
where active
on conflict(user_id) do update
set show_supporter_card = true,
    selected = array(
      select badge from unnest(public.profile_insignias.selected) badge
      where badge <> 'supporter'
    );

create or replace function public.save_insignias(p_selected text[],p_show_card boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); eligible text[];
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  eligible:=insignia_eligible(u);
  if p_selected is null or cardinality(p_selected)>3
    or exists(select 1 from unnest(p_selected) b
      where b is null or b='supporter' or not(b=any(eligible)))
    or cardinality(p_selected)<>(select count(distinct b) from unnest(p_selected) b)
    or (coalesce(p_show_card,false) and not('supporter'=any(eligible))) then
    raise exception 'Invalid insignia selection' using errcode='22023';
  end if;
  insert into profile_insignias(user_id,selected,show_supporter_card)
    values(u,p_selected,coalesce(p_show_card,false))
    on conflict(user_id) do update set selected=excluded.selected,show_supporter_card=excluded.show_supporter_card;
end; $$;

create or replace function public.public_insignias(p_users uuid[]) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if cardinality(p_users)>200 then raise exception 'Too many users'; end if;
  return coalesce((select jsonb_object_agg(user_id, jsonb_build_object(
    'selected',array(select b from unnest(selected) b
      where b<>'supporter' and b=any(insignia_eligible(user_id))),
    'showSupporterCard',show_supporter_card and 'supporter'=any(insignia_eligible(user_id))))
    from profile_insignias where user_id=any(p_users)),'{}'::jsonb);
end; $$;

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

    -- Set the initial display only when support becomes active. Repeated webhooks
    -- never override a member who later chooses to hide the recognition.
    if mapped_status in ('approved','partially_refunded') and not supporter_was_active then
      insert into profile_insignias(user_id,selected,show_supporter_card)
        values(donation.user_id,'{}'::text[],true)
        on conflict(user_id) do update
        set show_supporter_card=true,
            selected=array(select badge from unnest(profile_insignias.selected) badge where badge<>'supporter');
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.save_insignias(text[],boolean),
  public.public_insignias(uuid[]),
  public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.save_insignias(text[],boolean),public.public_insignias(uuid[]) to authenticated;
grant execute on function public.apply_mercadopago_order(text,text,text,text,boolean,integer) to service_role;

commit;
