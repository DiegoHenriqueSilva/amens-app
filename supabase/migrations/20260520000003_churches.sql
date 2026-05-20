-- Churches table and link to profiles

CREATE TABLE public.churches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  diocese    text,
  city       text,
  state      text,
  cnpj       text,
  is_active  boolean NOT NULL DEFAULT true,
  deleted_at timestamp WITH TIME ZONE,
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Trigger to keep updated_at current
CREATE TRIGGER churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing distinct parish values in profiles (text → churches table)
INSERT INTO public.churches (name, city, state)
SELECT DISTINCT parish, city, state
FROM public.profiles
WHERE parish IS NOT NULL AND parish <> ''
ON CONFLICT DO NOTHING;

-- Add church_id FK to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL;

-- Best-effort migration: link profiles to churches by matching name+city
UPDATE public.profiles p
SET church_id = c.id
FROM public.churches c
WHERE p.parish = c.name
  AND (p.city = c.city OR p.city IS NULL)
  AND p.church_id IS NULL;

-- RLS for churches
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "churches_select_public"
  ON public.churches FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "churches_select_admin_deleted"
  ON public.churches FOR SELECT
  TO authenticated
  USING (deleted_at IS NOT NULL AND public.is_admin());

CREATE POLICY "churches_insert_admin"
  ON public.churches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "churches_update_admin"
  ON public.churches FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_churches_state ON public.churches(state);
CREATE INDEX IF NOT EXISTS idx_churches_city ON public.churches(city);
CREATE INDEX IF NOT EXISTS idx_profiles_church_id ON public.profiles(church_id);
