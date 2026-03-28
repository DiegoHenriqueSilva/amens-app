-- Create prayer_requests table
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  location TEXT,
  prayer_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  author_name TEXT
);

-- Enable RLS
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read prayer requests
CREATE POLICY "Anyone can view prayer requests"
  ON public.prayer_requests
  FOR SELECT
  USING (true);

-- Allow anyone to insert prayer requests (public submission)
CREATE POLICY "Anyone can insert prayer requests"
  ON public.prayer_requests
  FOR INSERT
  WITH CHECK (true);

-- Allow updates to prayer_count (for incrementing)
CREATE POLICY "Anyone can update prayer_count"
  ON public.prayer_requests
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries on prayer_count
CREATE INDEX idx_prayer_requests_prayer_count ON public.prayer_requests(prayer_count);

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

-- Fix overly permissive UPDATE policy on prayer_requests
DROP POLICY IF EXISTS "Anyone can update prayer_count" ON public.prayer_requests;

-- Only allow authenticated users to increment prayer_count (not their own prayers)
CREATE POLICY "Authenticated users can update prayer_count"
  ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

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
