-- Isolated achievement ledger. No triggers or writes to existing application tables.
create table public.altar_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  event_key text not null check (length(event_key) between 1 and 180),
  recorded_at timestamptz not null default now(),
  primary key (user_id, kind, event_key)
);
create table public.altar_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  level integer not null check (level between 1 and 3),
  unlocked_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (user_id, item_id, level)
);
alter table public.altar_events enable row level security;
alter table public.altar_achievements enable row level security;
create policy altar_events_read_own on public.altar_events for select to authenticated using (user_id = auth.uid());
create policy altar_achievements_read_own on public.altar_achievements for select to authenticated using (user_id = auth.uid());
revoke all on public.altar_events, public.altar_achievements from anon, authenticated;
grant select on public.altar_events, public.altar_achievements to authenticated;
grant all on public.altar_events, public.altar_achievements to service_role;

create function public.altar_record_event(p_kind text, p_key text default '') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u uuid := auth.uid();
  k text := p_key;
  today text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD');
begin
  if u is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind in ('login','gospel_read') then
    k := today;
  elsif p_kind = 'novena_day' then
    if p_key !~ '^(ns-desatadora|sao-judas|divina-misericordia|santa-rita|sao-bento|sao-miguel):[1-9]$' then
      raise exception 'Invalid novena day';
    end if;
  elsif p_kind in ('gospel_share','promise_read','rosary_marian','rosary_mercy','rosary_special') then
    if p_key !~ '^[0-9a-f-]{36}$' then raise exception 'Invalid event identifier'; end if;
  else
    raise exception 'Unknown altar event';
  end if;
  insert into altar_events(user_id,kind,event_key) values (u,p_kind,k) on conflict do nothing;
end;
$$;

create function public.altar_sync() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u uuid := auth.uid();
  metrics jsonb;
  awards jsonb;
  rule record;
  submitted integer;
  returned integer;
begin
  if u is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  -- Serialize concurrent tab/device evaluations for this account.
  perform pg_advisory_xact_lock(hashtextextended(u::text, 7401));
  -- Import only existing, attributable records; never infer progress from XP.
  insert into altar_events(user_id,kind,event_key,recorded_at)
    select u,'cause',i.prayer_request_id::text,i.created_at from prayer_intercessions i
    join prayer_requests p on p.id = i.prayer_request_id
    where i.user_id=u and p.user_id is distinct from u
    on conflict do nothing;
  insert into altar_events(user_id,kind,event_key,recorded_at)
    select u,'request',p.id::text,p.created_at from prayer_requests p where p.user_id=u
    on conflict do nothing;
  insert into altar_events(user_id,kind,event_key)
    select u,'request_feedback',p.id::text from prayer_requests p
    where p.user_id=u and nullif(trim(p.feedback),'') is not null on conflict do nothing;
  insert into altar_events(user_id,kind,event_key)
    select u,'connection',friend_id::text from friendships where user_id=u and friend_id<>u
    union select u,'connection',referred_user_id::text from referrals where referrer_user_id=u and referred_user_id<>u
    on conflict do nothing;
  if exists(select 1 from push_devices where user_id=u) or exists(select 1 from push_subscriptions where user_id=u) then
    insert into altar_events(user_id,kind,event_key) values(u,'notifications','enabled') on conflict do nothing;
  end if;
  select coalesce(jsonb_object_agg(kind,n),'{}'::jsonb) into metrics from
    (select kind,count(*)::integer n from altar_events where user_id=u group by kind) counts;
  metrics := metrics || jsonb_build_object('gospel',greatest(coalesce((metrics->>'gospel_read')::int,0),coalesce((metrics->>'gospel_share')::int,0)));
  submitted := coalesce((metrics->>'request')::int,0);
  returned := coalesce((metrics->>'request_feedback')::int,0);
  metrics := metrics || jsonb_build_object('feedback_percent',case when submitted=0 then 0 else floor(100.0*returned/submitted) end);
  for rule in select * from (values
    ('candle',1,'login',30),('candle',2,'login',60),('candle',3,'login',120),
    ('cross',1,'cause',30),('cross',2,'cause',60),('cross',3,'cause',120),
    ('fraternity',1,'request',30),('fraternity',2,'request',60),('fraternity',3,'request',90),
    ('gospel',1,'gospel',15),('gospel',2,'gospel',30),('gospel',3,'gospel',45),
    ('rosary-wood',1,'rosary_marian',10),('rosary-pearl',1,'rosary_mercy',10),('rosary-gold',1,'rosary_special',10),
    ('chalice',1,'promise_read',30),('chalice',2,'promise_read',60),
    ('shield',1,'connection',5),('shield',2,'connection',10),('shield',3,'connection',15),
    ('lavender',1,'notifications',1)
  ) as r(item_id,level,metric,threshold) loop
    if coalesce((metrics->>rule.metric)::int,0)>=rule.threshold
       and (rule.item_id<>'fraternity' or rule.level<>3 or (submitted>0 and returned*4>=submitted*3)) then
      insert into altar_achievements(user_id,item_id,level) values(u,rule.item_id,rule.level) on conflict do nothing;
    end if;
  end loop;
  for rule in select split_part(event_key,':',1) as saint,count(*)::int as days
    from altar_events where user_id=u and kind='novena_day' group by split_part(event_key,':',1) loop
    metrics := metrics || jsonb_build_object(rule.saint,rule.days);
    if rule.days=9 then
      insert into altar_achievements(user_id,item_id,level) values(u,rule.saint,1) on conflict do nothing;
    end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'level',level,'unlockedAt',unlocked_at,'notifiedAt',notified_at) order by unlocked_at,item_id,level),'[]'::jsonb)
    into awards from altar_achievements where user_id=u;
  return jsonb_build_object('metrics',metrics,'achievements',awards);
end;
$$;

create function public.altar_acknowledge(p_item text,p_level integer) returns void
language sql security definer set search_path = public, pg_temp as $$
  update altar_achievements set notified_at=coalesce(notified_at,now())
  where user_id=auth.uid() and item_id=p_item and level=p_level;
$$;
revoke all on function public.altar_record_event(text,text), public.altar_sync(), public.altar_acknowledge(text,integer) from public,anon;
grant execute on function public.altar_record_event(text,text), public.altar_sync(), public.altar_acknowledge(text,integer) to authenticated;
