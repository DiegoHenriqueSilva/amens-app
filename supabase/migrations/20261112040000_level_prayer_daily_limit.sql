-- Daily intercession allowance: two causes at first, plus one every five levels.
-- Administrators keep the unlimited allowance previously requested.
create or replace function public.prayer_level_number(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from unnest(array[0,20,50,100,160,240,340,460,600,760,940,1140,1360,1600,1860,2140,2440,2760,3100,3460]) threshold
  where threshold <= coalesce((select total_xp from public.user_xp where user_id=p_user),0);
$$;

create or replace function public.prayer_daily_allowance(p_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare level_number integer;
begin
  if exists(
    select 1 from public.user_roles ur
    join public.roles r on r.id=ur.role_id
    where ur.user_id=p_user and r.name='admin'
  ) then
    return 2147483647;
  end if;
  level_number := public.prayer_level_number(p_user);
  return 2 + floor(level_number / 5.0)::integer;
end;
$$;

create or replace function public.prayer_daily_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  u uuid := auth.uid();
  level_number integer;
  allowance integer;
  used_count integer;
  admin_user boolean;
  next_bonus integer;
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  level_number := public.prayer_level_number(u);
  allowance := public.prayer_daily_allowance(u);
  admin_user := allowance=2147483647;
  select count(*)::integer into used_count
  from public.prayer_intercessions
  where user_id=u and created_at>=day_start and created_at<day_start+interval '1 day';
  next_bonus := case when level_number < 20 then (floor(level_number / 5.0)::integer + 1) * 5 else null end;
  return jsonb_build_object(
    'used',used_count,
    'limit',case when admin_user then null else allowance end,
    'remaining',case when admin_user then null else greatest(allowance-used_count,0) end,
    'level',level_number,
    'nextBonusLevel',next_bonus,
    'isAdmin',admin_user
  );
end;
$$;

create or replace function public.enforce_prayer_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowance integer;
  used_count integer;
  day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  -- Serialize attempts from multiple tabs or devices for the same account.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 7412));
  allowance := public.prayer_daily_allowance(new.user_id);
  if allowance=2147483647 then return new; end if;
  select count(*)::integer into used_count
  from public.prayer_intercessions
  where user_id=new.user_id and created_at>=day_start and created_at<day_start+interval '1 day';
  if used_count >= allowance then
    raise exception 'Daily prayer limit reached' using errcode='P0001', hint='daily_prayer_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_prayer_daily_limit on public.prayer_intercessions;
create trigger enforce_prayer_daily_limit
before insert on public.prayer_intercessions
for each row execute function public.enforce_prayer_daily_limit();

revoke all on function public.prayer_level_number(uuid), public.prayer_daily_allowance(uuid),
  public.prayer_daily_status(), public.enforce_prayer_daily_limit() from public, anon;
grant execute on function public.prayer_daily_status() to authenticated;
grant execute on function public.prayer_level_number(uuid), public.prayer_daily_allowance(uuid),
  public.enforce_prayer_daily_limit() to service_role;
