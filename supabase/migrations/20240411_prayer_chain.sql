-- Prayer Chain Sessions Table
CREATE TABLE public.prayer_chain_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_type text NOT NULL,
  current_phrase_index integer NOT NULL DEFAULT 0,
  last_interaction_at timestamp with time zone NOT NULL DEFAULT now(),
  last_contributor_name text,
  last_contributor_city text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_chain_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all users (including anonymous) to read
CREATE POLICY "Allow public read of active sessions" ON public.prayer_chain_sessions
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated users to update sessions" ON public.prayer_chain_sessions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert sessions" ON public.prayer_chain_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Prayer Intentions Table
CREATE TABLE public.prayer_intentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_intentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all intentions from last 7 days" ON public.prayer_intentions
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert their own intentions" ON public.prayer_intentions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add intention count view for optimization
CREATE OR REPLACE VIEW public.prayer_intentions_count AS
SELECT count(*) as total_intentions
FROM public.prayer_intentions
WHERE created_at >= now() - interval '7 days';

GRANT SELECT ON public.prayer_intentions_count TO public;
