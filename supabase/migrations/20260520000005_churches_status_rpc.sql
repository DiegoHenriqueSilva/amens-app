-- Migration 5: churches status workflow, import columns, auth RPC, log policy fix

-- 1. Add status column to churches
ALTER TABLE public.churches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.churches
  DROP CONSTRAINT IF EXISTS churches_status_check;

ALTER TABLE public.churches
  ADD CONSTRAINT churches_status_check CHECK (status IN ('active', 'pending_review', 'rejected'));

-- 2. Add address column for import
ALTER TABLE public.churches
  ADD COLUMN IF NOT EXISTS address text;

-- 3. Update churches RLS — public sees only active+non-deleted; mod/admin see all
DROP POLICY IF EXISTS "churches_select_public" ON public.churches;
CREATE POLICY "churches_select_public"
  ON public.churches FOR SELECT
  USING (deleted_at IS NULL AND status = 'active');

DROP POLICY IF EXISTS "churches_select_admin_deleted" ON public.churches;
CREATE POLICY "churches_select_admin_all"
  ON public.churches FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin());

-- Allow any authenticated user to submit a church (always pending_review)
DROP POLICY IF EXISTS "churches_insert_user" ON public.churches;
CREATE POLICY "churches_insert_user"
  ON public.churches FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending_review');

-- Allow mod/admin to update churches (approve, reject, edit)
DROP POLICY IF EXISTS "churches_update_admin" ON public.churches;
CREATE POLICY "churches_update_admin"
  ON public.churches FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin());

-- 4. Fix moderation_logs insert policy (was missing FOR keyword — harmless to recreate)
DROP POLICY IF EXISTS "moderation_logs_insert_mod" ON public.moderation_logs;
CREATE POLICY "moderation_logs_insert_mod"
  ON public.moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_moderator_or_admin() AND moderator_id = auth.uid());

-- 5. RPC: get auth.users data (email + last_sign_in_at) — admin only
CREATE OR REPLACE FUNCTION public.get_users_admin()
RETURNS TABLE(id uuid, email text, last_sign_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.last_sign_in_at
    FROM auth.users u;
END;
$$;
