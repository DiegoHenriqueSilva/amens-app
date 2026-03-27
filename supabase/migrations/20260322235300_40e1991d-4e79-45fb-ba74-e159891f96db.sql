
-- Add user_id to prayer_requests
ALTER TABLE public.prayer_requests ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create prayer_reactions table
CREATE TABLE public.prayer_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id uuid REFERENCES public.prayer_requests(id) ON DELETE CASCADE NOT NULL,
  reactor_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on prayer_reactions
ALTER TABLE public.prayer_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert reactions
CREATE POLICY "Authenticated users can insert reactions"
  ON public.prayer_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reactor_user_id);

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON public.prayer_reactions FOR SELECT
  TO public
  USING (true);

-- Update prayer_requests insert policy to store user_id
DROP POLICY IF EXISTS "Anyone can insert prayer requests" ON public.prayer_requests;
CREATE POLICY "Authenticated users can insert prayer requests"
  ON public.prayer_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can see their own prayers 
-- Keep existing public select policy for the pray feature
