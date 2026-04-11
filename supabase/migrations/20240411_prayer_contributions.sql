-- Table for real-time prayer contributions
CREATE TABLE IF NOT EXISTS public.prayer_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_timestamp bigint NOT NULL, -- Unix timestamp in ms when the phrase starts
  author_name text NOT NULL,
  author_city text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(target_timestamp)
);

-- RLS
ALTER TABLE public.prayer_contributions ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public read contributions" ON public.prayer_contributions FOR SELECT USING (true);

-- Authenticated can insert
CREATE POLICY "Authenticated users can insert contributions" ON public.prayer_contributions 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_contributions;
