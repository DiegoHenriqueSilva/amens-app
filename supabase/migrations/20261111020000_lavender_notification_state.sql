-- The lavender decoration follows the current notification permission/state.
create or replace function public.altar_sync() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u uuid := auth.uid();
  metrics jsonb;
  awards jsonb;
  rule record;
  submitted integer;
  returned integer;
  notifications_enabled boolean := false;
begin
  if u is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 7401));
  insert into altar_events(user_id,kind,event_key,recorded_at)
    select u,'cause',i.prayer_request_id::text,i.created_at from prayer_intercessions i join prayer_requests p on p.id=i.prayer_request_id
    where i.user_id=u and p.user_id is distinct from u on conflict do nothing;
  insert into altar_events(user_id,kind,event_key,recorded_at)
    select u,'request',p.id::text,p.created_at from prayer_requests p where p.user_id=u on conflict do nothing;
  insert into altar_events(user_id,kind,event_key)
    select u,'request_feedback',p.id::text from prayer_requests p where p.user_id=u and nullif(trim(p.feedback),'') is not null on conflict do nothing;
  insert into altar_events(user_id,kind,event_key)
    select u,'connection',friend_id::text from friendships where user_id=u and friend_id<>u
    union select u,'connection',referred_user_id::text from referrals where referrer_user_id=u and referred_user_id<>u on conflict do nothing;
  if to_regclass('public.push_devices') is not null then
    execute 'select exists(select 1 from public.push_devices where user_id=$1)' into notifications_enabled using u;
  end if;
  if not notifications_enabled and to_regclass('public.push_subscriptions') is not null then
    execute 'select exists(select 1 from public.push_subscriptions where user_id=$1)' into notifications_enabled using u;
  end if;
  if notifications_enabled then
    insert into altar_events(user_id,kind,event_key) values(u,'notifications','enabled') on conflict do nothing;
  else
    delete from altar_events where user_id=u and kind='notifications' and event_key='enabled';
    delete from altar_achievements where user_id=u and item_id='lavender' and level=1;
  end if;
  select coalesce(jsonb_object_agg(kind,n),'{}'::jsonb) into metrics from (select kind,count(*)::integer n from altar_events where user_id=u group by kind) counts;
  metrics := metrics || jsonb_build_object('notifications',case when notifications_enabled then 1 else 0 end);
  metrics := metrics || jsonb_build_object('gospel',greatest(coalesce((metrics->>'gospel_read')::int,0),coalesce((metrics->>'gospel_share')::int,0)));
  submitted := coalesce((metrics->>'request')::int,0); returned := coalesce((metrics->>'request_feedback')::int,0);
  metrics := metrics || jsonb_build_object('feedback_percent',case when submitted=0 then 0 else floor(100.0*returned/submitted) end);
  for rule in select * from (values
    ('candle',1,'login',30),('candle',2,'login',60),('candle',3,'login',120),('cross',1,'cause',30),('cross',2,'cause',60),('cross',3,'cause',120),
    ('fraternity',1,'request',30),('fraternity',2,'request',60),('fraternity',3,'request',90),('gospel',1,'gospel',15),('gospel',2,'gospel',30),('gospel',3,'gospel',45),
    ('rosary-wood',1,'rosary_marian',10),('rosary-pearl',1,'rosary_mercy',10),('rosary-gold',1,'rosary_special',10),('chalice',1,'promise_read',30),('chalice',2,'promise_read',60),
    ('shield',1,'connection',5),('shield',2,'connection',10),('shield',3,'connection',15),('lavender',1,'notifications',1)
  ) as r(item_id,level,metric,threshold) loop
    if coalesce((metrics->>rule.metric)::int,0)>=rule.threshold and (rule.item_id<>'fraternity' or rule.level<>3 or (submitted>0 and returned*4>=submitted*3)) then
      insert into altar_achievements(user_id,item_id,level) values(u,rule.item_id,rule.level) on conflict do nothing;
    end if;
  end loop;
  for rule in select split_part(event_key,':',1) as saint,count(*)::int as days from altar_events where user_id=u and kind='novena_day' group by split_part(event_key,':',1) loop
    metrics := metrics || jsonb_build_object(rule.saint,rule.days);
    if rule.days=9 then insert into altar_achievements(user_id,item_id,level) values(u,rule.saint,1) on conflict do nothing; end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'level',level,'unlockedAt',unlocked_at,'notifiedAt',notified_at) order by unlocked_at,item_id,level),'[]'::jsonb) into awards from altar_achievements where user_id=u;
  return jsonb_build_object('metrics',metrics,'achievements',awards);
end;
$$;
