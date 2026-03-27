
-- User XP table
CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  prayers_given integer NOT NULL DEFAULT 0,
  prayers_submitted integer NOT NULL DEFAULT 0,
  reactions_sent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- Users can read their own XP
CREATE POLICY "Users can view own xp" ON public.user_xp
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own XP row
CREATE POLICY "Users can insert own xp" ON public.user_xp
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own XP
CREATE POLICY "Users can update own xp" ON public.user_xp
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to add XP atomically
CREATE OR REPLACE FUNCTION public.add_xp(
  p_user_id uuid,
  p_xp_amount integer,
  p_action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  INSERT INTO public.user_xp (user_id, total_xp, prayers_given, prayers_submitted, reactions_sent)
  VALUES (
    p_user_id,
    p_xp_amount,
    CASE WHEN p_action = 'pray' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'submit' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'react' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_xp.total_xp + p_xp_amount,
    prayers_given = user_xp.prayers_given + CASE WHEN p_action = 'pray' THEN 1 ELSE 0 END,
    prayers_submitted = user_xp.prayers_submitted + CASE WHEN p_action = 'submit' THEN 1 ELSE 0 END,
    reactions_sent = user_xp.reactions_sent + CASE WHEN p_action = 'react' THEN 1 ELSE 0 END,
    updated_at = now()
  RETURNING total_xp INTO v_total;
  
  RETURN v_total;
END;
$$;
