-- Allow admins and moderators to update any prayer_report (status changes, resolution, etc.)

-- Also ensure RLS is enabled (safe to call multiple times)
ALTER TABLE public.prayer_reports ENABLE ROW LEVEL SECURITY;

-- Allow moderators and admins to update any report
DROP POLICY IF EXISTS "prayer_reports_update_moderator" ON public.prayer_reports;
CREATE POLICY "prayer_reports_update_moderator"
  ON public.prayer_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

-- Allow moderators and admins to select any report (not just their own)
DROP POLICY IF EXISTS "prayer_reports_select_moderator" ON public.prayer_reports;
CREATE POLICY "prayer_reports_select_moderator"
  ON public.prayer_reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_user_id = auth.uid()
    OR public.is_moderator_or_admin()
  );

-- Allow moderators to delete (soft-delete) any report
DROP POLICY IF EXISTS "prayer_reports_delete_moderator" ON public.prayer_reports;
CREATE POLICY "prayer_reports_delete_moderator"
  ON public.prayer_reports
  FOR DELETE
  TO authenticated
  USING (public.is_moderator_or_admin());
