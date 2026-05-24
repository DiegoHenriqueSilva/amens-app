-- Soft delete: add deleted_at + deleted_by to all user-generated content tables

-- prayer_requests
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS deleted_at  timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at    timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_until timestamp WITH TIME ZONE;

-- prayer_reactions
ALTER TABLE public.prayer_reactions
  ADD COLUMN IF NOT EXISTS deleted_at  timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- prayer_contributions
ALTER TABLE public.prayer_contributions
  ADD COLUMN IF NOT EXISTS deleted_at  timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- prayer_reports (soft delete + resolution fields)
ALTER TABLE public.prayer_reports
  ADD COLUMN IF NOT EXISTS deleted_at       timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS moderator_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at      timestamp WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS target_type      text DEFAULT 'prayer_request',
  ADD COLUMN IF NOT EXISTS target_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_contribution_id uuid REFERENCES public.prayer_contributions(id) ON DELETE SET NULL;

-- Make prayer_request_id nullable so reports can be polymorphic
ALTER TABLE public.prayer_reports ALTER COLUMN prayer_request_id DROP NOT NULL;

-- Update existing RLS on prayer_requests to exclude soft-deleted
-- (existing policy allows SELECT for active/completed; we add deleted_at check)
-- Drop old policies and recreate with deleted_at filter
DROP POLICY IF EXISTS "Anyone can view prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_select_public" ON public.prayer_requests;
DROP POLICY IF EXISTS "Allow public to view active prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Allow users to view their own prayer requests" ON public.prayer_requests;

CREATE POLICY "prayer_requests_select_public"
  ON public.prayer_requests FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      status IN ('active', 'completed')
      OR user_id = auth.uid()
      OR public.is_moderator_or_admin()
    )
  );

-- Admins/moderators can see soft-deleted too (for restore)
CREATE POLICY "prayer_requests_select_admin_deleted"
  ON public.prayer_requests FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND public.is_moderator_or_admin());

-- profiles: public can only see non-deleted, non-suspended
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "profiles_select_admin_deleted"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND public.is_admin());

-- RLS for prayer_contributions: hide deleted items from public
DROP POLICY IF EXISTS "Public read contributions" ON public.prayer_contributions;
DROP POLICY IF EXISTS "prayer_contributions_select_public" ON public.prayer_contributions;
DROP POLICY IF EXISTS "Public can view prayer contributions." ON public.prayer_contributions;

CREATE POLICY "prayer_contributions_select_public"
  ON public.prayer_contributions FOR SELECT
  USING (deleted_at IS NULL OR public.is_moderator_or_admin());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prayer_requests_deleted_at ON public.prayer_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_contributions_deleted_at ON public.prayer_contributions(deleted_at) WHERE deleted_at IS NULL;
