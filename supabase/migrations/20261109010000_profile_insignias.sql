-- Independent profile decorations; no payment amounts or altar awards are modified.
begin;
create table public.supporter_recognitions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  active boolean not null default true
);
create table public.profile_insignias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected text[] not null default '{}',
  show_supporter_card boolean not null default false
);
alter table public.supporter_recognitions enable row level security;
alter table public.profile_insignias enable row level security;
revoke all on public.supporter_recognitions, public.profile_insignias from anon, authenticated;
grant all on public.supporter_recognitions, public.profile_insignias to service_role;

create function public.insignia_eligible(p_user uuid) returns text[]
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(distinct badge),'{}'::text[]) from (
    select case item_id when 'cross' then 'intercessor' when 'candle' then 'constancy'
      when 'gospel' then 'gospel' end badge
    from altar_achievements where user_id=p_user and item_id in ('cross','candle','gospel') and level>=1
    union all select 'supporter' from supporter_recognitions where user_id=p_user and active
  ) earned;
$$;

create function public.my_insignias() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); eligible text[]; prefs profile_insignias;
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  eligible:=insignia_eligible(u);
  select * into prefs from profile_insignias where user_id=u;
  return jsonb_build_object('eligible',eligible,'selected',
    array(select b from unnest(coalesce(prefs.selected,'{}')) b where b=any(eligible)),
    'showSupporterCard',coalesce(prefs.show_supporter_card,false) and 'supporter'=any(eligible));
end; $$;

create function public.save_insignias(p_selected text[],p_show_card boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); eligible text[];
begin
  if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
  eligible:=insignia_eligible(u);
  if p_selected is null or cardinality(p_selected)>3
    or exists(select 1 from unnest(p_selected) b where b is null or not(b=any(eligible)))
    or cardinality(p_selected)<>(select count(distinct b) from unnest(p_selected) b)
    or (coalesce(p_show_card,false) and not('supporter'=any(eligible))) then
    raise exception 'Invalid insignia selection' using errcode='22023';
  end if;
  insert into profile_insignias(user_id,selected,show_supporter_card)
    values(u,p_selected,coalesce(p_show_card,false))
    on conflict(user_id) do update set selected=excluded.selected,show_supporter_card=excluded.show_supporter_card;
end; $$;

-- Only explicitly chosen public decorations are exposed, never private progress.
create function public.public_insignias(p_users uuid[]) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if cardinality(p_users)>200 then raise exception 'Too many users'; end if;
  return coalesce((select jsonb_object_agg(user_id, jsonb_build_object(
    'selected',array(select b from unnest(selected) b where b=any(insignia_eligible(user_id))),
    'showSupporterCard',show_supporter_card and 'supporter'=any(insignia_eligible(user_id))))
    from profile_insignias where user_id=any(p_users)),'{}'::jsonb);
end; $$;

revoke all on function public.insignia_eligible(uuid),public.my_insignias(),public.save_insignias(text[],boolean),public.public_insignias(uuid[]) from public,anon,authenticated;
grant execute on function public.my_insignias(),public.save_insignias(text[],boolean),public.public_insignias(uuid[]) to authenticated;

create table public.supporter_recognition_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  active boolean not null,
  recorded_at timestamptz not null default now()
);
alter table public.supporter_recognition_audit enable row level security;
revoke all on public.supporter_recognition_audit from anon,authenticated;
grant all on public.supporter_recognition_audit to service_role;

create function public.admin_supporter(p_user uuid,p_active boolean default null) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();
begin
  if u is null or not exists(select 1 from user_roles ur join roles r on r.id=ur.role_id
    where ur.user_id=u and r.name='admin') then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if p_active is not null then
    insert into supporter_recognitions(user_id,confirmed_by,active)
      values(p_user,u,p_active) on conflict(user_id)
      do update set confirmed_by=u,confirmed_at=now(),active=p_active;
    insert into supporter_recognition_audit(user_id,actor_id,active) values(p_user,u,p_active);
  end if;
  return coalesce((select active from supporter_recognitions where user_id=p_user),false);
end; $$;
revoke all on function public.admin_supporter(uuid,boolean) from public,anon;
grant execute on function public.admin_supporter(uuid,boolean) to authenticated;
commit;
