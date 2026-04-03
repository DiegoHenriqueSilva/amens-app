-- ==========================================
-- SCRIPT DE ATUALIZAÇÃO DO SUPABASE
-- ==========================================
-- Copie todo este conteúdo e rode no 
-- SQL Editor no painel do Supabase.

-- Criação da Tabela Profile para permitir consultas de estatísticas públicas
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  state text,
  city text,
  parish text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Consultas (Stats Pŕublicos)
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

-- Permissão de Edição
CREATE POLICY "Users can insert own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Gatilho para auto-inserir profile após qualquer cadastro de auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, state, city, parish)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'parish'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove anterior caso tenha
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criação do Gatilho
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- View para consulta rapida da aba de Comunidade
CREATE OR REPLACE VIEW public.parish_stats AS
SELECT 
  state,
  city,
  parish,
  count(id) as total_users
FROM public.profiles
WHERE state IS NOT NULL AND city IS NOT NULL AND parish IS NOT NULL
GROUP BY state, city, parish;

-- Migrar usuários existentes (caso já existam na base auth)
INSERT INTO public.profiles (id, full_name, city)
SELECT id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'city'
FROM auth.users 
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id);
