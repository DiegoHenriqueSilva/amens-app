-- Prayer request privacy and local moderation support.

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

ALTER TABLE public.prayer_requests
  DROP CONSTRAINT IF EXISTS prayer_requests_status_check;

ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_status_check
  CHECK (status IN ('active', 'completed', 'pending_review', 'policy_violation', 'banned'));

CREATE TABLE IF NOT EXISTS public.prayer_moderation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_title text,
  original_content text NOT NULL,
  normalized_content text NOT NULL,
  detected_policies jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_score integer NOT NULL DEFAULT 0,
  decision text NOT NULL DEFAULT 'approved',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_moderation_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public moderation review access" ON public.prayer_moderation_reviews;
CREATE POLICY "No public moderation review access"
  ON public.prayer_moderation_reviews
  FOR SELECT
  TO authenticated
  USING (false);

CREATE TRIGGER update_prayer_moderation_reviews_updated_at
  BEFORE UPDATE ON public.prayer_moderation_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_prayer_policy_violation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'policy_violation'
    AND (OLD.status IS DISTINCT FROM NEW.status)
    AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, prayer_request_id, message, type)
    VALUES (
      NEW.user_id,
      NEW.id,
      'Seu pedido foi revisado e não poderá continuar público porque não está de acordo com as políticas do Améns.',
      'prayer_policy_violation'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_prayer_policy_violation_trigger ON public.prayer_requests;
CREATE TRIGGER notify_prayer_policy_violation_trigger
  AFTER UPDATE OF status ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_prayer_policy_violation();
