-- APP03: deliver general intentions through the same private cause contract.
-- General intentions consume the daily allowance, appear in history and expose no origin marker.

create table if not exists public.prayer_general_intentions (
  id uuid primary key,
  legacy_key text not null unique check (legacy_key ~ '^default-00[1-8]$'),
  title text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.prayer_general_intentions enable row level security;
revoke all on public.prayer_general_intentions from public,anon,authenticated;

insert into public.prayer_general_intentions(id,legacy_key,title,content) values
  ('00000000-0000-4000-9000-000000000001','default-001','Paz entre os povos','Pela paz e pela proteção das pessoas que vivem em regiões afetadas por guerras e conflitos.'),
  ('00000000-0000-4000-9000-000000000002','default-002','Famílias em luto','Pelo consolo e pelo amparo das famílias que atravessam o luto.'),
  ('00000000-0000-4000-9000-000000000003','default-003','Crianças vulneráveis','Pela proteção das crianças órfãs e das que vivem em situação de vulnerabilidade.'),
  ('00000000-0000-4000-9000-000000000004','default-004','Governantes e líderes','Por sabedoria, justiça e compromisso com o bem comum entre governantes e líderes.'),
  ('00000000-0000-4000-9000-000000000005','default-005','Pessoas enfermas','Pelo cuidado, pela fortaleza e pelo amparo das pessoas que enfrentam doenças graves.'),
  ('00000000-0000-4000-9000-000000000006','default-006','Pessoas desempregadas','Por oportunidades dignas para as pessoas que buscam trabalho.'),
  ('00000000-0000-4000-9000-000000000007','default-007','Harmonia nos lares','Pela união, pelo diálogo e pela harmonia nos lares e nas famílias.'),
  ('00000000-0000-4000-9000-000000000008','default-008','Cuidado com a criação','Pelo cuidado responsável com a natureza e com toda a criação.')
on conflict (id) do update set title=excluded.title,content=excluded.content,active=true;

create table if not exists public.prayer_general_intercessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  intention_id uuid not null references public.prayer_general_intentions(id),
  prayer_day date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  created_at timestamptz not null default now(),
  unique(user_id,intention_id,prayer_day)
);
alter table public.prayer_general_intercessions enable row level security;
revoke all on public.prayer_general_intercessions from public,anon,authenticated;
create index if not exists prayer_general_intercessions_user_day
  on public.prayer_general_intercessions(user_id,prayer_day,created_at desc,id desc);

create table if not exists public.prayer_general_reports (
  id uuid primary key default gen_random_uuid(),
  intention_id uuid not null references public.prayer_general_intentions(id),
  reporter_user_id uuid not null references auth.users(id),
  category text not null,
  custom_reason text,
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.prayer_general_reports enable row level security;
revoke all on public.prayer_general_reports from public,anon,authenticated;

create or replace function public.protect_general_intercession()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'prayer_intercession_immutable' using errcode='42501'; end;
$$;
drop trigger if exists protect_general_intercession on public.prayer_general_intercessions;
create trigger protect_general_intercession before update or delete on public.prayer_general_intercessions
  for each row execute function public.protect_general_intercession();

create or replace function public.get_user_prayer_cause(p_prayer_id uuid)
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

create or replace function public.get_prayer_cause(p_prayer_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(public.get_user_prayer_cause(p_prayer_id),(
    select jsonb_build_object('id',g.id,'title',g.title,'content',g.content,
      'status','active','feedback',null,'created_at',coalesce((select max(i.created_at)
        from public.prayer_general_intercessions i where i.user_id=auth.uid() and i.intention_id=g.id),g.created_at),
      'updated_at',g.created_at,'is_anonymous',true,'is_default',false,
      'display_name','Um fiel','avatar_url',null,'location',null,'is_owner',false,'is_friend',false,
      'has_interceded',exists(select 1 from public.prayer_general_intercessions i
        where i.user_id=auth.uid() and i.intention_id=g.id),
      'user_reaction',(select r.reaction_type from public.general_intention_reactions r
        where r.user_id=auth.uid() and r.intention_id=g.legacy_key and r.deleted_at is null limit 1))
    from public.prayer_general_intentions g where g.id=p_prayer_id and g.active
  ));
$$;

create or replace function public.prayer_daily_status()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid(); lev integer; allowance integer; used_count integer;
  local_day date:=(now() at time zone 'America/Sao_Paulo')::date;
  day_start timestamptz:=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  day_end timestamptz:=(date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo';
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  lev:=public.prayer_level_number(u); allowance:=public.prayer_daily_allowance(u);
  select (select count(*) from public.prayer_intercessions where user_id=u and created_at>=day_start and created_at<day_end)
    +(select count(*) from public.prayer_general_intercessions where user_id=u and prayer_day=local_day)
    into used_count;
  return jsonb_build_object('used',used_count,'limit',case when allowance<>2147483647 then allowance end,
    'remaining',case when allowance<>2147483647 then greatest(allowance-used_count,0) end,
    'level',lev,'nextBonusLevel',case when lev<20 then (floor(lev/5.0)::integer+1)*5 end,
    'isAdmin',allowance=2147483647,'resetsAt',day_end,'timeZone','America/Sao_Paulo');
end;
$$;

create or replace function public.receive_prayer_cause(p_operation_id uuid,p_prayer_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid:=auth.uid(); receipt public.prayer_operations; target uuid; cause jsonb; allowance jsonb;
  inserted boolean:=false; is_general boolean:=false; local_day date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_operation_id is null then raise exception 'prayer_operation_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,7412));
  select * into receipt from public.prayer_operations where user_id=u and operation_id=p_operation_id;
  if found then
    if receipt.kind<>'receive' or receipt.requested_id is distinct from p_prayer_id then
      raise exception 'prayer_operation_conflict' using errcode='22023';
    end if;
    return jsonb_build_object('cause',public.get_prayer_cause(receipt.prayer_id),
      'allowance',public.prayer_daily_status(),'replayed',true,'recorded',receipt.recorded,
      'unavailable',receipt.prayer_id is not null and public.get_prayer_cause(receipt.prayer_id) is null);
  end if;
  if p_prayer_id is not null then
    cause:=public.get_prayer_cause(p_prayer_id);
    if cause is null or (cause->>'is_owner')::boolean or cause->>'status'<>'active'
      or coalesce(cause->>'feedback','') in ('success','grace_received','not_this_time','god_knows') then
      raise exception 'prayer_unavailable' using errcode='42501';
    end if;
    target:=p_prayer_id;
    select exists(select 1 from public.prayer_general_intentions where id=target and active) into is_general;
  end if;
  if target is null
    or (is_general and not exists(select 1 from public.prayer_general_intercessions where user_id=u and intention_id=target and prayer_day=local_day))
    or (not is_general and not exists(select 1 from public.prayer_intercessions where user_id=u and prayer_request_id=target)) then
    allowance:=public.prayer_daily_status();
    if (allowance->>'remaining')::integer=0 then
      raise exception 'daily_prayer_limit_reached' using errcode='P0001',hint='daily_prayer_limit_reached';
    end if;
    if target is null then
      select ranked.id into target from (
        select candidates.id,(
          case when coalesce(candidates.prayer_count,0)=0 then 40 when candidates.prayer_count<=3 then 20 when candidates.prayer_count<=9 then 10 else 0 end
          +case when exists(select 1 from public.friendships f where (f.user_id=u and f.friend_id=candidates.user_id) or (f.friend_id=u and f.user_id=candidates.user_id)) then 30 else 0 end
          +case when candidates.created_at<now()-interval '30 days' then 25 else 0 end
          +case when candidates.created_at>now()-interval '3 days' then 15 else 0 end
          +random()*30-15) score
        from (select p.* from public.prayer_requests p where public.prayer_publicly_visible(p.id)
          and p.status='active' and p.user_id is distinct from u
          and coalesce(p.feedback,'') not in ('success','grace_received','not_this_time','god_knows')
          and not exists(select 1 from public.prayer_intercessions i where i.user_id=u and i.prayer_request_id=p.id)
          order by p.created_at desc,p.id limit 50) candidates order by score desc limit 5
      ) ranked order by random() limit 1;
      if target is null then
        select g.id into target from public.prayer_general_intentions g where g.active
          and not exists(select 1 from public.prayer_general_intercessions i
            where i.user_id=u and i.intention_id=g.id and i.prayer_day=local_day)
          order by random() limit 1;
        is_general:=target is not null;
      end if;
    end if;
    if target is null then raise exception 'prayer_unavailable' using errcode='P0001'; end if;
    if is_general then
      insert into public.prayer_general_intercessions(user_id,intention_id,prayer_day) values(u,target,local_day);
    else
      perform 1 from public.prayer_requests where id=target for update;
      insert into public.prayer_intercessions(user_id,prayer_request_id) values(u,target);
      update public.prayer_requests set prayer_count=coalesce(prayer_count,0)+1 where id=target;
    end if;
    inserted:=true;
  end if;
  insert into public.prayer_operations(user_id,operation_id,kind,requested_id,prayer_id,recorded)
    values(u,p_operation_id,'receive',p_prayer_id,target,inserted);
  return jsonb_build_object('cause',public.get_prayer_cause(target),'allowance',public.prayer_daily_status(),
    'recorded',inserted,'replayed',false);
end;
$$;

create or replace function public.get_my_prayer_history(p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'created_at',i.created_at,
    'prayer_request_id',i.cause_id,'cause',public.get_prayer_cause(i.cause_id)) order by i.created_at desc,i.id desc),'[]'::jsonb)
  into result from (
    select * from (
      select id,created_at,prayer_request_id cause_id from public.prayer_intercessions where user_id=u
      union all
      select id,created_at,intention_id cause_id from public.prayer_general_intercessions where user_id=u
    ) all_intercessions
    where p_before is null or (created_at,id)<(p_before,p_before_id)
    order by created_at desc,id desc limit 21
  ) i;
  return result;
end;
$$;

create or replace function public.set_prayer_reaction(p_prayer_id uuid,p_reaction text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); first_reaction boolean; author uuid; general_key text;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_reaction is not null and p_reaction not in ('love','pray','patience','strength','empathy') then
    raise exception 'prayer_reaction_invalid' using errcode='22023'; end if;
  select legacy_key into general_key from public.prayer_general_intentions where id=p_prayer_id and active;
  if general_key is not null then
    if p_reaction is null then
      update public.general_intention_reactions set deleted_at=now() where user_id=u and intention_id=general_key;
    else
      insert into public.general_intention_reactions(user_id,intention_id,reaction_type) values(u,general_key,p_reaction)
      on conflict(user_id,intention_id) do update set reaction_type=excluded.reaction_type,deleted_at=null;
    end if;
    return p_reaction;
  end if;
  perform 1 from public.prayer_requests where id=p_prayer_id for update;
  if not public.prayer_publicly_visible(p_prayer_id) or not exists(select 1 from public.prayer_requests
    where id=p_prayer_id and status='active' and coalesce(feedback,'') not in ('success','grace_received','not_this_time','god_knows')) then
    raise exception 'prayer_unavailable' using errcode='42501'; end if;
  select not exists(select 1 from public.prayer_reactions where prayer_request_id=p_prayer_id and reactor_user_id=u) into first_reaction;
  if p_reaction is null then
    update public.prayer_reactions set deleted_at=now(),deleted_by=u where prayer_request_id=p_prayer_id and reactor_user_id=u and deleted_at is null;
  else
    update public.prayer_reactions set reaction_type=p_reaction,deleted_at=null,deleted_by=null
      where prayer_request_id=p_prayer_id and reactor_user_id=u;
    if not found then insert into public.prayer_reactions(prayer_request_id,reactor_user_id,reaction_type) values(p_prayer_id,u,p_reaction); end if;
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

create or replace function public.invite_prayer_friends(p_prayer_id uuid,p_recipients uuid[],p_operation_id uuid,p_intention_id text default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); recipients uuid[]; receipt public.prayer_operations; author uuid; anonymous boolean; general boolean:=false;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_operation_id is null or p_prayer_id is null or p_intention_id is not null or coalesce(cardinality(p_recipients),0) not between 1 and 20 then
    raise exception 'prayer_invite_invalid' using errcode='22023'; end if;
  select array_agg(distinct id order by id) into recipients from unnest(p_recipients) id where id is not null;
  perform pg_advisory_xact_lock(hashtextextended(u::text,7412));
  select * into receipt from public.prayer_operations where user_id=u and operation_id=p_operation_id;
  if found then
    if receipt.kind<>'invite' or receipt.prayer_id is distinct from p_prayer_id or receipt.recipients is distinct from recipients then
      raise exception 'prayer_operation_conflict' using errcode='22023'; end if;
    return cardinality(receipt.recipients);
  end if;
  select exists(select 1 from public.prayer_general_intentions where id=p_prayer_id and active) into general;
  if general then anonymous:=true;
  else
    perform 1 from public.prayer_requests where id=p_prayer_id for update;
    if not public.prayer_publicly_visible(p_prayer_id) then raise exception 'prayer_unavailable' using errcode='42501'; end if;
    select user_id,is_anonymous into author,anonymous from public.prayer_requests where id=p_prayer_id;
  end if;
  if recipients is null or exists(select 1 from unnest(recipients) friend where friend=u
    or (not anonymous and friend=author) or not public.prayer_actor_allowed(friend)
    or not exists(select 1 from public.friendships f where (f.user_id=u and f.friend_id=friend) or (f.friend_id=u and f.user_id=friend))) then
    raise exception 'prayer_invite_invalid' using errcode='22023'; end if;
  insert into public.notifications(user_id,prayer_request_id,message,is_read,type)
    select friend,case when general then null else p_prayer_id end,
      'Um amigo convidou você a interceder por uma intenção no Améns.',false,
      case when general then 'prayer_cause:'||p_prayer_id::text end from unnest(recipients) friend;
  insert into public.prayer_operations(user_id,operation_id,kind,prayer_id,recipients)
    values(u,p_operation_id,'invite',p_prayer_id,recipients);
  return cardinality(recipients);
end;
$$;

create or replace function public.report_prayer_cause(p_prayer_id uuid,p_category text,p_custom_reason text default null,p_description text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); general boolean;
begin
  if not public.prayer_actor_allowed(u) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  if p_category not in ('inappropriate','fake','spam','off_topic','other')
    or (p_category='other' and nullif(trim(p_custom_reason),'') is null)
    or length(coalesce(p_custom_reason,''))>300 or length(coalesce(p_description,''))>500 then
    raise exception 'prayer_report_invalid' using errcode='22023'; end if;
  select exists(select 1 from public.prayer_general_intentions where id=p_prayer_id and active) into general;
  if general then
    insert into public.prayer_general_reports(intention_id,reporter_user_id,category,custom_reason,description)
      values(p_prayer_id,u,p_category,nullif(trim(p_custom_reason),''),nullif(trim(p_description),''));
  else
    if not public.prayer_publicly_visible(p_prayer_id) then raise exception 'prayer_unavailable' using errcode='42501'; end if;
    insert into public.prayer_reports(prayer_request_id,target_type,reporter_user_id,category,custom_reason,description,status)
      values(p_prayer_id,'prayer_request',u,p_category,nullif(trim(p_custom_reason),''),nullif(trim(p_description),''),'open');
  end if;
end;
$$;

create or replace function public.get_prayer_engagement_counts(prayer_ids uuid[])
returns table(prayer_request_id uuid,intercessor_count bigint,reactions jsonb)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.id,(select count(distinct i.user_id) from public.prayer_intercessions i where i.prayer_request_id=p.id),
    coalesce((select jsonb_object_agg(r.reaction_type,r.total) from
      (select reaction_type,count(distinct reactor_user_id) total from public.prayer_reactions where prayer_request_id=p.id and deleted_at is null group by reaction_type) r),'{}'::jsonb)
  from public.prayer_requests p where auth.uid() is not null and p.id=any(prayer_ids[1:100]) and public.prayer_publicly_visible(p.id)
  union all
  select g.id,(select count(distinct i.user_id) from public.prayer_general_intercessions i where i.intention_id=g.id),
    coalesce((select jsonb_object_agg(r.reaction_type,r.total) from
      (select reaction_type,count(distinct user_id) total from public.general_intention_reactions
        where intention_id=g.legacy_key and deleted_at is null group by reaction_type) r),'{}'::jsonb)
  from public.prayer_general_intentions g where auth.uid() is not null and g.id=any(prayer_ids[1:100]) and g.active;
$$;

revoke all on function public.get_user_prayer_cause(uuid),public.protect_general_intercession(),public.report_prayer_cause(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.report_prayer_cause(uuid,text,text,text) to authenticated;

create or replace function public.admin_general_prayer_reports()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.is_moderator_or_admin() then raise exception 'permission denied' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'category',r.category,
    'custom_reason',r.custom_reason,'description',r.description,'status',r.status,
    'created_at',r.created_at,'title',g.title,'content',g.content) order by r.created_at desc)
    from public.prayer_general_reports r join public.prayer_general_intentions g on g.id=r.intention_id),'[]'::jsonb);
end;
$$;
create or replace function public.admin_resolve_general_prayer_report(p_id uuid,p_action text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare intention uuid;
begin
  if not public.is_moderator_or_admin() then raise exception 'permission denied' using errcode='42501'; end if;
  if p_action not in ('dismiss','remove') then raise exception 'invalid action' using errcode='22023'; end if;
  select intention_id into intention from public.prayer_general_reports where id=p_id and status='open' for update;
  if intention is null then raise exception 'report unavailable' using errcode='22023'; end if;
  if p_action='remove' then update public.prayer_general_intentions set active=false where id=intention; end if;
  update public.prayer_general_reports set status=case when p_action='remove' then 'resolved' else 'dismissed' end where id=p_id;
end;
$$;
revoke all on function public.admin_general_prayer_reports(),public.admin_resolve_general_prayer_report(uuid,text) from public,anon;
grant execute on function public.admin_general_prayer_reports(),public.admin_resolve_general_prayer_report(uuid,text) to authenticated;
grant execute on function public.get_prayer_cause(uuid) to anon,authenticated;
grant execute on function public.receive_prayer_cause(uuid,uuid),public.get_my_prayer_history(timestamptz,uuid),
  public.set_prayer_reaction(uuid,text),public.invite_prayer_friends(uuid,uuid[],uuid,text),public.get_prayer_engagement_counts(uuid[]) to authenticated;

create or replace function public.prayer_ai_context(p_user uuid,p_cause_id text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; devotion text;
begin
  if not public.prayer_actor_allowed(p_user) then raise exception 'prayer_account_unavailable' using errcode='42501'; end if;
  select devotional_saint into devotion from public.profiles where id=p_user;
  if p_cause_id is null or p_cause_id !~ '^[0-9a-fA-F-]{36}$' then raise exception 'prayer_unavailable' using errcode='42501'; end if;
  select jsonb_build_object('content',g.content,'devotion',devotion,'version',g.created_at) into result
    from public.prayer_general_intentions g where g.id=p_cause_id::uuid and g.active;
  if result is null then
    select jsonb_build_object('content',p.content,'devotion',devotion,'version',p.updated_at) into result
      from public.prayer_requests p where p.id=p_cause_id::uuid and public.prayer_publicly_visible(p.id);
  end if;
  if result is null then raise exception 'prayer_unavailable' using errcode='42501'; end if;
  return result;
end;
$$;
