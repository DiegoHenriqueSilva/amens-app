
-- Add feedback column to prayer_requests
ALTER TABLE public.prayer_requests ADD COLUMN IF NOT EXISTS feedback text DEFAULT NULL;

-- Track which users prayed for which prayer requests (intercessions)
CREATE TABLE public.prayer_intercessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

ALTER TABLE public.prayer_intercessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intercessions" ON public.prayer_intercessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert intercessions" ON public.prayer_intercessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prayer_request_id uuid REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow prayer request owners to update feedback
CREATE POLICY "Owners can update feedback" ON public.prayer_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
