ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS devotional_saint text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public_in_parish boolean NOT NULL DEFAULT false;
