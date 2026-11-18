-- Server-only AI context, attempt ledger and cache. Failures also spend the AI budget.
create table if not exists public.prayer_ai_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  kind text not null check(kind in ('prayer','gospel')),
  resource text not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','done','failed')),
  output jsonb
);
alter table public.prayer_ai_attempts enable row level security;
revoke all on public.prayer_ai_attempts from public,anon,authenticated;
grant select,update on public.prayer_ai_attempts to service_role;
create index if not exists prayer_ai_attempts_day on public.prayer_ai_attempts(created_at,user_id);

create or replace function public.prayer_ai_context(p_user uuid,p_cause_id text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; devotion text;
begin
  if not public.prayer_actor_allowed(p_user) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  select devotional_saint into devotion from public.profiles where id=p_user;
  if p_cause_id ~ '^default-00[1-8]$' then return jsonb_build_object('devotion',devotion); end if;
  if p_cause_id is null or p_cause_id !~ '^[0-9a-fA-F-]{36}$' then raise exception 'prayer_unavailable' using errcode='42501'; end if;
  select jsonb_build_object('content',p.content,'devotion',devotion,'version',p.updated_at) into result
    from public.prayer_requests p where p.id=p_cause_id::uuid and public.prayer_publicly_visible(p.id);
  if result is null then raise exception 'prayer_unavailable' using errcode='42501'; end if;
  return result;
end;
$$;

create or replace function public.reserve_prayer_ai(p_user uuid,p_kind text,p_resource text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.prayer_ai_attempts; attempt uuid;
  day_start timestamptz:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  day_end timestamptz:=(date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo';
begin
  if p_kind not in ('prayer','gospel') or p_resource is null or length(p_resource)>160
    or (p_kind='prayer' and not public.prayer_actor_allowed(p_user)) or (p_kind='gospel' and p_user is not null) then
    raise exception 'prayer_ai_invalid' using errcode='22023'; end if;
  -- Global lock prevents parallel requests from exceeding the installation's hard cap.
  perform pg_advisory_xact_lock(7414);
  select * into previous from public.prayer_ai_attempts where user_id is not distinct from p_user and kind=p_kind
    and resource=p_resource and created_at>=day_start and created_at<day_end and status='done'
    order by created_at desc limit 1;
  if found then return jsonb_build_object('cached',previous.output); end if;
  if exists(select 1 from public.prayer_ai_attempts where user_id is not distinct from p_user and kind=p_kind
    and resource=p_resource and status='pending' and created_at>now()-interval '30 seconds') then
    return jsonb_build_object('denied','busy'); end if;
  if (select count(*) from public.prayer_ai_attempts where created_at>=day_start and created_at<day_end)>=100
    or (select count(*) from public.prayer_ai_attempts where user_id is not distinct from p_user and kind=p_kind
      and created_at>=day_start and created_at<day_end)>=3 then
    return jsonb_build_object('denied','budget'); end if;
  insert into public.prayer_ai_attempts(user_id,kind,resource) values(p_user,p_kind,p_resource) returning id into attempt;
  return jsonb_build_object('attemptId',attempt);
end;
$$;
revoke all on function public.prayer_ai_context(uuid,text),public.reserve_prayer_ai(uuid,text,text) from public,anon,authenticated;
grant execute on function public.prayer_ai_context(uuid,text),public.reserve_prayer_ai(uuid,text,text) to service_role;
