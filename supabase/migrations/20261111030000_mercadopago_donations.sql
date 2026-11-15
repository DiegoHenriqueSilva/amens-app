-- Mercado Pago donations are kept separate from prayer and altar progress.
begin;

create table public.donation_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents between 500 and 1000000),
  charity_amount_cents integer generated always as (amount_cents / 2) stored,
  currency text not null default 'BRL' check (currency = 'BRL'),
  environment text not null check (environment in ('test','production')),
  provider text not null default 'mercadopago' check (provider = 'mercadopago'),
  provider_order_id text unique,
  idempotency_key uuid not null unique,
  status text not null default 'creating' check (status in (
    'creating','created','pending','approved','partially_refunded','rejected',
    'cancelled','refunded','expired','create_failed'
  )),
  status_detail text,
  checkout_url text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index donation_orders_user_created_idx
  on public.donation_orders(user_id, created_at desc);

create table public.donation_webhook_events (
  provider_event_id text primary key,
  provider_order_id text not null,
  event_type text not null,
  live_mode boolean not null,
  received_at timestamptz not null default now()
);

-- Kept apart from manually confirmed supporters, so a refund never removes a
-- recognition that an administrator granted for another legitimate donation.
create table public.donation_supporter_eligibility (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.donation_orders enable row level security;
alter table public.donation_webhook_events enable row level security;
alter table public.donation_supporter_eligibility enable row level security;
revoke all on public.donation_orders, public.donation_webhook_events,
  public.donation_supporter_eligibility from anon, authenticated;
grant all on public.donation_orders, public.donation_webhook_events,
  public.donation_supporter_eligibility to service_role;

create or replace function public.insignia_eligible(p_user uuid) returns text[]
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(distinct badge),'{}'::text[]) from (
    select case item_id when 'cross' then 'intercessor' when 'candle' then 'constancy'
      when 'gospel' then 'gospel' end badge
    from altar_achievements where user_id=p_user and item_id in ('cross','candle','gospel') and level>=1
    union all select 'supporter' from supporter_recognitions where user_id=p_user and active
    union all select 'supporter' from donation_supporter_eligibility where user_id=p_user and active
  ) earned;
$$;

create function public.my_donations() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'amountCents',amount_cents,'charityAmountCents',charity_amount_cents,
    'environment',environment,'status',status,'statusDetail',status_detail,
    'approvedAt',approved_at,'createdAt',created_at
  ) order by created_at desc),'[]'::jsonb)
  from (select * from donation_orders where user_id=auth.uid() order by created_at desc limit 20) d;
$$;

-- Called only with the service role after the signed webhook has been checked
-- and the order has been fetched directly from Mercado Pago.
create function public.apply_mercadopago_order(
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

  -- Test payments are visible in the test history but never grant a real badge.
  if donation.environment='production' then
    insert into donation_supporter_eligibility(user_id,active,updated_at)
      values(donation.user_id,exists(select 1 from donation_orders
        where user_id=donation.user_id and environment='production'
          and status in ('approved','partially_refunded')),now())
      on conflict(user_id) do update set active=excluded.active,updated_at=excluded.updated_at;
  end if;
  return true;
end;
$$;

revoke all on function public.insignia_eligible(uuid), public.my_donations(),
  public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  from public,anon,authenticated;
grant execute on function public.my_donations() to authenticated;
grant execute on function public.apply_mercadopago_order(text,text,text,text,boolean,integer)
  to service_role;

commit;
