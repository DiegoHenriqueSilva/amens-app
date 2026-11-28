-- APP18: guarantee that authenticated users can submit only their own feedback.
-- This is intentionally idempotent because older environments may have a
-- different version of the user_feedback insert policy.

DROP POLICY IF EXISTS "user_feedback_insert_authenticated" ON public.user_feedback;

CREATE POLICY "user_feedback_insert_authenticated"
  ON public.user_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
