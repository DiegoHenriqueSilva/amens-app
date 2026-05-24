-- Migration 6: allow admins/moderators to update profiles (fix suspend/ban not working)

-- Profiles: admin/mod can update any profile (suspend, ban, restore, etc.)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

-- Prayer contributions: admin/mod can update (soft delete/restore)
DROP POLICY IF EXISTS "prayer_contributions_update_admin" ON public.prayer_contributions;
CREATE POLICY "prayer_contributions_update_admin"
  ON public.prayer_contributions FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin());
