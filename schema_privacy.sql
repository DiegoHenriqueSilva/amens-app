-- ==========================================
-- SCRIPT DE ATUALIZAÇÃO - PRIVACIDADE (ANONIMATO)
-- ==========================================
-- Rode este script no SQL Editor do painel do Supabase.

-- Mudar o nome das colunas ou adicioná-las para controlar a privacidade na tabela de perfis
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymize_name BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymize_city BOOLEAN DEFAULT false;

-- Adicionalmente, permitimos null em algumas áreas, o que já está habilitado na estrutura antiga.

-- A foreign key user_id já existe na tabela prayer_requests e prayer_intercessions, 
-- garantindo que os administradores possam sempre buscar quem realmente criou o registro.
SELECT 'Atualização de schema aplicada com sucesso' as result;
