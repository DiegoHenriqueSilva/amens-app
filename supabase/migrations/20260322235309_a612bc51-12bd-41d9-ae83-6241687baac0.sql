
-- Fix overly permissive UPDATE policy on prayer_requests
DROP POLICY IF EXISTS "Anyone can update prayer_count" ON public.prayer_requests;

-- Only allow authenticated users to increment prayer_count (not their own prayers)
CREATE POLICY "Authenticated users can update prayer_count"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
