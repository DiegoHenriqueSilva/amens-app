-- Return totals without exposing the identities of other intercessors.
CREATE OR REPLACE FUNCTION public.get_prayer_engagement_counts(prayer_ids uuid[])
RETURNS TABLE(prayer_request_id uuid, intercessor_count bigint, reactions jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id,
    (SELECT count(DISTINCT i.user_id) FROM public.prayer_intercessions i WHERE i.prayer_request_id = p.id),
    COALESCE((SELECT jsonb_object_agg(r.reaction_type, r.total)
      FROM (SELECT reaction_type, count(*) AS total FROM public.prayer_reactions
        WHERE prayer_request_id = p.id GROUP BY reaction_type) r), '{}'::jsonb)
  FROM public.prayer_requests p
  WHERE auth.uid() IS NOT NULL AND p.id = ANY(prayer_ids[1:100])
    AND p.status IS DISTINCT FROM 'banned';
$$;
REVOKE ALL ON FUNCTION public.get_prayer_engagement_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prayer_engagement_counts(uuid[]) TO authenticated;
