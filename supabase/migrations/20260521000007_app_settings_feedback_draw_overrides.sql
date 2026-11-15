-- Migration 7: app_settings, user_feedback, user_draw_overrides, triggers

-- 1. app_settings: global configurable values
CREATE TABLE public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.app_settings (key, value) VALUES
  ('auto_escalate_threshold', '3'),
  ('xp_global_multiplier',    '1.0'),
  ('draw_daily_limit',        '3');

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_admin"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin());

CREATE POLICY "app_settings_update_admin"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. user_draw_overrides: per-user daily draw limit override
CREATE TABLE public.user_draw_overrides (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit INT NOT NULL DEFAULT 3 CHECK (daily_limit >= 0),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.user_draw_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "draw_overrides_select_own_or_admin"
  ON public.user_draw_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "draw_overrides_insert_admin"
  ON public.user_draw_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "draw_overrides_update_admin"
  ON public.user_draw_overrides FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "draw_overrides_delete_admin"
  ON public.user_draw_overrides FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. user_feedback: messages/suggestions from users to Amens team
CREATE TABLE public.user_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category   TEXT NOT NULL CHECK (category IN ('sugestao', 'bug', 'elogio', 'outro')),
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status     TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_feedback_insert_authenticated"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_feedback_select_admin"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "user_feedback_update_admin"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Trigger: clean up notifications when a prayer_request is soft-deleted
CREATE OR REPLACE FUNCTION public.cleanup_on_prayer_soft_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    DELETE FROM public.notifications WHERE prayer_request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prayer_soft_delete_cascade ON public.prayer_requests;
CREATE TRIGGER prayer_soft_delete_cascade
  AFTER UPDATE ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_on_prayer_soft_delete();

-- 5. Update auto_escalate_prayer_reports to read threshold from app_settings
CREATE OR REPLACE FUNCTION public.auto_escalate_prayer_reports()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count     INT;
  v_threshold INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.prayer_reports
  WHERE prayer_request_id = NEW.prayer_request_id
    AND status = 'open'
    AND deleted_at IS NULL;

  SELECT COALESCE(value::int, 3) INTO v_threshold
  FROM public.app_settings
  WHERE key = 'auto_escalate_threshold';

  IF v_count >= v_threshold THEN
    UPDATE public.prayer_requests
    SET status = 'pending_review'
    WHERE id = NEW.prayer_request_id
      AND status NOT IN ('pending_review', 'rejected');
  END IF;

  RETURN NEW;
END;
$$;
