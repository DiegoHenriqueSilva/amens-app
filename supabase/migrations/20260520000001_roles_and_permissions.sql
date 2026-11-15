-- Roles system: roles table, user_roles table, RLS helper functions, seed first admin

-- 1. roles
CREATE TABLE public.roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.roles (name) VALUES ('admin'), ('moderator'), ('user');

-- 2. user_roles
CREATE TABLE public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- 3. RLS helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'moderator')
  );
$$;

-- 4. RLS for roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

-- 5. RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator_or_admin());

CREATE POLICY "user_roles_insert_admin"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_delete_admin"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. Seed first admin (yamanaka.erick@gmail.com)
-- Uses a DO block so it silently skips if the user doesn't exist yet in auth.users
DO $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'yamanaka.erick@gmail.com' LIMIT 1;
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;

  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, assigned_by)
    VALUES (v_user_id, v_role_id, v_user_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;

-- 7. Update prayer_moderation_reviews SELECT policy so admins/moderators can read it
DROP POLICY IF EXISTS "prayer_moderation_reviews_no_select" ON public.prayer_moderation_reviews;

CREATE POLICY "prayer_moderation_reviews_select_admin"
  ON public.prayer_moderation_reviews FOR SELECT
  TO authenticated
  USING (public.is_moderator_or_admin());
