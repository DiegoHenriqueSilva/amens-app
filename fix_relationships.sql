-- Fix relationships to allow Postgrest to join prayer_requests/intercessions with profiles
ALTER TABLE public.prayer_requests
DROP CONSTRAINT IF EXISTS prayer_requests_user_id_fkey,
ADD CONSTRAINT prayer_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.prayer_intercessions
DROP CONSTRAINT IF EXISTS prayer_intercessions_user_id_fkey,
ADD CONSTRAINT prayer_intercessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
