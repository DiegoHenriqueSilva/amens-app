-- APP03: server-owned receipt, safe projections, soft reactions and transactional invites.
-- Apply before the matching frontend. No business records are deleted by this migration.
create table if not exists public.prayer_operations (
  user_id uuid not null references auth.users(id),
  operation_id uuid not null,
  kind text not null check (kind in ('receive','invite')),
  requested_id uuid,
  prayer_id uuid,
  recipients uuid[],
  intention_id text,
  recorded boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);
alter table public.prayer_operations enable row level security;
revoke all on public.prayer_operations from public, anon, authenticated;

create or replace function public.prayer_actor_allowed(p_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select p_user is not null and exists(select 1 from public.profiles
    where id=p_user and deleted_at is null and (suspended_until is null or suspended_until<=now()));
$$;

create or replace function public.prayer_publicly_visible(p_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.prayer_requests p where p.id=p_id
    and p.deleted_at is null and p.status in ('active','completed')
    and not exists(select 1 from public.profiles a where a.id=p.user_id
      and (a.deleted_at is not null or a.suspended_until>now())));
$$;

-- Keep the APP03 eligibility gate effective before the parallel admin branch is merged.
-- Its broader moderation-field trigger can coexist with this narrowly scoped guard.
create or replace function public.protect_prayer_profile_restriction()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is not null and not public.is_moderator_or_admin()
    and (new.deleted_at is distinct from old.deleted_at or new.suspended_until is distinct from old.suspended_until) then
    raise exception 'prayer_profile_restriction_protected' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_prayer_profile_restriction on public.profiles;
create trigger protect_prayer_profile_restriction before update on public.profiles
  for each row execute function public.protect_prayer_profile_restriction();

create or replace function public.get_prayer_cause(p_prayer_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('id',p.id,'title',p.title,'content',p.content,
    'status',p.status,'feedback',p.feedback,'created_at',p.created_at,'updated_at',p.updated_at,
    'is_anonymous',p.is_anonymous,'is_default',false,
    'display_name',case when p.is_anonymous then 'Um fiel' else
      coalesce(nullif(a.display_name,''),case when a.show_real_name then nullif(split_part(a.full_name,' ',1),'') end,
        'Um fiel') end,
    'avatar_url',case when not p.is_anonymous then a.avatar_url end,
    'location',case when not p.is_anonymous then p.location end,
    'is_owner',coalesce(p.user_id=auth.uid(),false),
    'is_friend',not p.is_anonymous and exists(select 1 from public.friendships f
      where (f.user_id=auth.uid() and f.friend_id=p.user_id) or (f.friend_id=auth.uid() and f.user_id=p.user_id)),
    'has_interceded',exists(select 1 from public.prayer_intercessions i where i.user_id=auth.uid() and i.prayer_request_id=p.id),
    'user_reaction',(select r.reaction_type from public.prayer_reactions r
      where r.reactor_user_id=auth.uid() and r.prayer_request_id=p.id and r.deleted_at is null limit 1))
  from public.prayer_requests p left join public.profiles a on a.id=p.user_id
  where p.id=p_prayer_id and public.prayer_publicly_visible(p.id);
$$;

-- A restrictive policy also covers older, permissive deployment policies. Public reads
-- use get_prayer_cause: RLS cannot redact user_id/author_name column by column.
drop policy if exists prayer_requests_private_rows on public.prayer_requests;
create policy prayer_requests_private_rows on public.prayer_requests as restrictive for select
  using (user_id=auth.uid() or public.is_moderator_or_admin());

create or replace function public.prayer_daily_status()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid(); lev integer; allowance integer; used_count integer;
  day_start timestamptz:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  day_end timestamptz:=(date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo';
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  lev:=public.prayer_level_number(u); allowance:=public.prayer_daily_allowance(u);
  select count(*)::integer into used_count from public.prayer_intercessions
    where user_id=u and created_at>=day_start and created_at<day_end;
  return jsonb_build_object('used',used_count,'limit',case when allowance<>2147483647 then allowance end,
    'remaining',case when allowance<>2147483647 then greatest(allowance-used_count,0) end,
    'level',lev,'nextBonusLevel',case when lev<20 then (floor(lev/5.0)::integer+1)*5 end,
    'isAdmin',allowance=2147483647,'resetsAt',day_end,'timeZone','America/Sao_Paulo');
end;
$$;

create or replace function public.enforce_prayer_daily_limit()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare allowance integer; used_count integer;
  day_start timestamptz:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  day_end timestamptz:=(date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo';
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,7412));
  if not public.prayer_actor_allowed(new.user_id) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if not public.prayer_publicly_visible(new.prayer_request_id) or not exists(select 1 from public.prayer_requests p
    where p.id=new.prayer_request_id and p.user_id is distinct from new.user_id and p.status='active'
      and coalesce(p.feedback,'') not in ('success','grace_received','not_this_time','god_knows')) then
    raise exception 'prayer_unavailable' using errcode='42501';
  end if;
  -- Even privileged insert paths cannot backdate an opportunity.
  new.created_at:=now();
  allowance:=public.prayer_daily_allowance(new.user_id);
  select count(*)::integer into used_count from public.prayer_intercessions
    where user_id=new.user_id and created_at>=day_start and created_at<day_end;
  if allowance<>2147483647 and used_count>=allowance then
    raise exception 'daily_prayer_limit_reached' using errcode='P0001',hint='daily_prayer_limit_reached';
  end if;
  return new;
end;
$$;

create or replace function public.protect_prayer_intercession()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'prayer_intercession_immutable' using errcode='42501'; end;
$$;
drop trigger if exists protect_prayer_intercession on public.prayer_intercessions;
create trigger protect_prayer_intercession before update or delete on public.prayer_intercessions
  for each row execute function public.protect_prayer_intercession();
revoke insert,update,delete,truncate on public.prayer_intercessions from public,anon,authenticated;
drop policy if exists prayer_intercessions_command_only on public.prayer_intercessions;
create policy prayer_intercessions_command_only on public.prayer_intercessions as restrictive
  for insert to anon,authenticated with check(false);

create or replace function public.receive_prayer_cause(p_operation_id uuid,p_prayer_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); receipt public.prayer_operations; target uuid; cause jsonb; allowance jsonb; inserted boolean:=false;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_operation_id is null then raise exception 'prayer_operation_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,7412));
  select * into receipt from public.prayer_operations where user_id=u and operation_id=p_operation_id;
  if found then
    if receipt.kind<>'receive' or receipt.requested_id is distinct from p_prayer_id then
      raise exception 'prayer_operation_conflict' using errcode='22023';
    end if;
    return jsonb_build_object('cause',public.get_prayer_cause(receipt.prayer_id),'allowance',public.prayer_daily_status(),'replayed',true,'recorded',receipt.recorded,
      'unavailable',receipt.prayer_id is not null and not public.prayer_publicly_visible(receipt.prayer_id));
  end if;
  -- A previously assumed shared cause can be reopened even after exhausting today's allowance.
  if p_prayer_id is not null then
    cause:=public.get_prayer_cause(p_prayer_id);
    if cause is null or (cause->>'is_owner')::boolean or cause->>'status'<>'active'
      or coalesce(cause->>'feedback','') in ('success','grace_received','not_this_time','god_knows') then
      raise exception 'prayer_unavailable' using errcode='42501';
    end if;
    target:=p_prayer_id;
  end if;
  if target is null or not exists(select 1 from public.prayer_intercessions where user_id=u and prayer_request_id=target) then
    allowance:=public.prayer_daily_status();
    if (allowance->>'remaining')::integer=0 then
      raise exception 'daily_prayer_limit_reached' using errcode='P0001',hint='daily_prayer_limit_reached';
    end if;
    if target is null then
      -- Keep the existing weights, candidate bound (50) and random top-five pool.
      select ranked.id into target from (
        select candidates.id, (
          case when coalesce(candidates.prayer_count,0)=0 then 40 when candidates.prayer_count<=3 then 20 when candidates.prayer_count<=9 then 10 else 0 end
          +case when exists(select 1 from public.friendships f where (f.user_id=u and f.friend_id=candidates.user_id) or (f.friend_id=u and f.user_id=candidates.user_id)) then 30 else 0 end
          +case when candidates.created_at<now()-interval '30 days' then 25 else 0 end
          +case when candidates.created_at>now()-interval '3 days' then 15 else 0 end
          +random()*30-15) as score
        from (select p.* from public.prayer_requests p where public.prayer_publicly_visible(p.id)
          and p.status='active' and p.user_id is distinct from u
          and coalesce(p.feedback,'') not in ('success','grace_received','not_this_time','god_knows')
          and not exists(select 1 from public.prayer_intercessions i where i.user_id=u and i.prayer_request_id=p.id)
          order by p.created_at desc,p.id limit 50) candidates order by score desc limit 5
      ) ranked order by random() limit 1;
    end if;
    if target is not null then
      -- Lock the chosen row against concurrent closure/moderation; the trigger rechecks it.
      perform 1 from public.prayer_requests where id=target for update;
      insert into public.prayer_intercessions(user_id,prayer_request_id) values(u,target);
      update public.prayer_requests set prayer_count=coalesce(prayer_count,0)+1 where id=target;
      inserted:=true;
    end if;
  end if;
  insert into public.prayer_operations(user_id,operation_id,kind,requested_id,prayer_id,recorded)
    values(u,p_operation_id,'receive',p_prayer_id,target,inserted);
  return jsonb_build_object('cause',public.get_prayer_cause(target),'allowance',public.prayer_daily_status(),'recorded',inserted,'replayed',false);
end;
$$;

create or replace function public.get_my_prayer_history(p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'created_at',i.created_at,
    'prayer_request_id',i.prayer_request_id,'cause',public.get_prayer_cause(i.prayer_request_id)) order by i.created_at desc,i.id desc),'[]'::jsonb)
    into result from (select * from public.prayer_intercessions where user_id=u
      and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit 21) i;
  return result;
end;
$$;

create or replace function public.set_prayer_reaction(p_prayer_id uuid,p_reaction text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); first_reaction boolean; author uuid;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_reaction is not null and p_reaction not in ('love','pray','patience','strength','empathy') then
    raise exception 'prayer_reaction_invalid' using errcode='22023'; end if;
  perform 1 from public.prayer_requests where id=p_prayer_id for update;
  if not public.prayer_publicly_visible(p_prayer_id) or not exists(select 1 from public.prayer_requests
    where id=p_prayer_id and status='active' and coalesce(feedback,'') not in ('success','grace_received','not_this_time','god_knows')) then
    raise exception 'prayer_unavailable' using errcode='42501'; end if;
  select not exists(select 1 from public.prayer_reactions where prayer_request_id=p_prayer_id and reactor_user_id=u) into first_reaction;
  if p_reaction is null then
    update public.prayer_reactions set deleted_at=now(),deleted_by=u where prayer_request_id=p_prayer_id and reactor_user_id=u and deleted_at is null;
  else
    -- The row lock above also serializes legacy deployments lacking a unique index.
    update public.prayer_reactions set reaction_type=p_reaction,deleted_at=null,deleted_by=null
      where prayer_request_id=p_prayer_id and reactor_user_id=u;
    if not found then
      insert into public.prayer_reactions(prayer_request_id,reactor_user_id,reaction_type) values(p_prayer_id,u,p_reaction);
    end if;
    if first_reaction then
      select user_id into author from public.prayer_requests where id=p_prayer_id;
      if author is not null and author<>u and public.prayer_actor_allowed(author) then
        insert into public.notifications(user_id,prayer_request_id,message,is_read)
          values(author,p_prayer_id,'Alguém enviou solidariedade ao seu pedido de oração.',false);
      end if;
    end if;
  end if;
  return p_reaction;
end;
$$;
revoke insert,update,delete on public.prayer_reactions from public,anon,authenticated;
drop policy if exists prayer_reactions_command_insert on public.prayer_reactions;
create policy prayer_reactions_command_insert on public.prayer_reactions as restrictive
  for insert to anon,authenticated with check(false);
drop policy if exists prayer_reactions_command_update on public.prayer_reactions;
create policy prayer_reactions_command_update on public.prayer_reactions as restrictive
  for update to anon,authenticated using(false) with check(false);
drop policy if exists prayer_reactions_command_delete on public.prayer_reactions;
create policy prayer_reactions_command_delete on public.prayer_reactions as restrictive
  for delete to anon,authenticated using(false);

create or replace function public.invite_prayer_friends(p_prayer_id uuid,p_recipients uuid[],p_operation_id uuid,p_intention_id text default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); recipients uuid[]; receipt public.prayer_operations; author uuid; anonymous boolean;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_operation_id is null or coalesce(cardinality(p_recipients),0) not between 1 and 20 then
    raise exception 'prayer_invite_invalid' using errcode='22023'; end if;
  select array_agg(distinct id order by id) into recipients from unnest(p_recipients) id where id is not null;
  perform pg_advisory_xact_lock(hashtextextended(u::text,7412));
  select * into receipt from public.prayer_operations where user_id=u and operation_id=p_operation_id;
  if found then
    if receipt.kind<>'invite' or receipt.prayer_id is distinct from p_prayer_id
      or receipt.intention_id is distinct from p_intention_id or receipt.recipients is distinct from recipients then
      raise exception 'prayer_operation_conflict' using errcode='22023'; end if;
    return cardinality(receipt.recipients);
  end if;
  if p_intention_id is not null then
    if p_prayer_id is not null or p_intention_id !~ '^default-00[1-8]$' then raise exception 'prayer_invite_invalid' using errcode='22023'; end if;
    anonymous:=true;
  else
    perform 1 from public.prayer_requests where id=p_prayer_id for update;
    if not public.prayer_publicly_visible(p_prayer_id) then raise exception 'prayer_unavailable' using errcode='42501'; end if;
    select user_id,is_anonymous into author,anonymous from public.prayer_requests where id=p_prayer_id;
  end if;
  -- Anonymous authors may receive a generic invitation like any friend. Skipping them or
  -- changing the returned count would reveal their identity through recipient probing.
  if recipients is null or exists(select 1 from unnest(recipients) friend where friend=u
    or (not anonymous and friend=author) or not public.prayer_actor_allowed(friend)
    or not exists(select 1 from public.friendships f where (f.user_id=u and f.friend_id=friend) or (f.friend_id=u and f.user_id=friend))) then
    raise exception 'prayer_invite_invalid' using errcode='22023'; end if;
  insert into public.notifications(user_id,prayer_request_id,message,is_read,type)
    select friend,p_prayer_id,'Um amigo convidou você a interceder por uma intenção no Améns.',false,
      case when p_intention_id is not null then 'prayer_intention:'||p_intention_id end from unnest(recipients) friend;
  insert into public.prayer_operations(user_id,operation_id,kind,prayer_id,recipients,intention_id) values(u,p_operation_id,'invite',p_prayer_id,recipients,p_intention_id);
  return cardinality(recipients);
end;
$$;

create or replace function public.get_recent_prayer_activity()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',case when p.is_anonymous then 'Intercessor'
    else coalesce(nullif(a.display_name,''),case when a.show_real_name then split_part(a.full_name,' ',1) end,'Intercessor') end,
    'timestamp',p.created_at) order by p.created_at desc,p.id),'[]'::jsonb)
    from (select * from public.prayer_requests where public.prayer_publicly_visible(id) order by created_at desc,id limit 10) p
    left join public.profiles a on a.id=p.user_id;
$$;

create or replace function public.get_prayer_engagement_counts(prayer_ids uuid[])
returns table(prayer_request_id uuid,intercessor_count bigint,reactions jsonb)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.id,(select count(distinct i.user_id) from public.prayer_intercessions i where i.prayer_request_id=p.id),
    coalesce((select jsonb_object_agg(r.reaction_type,r.total) from
      (select reaction_type,count(distinct reactor_user_id) total from public.prayer_reactions where prayer_request_id=p.id and deleted_at is null group by reaction_type) r),'{}'::jsonb)
  from public.prayer_requests p where auth.uid() is not null and p.id=any(prayer_ids[1:100]) and public.prayer_publicly_visible(p.id);
$$;

create or replace function public.get_prayer_intercessors(p_prayer_id uuid)
returns table(intercessor_id uuid,display_name text,avatar_url text,city text,state text,interceded_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select i.user_id,
    case when coalesce(a.show_real_name,false) then coalesce(nullif(trim(a.full_name),''),nullif(trim(a.display_name),''),'Membro da Fé')
      else coalesce(nullif(trim(a.display_name),''),'Membro da Fé') end,
    a.avatar_url,a.city,a.state,i.created_at
  from public.prayer_intercessions i join public.prayer_requests p on p.id=i.prayer_request_id
    join public.profiles a on a.id=i.user_id
  where i.prayer_request_id=p_prayer_id and p.user_id=auth.uid()
    and public.prayer_actor_allowed(auth.uid()) and public.prayer_publicly_visible(p.id)
    and a.deleted_at is null and (a.suspended_until is null or a.suspended_until<=now())
  order by i.created_at desc,i.id desc;
$$;
revoke all on function public.get_prayer_engagement_counts(uuid[]),public.get_prayer_intercessors(uuid) from public,anon;
grant execute on function public.get_prayer_engagement_counts(uuid[]),public.get_prayer_intercessors(uuid) to authenticated;

revoke all on function public.prayer_actor_allowed(uuid),public.prayer_publicly_visible(uuid),public.protect_prayer_intercession(),public.protect_prayer_profile_restriction(),
  public.get_prayer_cause(uuid),public.receive_prayer_cause(uuid,uuid),public.get_my_prayer_history(timestamptz,uuid),
  public.set_prayer_reaction(uuid,text),public.invite_prayer_friends(uuid,uuid[],uuid,text),public.get_recent_prayer_activity() from public,anon,authenticated;
grant execute on function public.get_prayer_cause(uuid),public.get_recent_prayer_activity() to anon,authenticated;
grant execute on function public.receive_prayer_cause(uuid,uuid),public.get_my_prayer_history(timestamptz,uuid),
  public.set_prayer_reaction(uuid,text),public.invite_prayer_friends(uuid,uuid[],uuid,text) to authenticated;
-- Counters are maintained by receive_prayer_cause, never by a separate client call.
revoke execute on function public.increment_prayer_count(uuid) from public,anon,authenticated;
create index if not exists prayer_intercessions_user_day on public.prayer_intercessions(user_id,created_at desc,id desc);

create table if not exists public.general_intention_reactions (
  user_id uuid not null references auth.users(id),
  intention_id text not null check (intention_id ~ '^default-00[1-8]$'),
  reaction_type text not null check (reaction_type in ('love','pray','patience','strength','empathy')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key(user_id,intention_id)
);
alter table public.general_intention_reactions enable row level security;
revoke all on public.general_intention_reactions from public,anon,authenticated;

create or replace function public.general_intention_reaction(p_intention_id text,p_reaction text default null,p_write boolean default false)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); result text;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_intention_id !~ '^default-00[1-8]$' or p_intention_id is null
    or (p_reaction is not null and p_reaction not in ('love','pray','patience','strength','empathy')) then
    raise exception 'prayer_reaction_invalid' using errcode='22023'; end if;
  if p_write then
    if p_reaction is null then
      update public.general_intention_reactions set deleted_at=now() where user_id=u and intention_id=p_intention_id;
    else
      insert into public.general_intention_reactions(user_id,intention_id,reaction_type) values(u,p_intention_id,p_reaction)
      on conflict(user_id,intention_id) do update set reaction_type=excluded.reaction_type,deleted_at=null;
    end if;
  end if;
  select reaction_type into result from public.general_intention_reactions where user_id=u and intention_id=p_intention_id and deleted_at is null;
  return result;
end;
$$;
revoke all on function public.general_intention_reaction(text,text,boolean) from public,anon;
grant execute on function public.general_intention_reaction(text,text,boolean) to authenticated;
