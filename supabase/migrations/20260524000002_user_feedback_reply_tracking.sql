-- Add reply tracking columns to user_feedback

ALTER TABLE public.user_feedback
  ADD COLUMN IF NOT EXISTS reply_text  TEXT,
  ADD COLUMN IF NOT EXISTS replied_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replied_at  TIMESTAMPTZ;

-- Extend status check to include 'replied'
ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_status_check;
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_status_check
  CHECK (status IN ('unread', 'read', 'replied', 'archived'));

-- Allow moderators and admins to select feedback (not just admins)
DROP POLICY IF EXISTS "user_feedback_select_admin" ON public.user_feedback;
CREATE POLICY "user_feedback_select_mod"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin());

-- Allow moderators and admins to update feedback (status, reply fields)
DROP POLICY IF EXISTS "user_feedback_update_admin" ON public.user_feedback;
CREATE POLICY "user_feedback_update_mod"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());
