-- Update RLS for user_xp to allow authenticated users to view others' XP (for level display in Meus convidados)
DROP POLICY IF EXISTS "Users can view own xp" ON public.user_xp;
CREATE POLICY "Authenticated users can view any xp" ON public.user_xp
  FOR SELECT TO authenticated
  USING (true);

-- Ensure referrals are readable by the referrer
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);
