-- Step 1: Add friend_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- Step 2: Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- Step 3: Create friendships table (for accepted connections)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Step 4: Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Policies for Friend Requests
CREATE POLICY "Users can view their own sent/received requests"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update request status"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policies for Friendships
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Step 5: Function to generate unique friend code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOL DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    new_code := 'AMEN-' || upper(substring(md5(random()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = new_code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Step 6: Update handle_new_user to include friend_code
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, state, city, parish, friend_code)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'parish',
    public.generate_friend_code()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Migration for existing users
UPDATE public.profiles SET friend_code = public.generate_friend_code() WHERE friend_code IS NULL;

-- Step 8: Trigger to automatically create bidirectional friendships on accept
CREATE OR REPLACE FUNCTION public.handle_friend_request_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert bidirectional friendship
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.sender_id, NEW.receiver_id), (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
    
    -- Create notification for sender
    INSERT INTO public.notifications (user_id, message)
    VALUES (NEW.sender_id, (SELECT full_name FROM public.profiles WHERE id = NEW.receiver_id) || ' aceitou seu pedido de amizade! 🙏');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_request_accept();
