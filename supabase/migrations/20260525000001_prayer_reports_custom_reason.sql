-- Store the user-written reason separately from the selected report category.
ALTER TABLE public.prayer_reports
  ADD COLUMN IF NOT EXISTS custom_reason text;
