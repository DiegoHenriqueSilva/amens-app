-- Administrators may inspect the supporter decoration without a donation record.
-- This grants eligibility only; the admin still chooses whether to display it.
create or replace function public.insignia_eligible(p_user uuid) returns text[]
language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(array_agg(distinct badge),'{}'::text[]) from (
    select case item_id when 'cross' then 'intercessor' when 'candle' then 'constancy'
      when 'gospel' then 'gospel' end badge
    from altar_achievements
    where user_id=p_user and item_id in ('cross','candle','gospel') and level>=1
    union all
    select 'supporter'
    from supporter_recognitions
    where user_id=p_user and active
    union all
    select 'supporter'
    where exists (
      select 1 from user_roles ur
      join roles r on r.id=ur.role_id
      where ur.user_id=p_user and r.name='admin'
    )
  ) earned;
$$;
