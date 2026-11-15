BEGIN;
DO $$
DECLARE
  sample public.prayer_requests%ROWTYPE;
  totals record;
  expected bigint;
BEGIN
  IF has_function_privilege('anon', 'public.get_prayer_engagement_counts(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous callers must not have access';
  END IF;
  SELECT * INTO sample FROM public.prayer_requests
    WHERE status IS DISTINCT FROM 'banned' AND user_id IS NOT NULL LIMIT 1;
  IF sample.id IS NULL THEN RAISE EXCEPTION 'No prayer available for verification'; END IF;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  IF EXISTS (SELECT 1 FROM public.get_prayer_engagement_counts(ARRAY[sample.id])) THEN
    RAISE EXCEPTION 'Unauthenticated invocation exposed counts';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', sample.user_id::text, true);
  SELECT * INTO totals FROM public.get_prayer_engagement_counts(ARRAY[sample.id]);
  SELECT count(DISTINCT user_id) INTO expected FROM public.prayer_intercessions WHERE prayer_request_id = sample.id;
  IF totals.intercessor_count IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Intercessor total mismatch'; END IF;
  SELECT count(*) INTO expected FROM public.prayer_reactions WHERE prayer_request_id = sample.id;
  IF (SELECT COALESCE(sum(value::bigint), 0) FROM jsonb_each_text(totals.reactions)) <> expected THEN
    RAISE EXCEPTION 'Reaction total mismatch';
  END IF;
END;
$$;
ROLLBACK;
