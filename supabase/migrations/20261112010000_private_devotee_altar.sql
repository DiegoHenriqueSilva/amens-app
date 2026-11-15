-- User-controlled altar visibility. Public altars remain the default.
alter table public.profiles
  add column if not exists altar_private boolean not null default false;

create or replace function public.save_altar_privacy(p_private boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles
  set altar_private = coalesce(p_private, false), updated_at = now()
  where id = u;
end;
$$;

-- Returns profile data only when the visitor may open the requested altar.
-- Friendship is checked in either direction to support existing friendship rows.
create or replace function public.public_altar_profile(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  viewer uuid := auth.uid();
  target public.profiles%rowtype;
  allowed boolean := false;
  xp integer := 0;
begin
  select * into target from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('found', false, 'canView', false);
  end if;

  allowed := not coalesce(target.altar_private, false)
    or viewer = p_user_id
    or (viewer is not null and exists (
      select 1
      from public.friendships f
      where (f.user_id = viewer and f.friend_id = p_user_id)
         or (f.user_id = p_user_id and f.friend_id = viewer)
    ));

  if not allowed then
    return jsonb_build_object('found', true, 'canView', false, 'isPrivate', true);
  end if;

  select coalesce((select total_xp from public.user_xp where user_id = p_user_id), 0)::integer into xp;

  return jsonb_build_object(
    'found', true,
    'canView', true,
    'isPrivate', coalesce(target.altar_private, false),
    'profile', jsonb_build_object(
      'id', target.id,
      'full_name', target.full_name,
      'display_name', target.display_name,
      'show_real_name', target.show_real_name,
      'city', target.city,
      'state', target.state,
      'parish', target.parish,
      'created_at', target.created_at,
      'avatar_url', target.avatar_url,
      'total_xp', xp
    )
  );
end;
$$;

revoke all on function public.save_altar_privacy(boolean) from public, anon;
grant execute on function public.save_altar_privacy(boolean) to authenticated;
revoke all on function public.public_altar_profile(uuid) from public;
grant execute on function public.public_altar_profile(uuid) to anon, authenticated;
