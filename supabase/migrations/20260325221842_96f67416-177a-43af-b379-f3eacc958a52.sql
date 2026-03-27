
-- Referrals table to track who referred whom
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  xp_awarded boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id);

CREATE POLICY "Authenticated can insert referrals" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update own referrals" ON public.referrals
  FOR UPDATE TO authenticated USING (auth.uid() = referrer_user_id);

-- Update add_xp to support 'referral' action
CREATE OR REPLACE FUNCTION public.add_xp(p_user_id uuid, p_xp_amount integer, p_action text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
