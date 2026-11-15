-- Prayer authors may see who interceded for their own requests.
-- The ownership check stays inside this security-definer function so identities
-- are never exposed by a client-side filter or by the existing public counters.
create or replace function public.get_prayer_intercessors(p_prayer_id uuid)
returns table (
  intercessor_id uuid,
  display_name text,
  avatar_url text,
  city text,
  state text,
  interceded_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.user_id as intercessor_id,
    case
      when coalesce(p.show_real_name, false) then
        coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.display_name), ''), 'Membro da Fé')
      else
        coalesce(nullif(trim(p.display_name), ''), 'Membro da Fé')
    end as display_name,
    p.avatar_url,
    p.city,
    p.state,
    i.created_at as interceded_at
  from public.prayer_intercessions i
  join public.prayer_requests request on request.id = i.prayer_request_id
  left join public.profiles p on p.id = i.user_id
  where i.prayer_request_id = p_prayer_id
    and request.user_id = auth.uid()
  order by i.created_at desc;
$$;

revoke all on function public.get_prayer_intercessors(uuid) from public, anon;
grant execute on function public.get_prayer_intercessors(uuid) to authenticated;
