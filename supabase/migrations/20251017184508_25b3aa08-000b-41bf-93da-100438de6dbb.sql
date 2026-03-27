-- Create prayer_requests table
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  location TEXT,
  prayer_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
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
