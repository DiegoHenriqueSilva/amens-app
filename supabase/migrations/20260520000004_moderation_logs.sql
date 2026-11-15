-- Moderation audit log + auto-escalation trigger for prayer_reports

CREATE TABLE public.moderation_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type  text NOT NULL, -- 'prayer_request' | 'user' | 'report' | 'church' | 'contribution'
  target_id    uuid NOT NULL,
  action       text NOT NULL, -- 'soft_delete' | 'restore' | 'suspend' | 'unsuspend' | 'ban' | 'approve' | 'reject' | 'resolve_report' | 'dismiss_report' | 'role_assign' | 'role_revoke'
  reason       text,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamp WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_logs_select_mod"
  ON public.moderation_logs FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin());

CREATE POLICY "moderation_logs_insert_mod"
  ON public.moderation_logs INSERT
  TO authenticated
  WITH CHECK (public.is_moderator_or_admin() AND moderator_id = auth.uid());

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_moderation_logs_target ON public.moderation_logs(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator ON public.moderation_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);

-- Auto-escalation: if a prayer_request reaches 3 open reports, set status = 'pending_review'
CREATE OR REPLACE FUNCTION public.auto_escalate_prayer_reports()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.prayer_reports
  WHERE prayer_request_id = NEW.prayer_request_id
    AND status = 'open'
    AND deleted_at IS NULL;

  IF v_count >= 3 THEN
    UPDATE public.prayer_requests
    SET status = 'pending_review', updated_at = now()
    WHERE id = NEW.prayer_request_id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_escalate_prayer_reports
  AFTER INSERT ON public.prayer_reports
  FOR EACH ROW
  WHEN (NEW.prayer_request_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_escalate_prayer_reports();

-- Notify author when their prayer is moderated (soft_delete or status change)
CREATE OR REPLACE FUNCTION public.notify_moderation_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only notify when deleted_at is set (soft delete) on a prayer_request
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, prayer_request_id, message, type)
    VALUES (
      NEW.user_id,
      NEW.id,
      'Seu pedido de oração foi removido por um moderador.',
      'prayer_moderated'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_moderation_action
  AFTER UPDATE ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_moderation_action();
