
-- Drop the overly permissive old update policy
DROP POLICY IF EXISTS "Authenticated users can update prayer_count" ON public.prayer_requests;

-- Allow authenticated users to update prayer_count on any prayer
CREATE POLICY "Authenticated users can update prayer_count" ON public.prayer_requests
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow system/edge functions to insert notifications (using service role)
-- For now allow authenticated users to insert notifications for others (needed for feedback flow)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
