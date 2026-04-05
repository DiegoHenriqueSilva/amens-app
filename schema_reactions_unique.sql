-- ==============================================
-- MIGRAÇÃO: Uma reação por usuário por oração
-- Rode este script no SQL Editor do Supabase
-- ==============================================

-- 1. Remover duplicatas antigas (mantém apenas a mais recente por par)
DELETE FROM public.prayer_reactions
WHERE id NOT IN (
  SELECT DISTINCT ON (prayer_request_id, reactor_user_id) id
  FROM public.prayer_reactions
  ORDER BY prayer_request_id, reactor_user_id, created_at DESC
);

-- 2. Adicionar constraint UNIQUE para garantir 1 reação por usuário por oração
ALTER TABLE public.prayer_reactions
  ADD CONSTRAINT prayer_reactions_unique_user_prayer
  UNIQUE (prayer_request_id, reactor_user_id);

-- 3. Política de UPDATE (para o upsert poder atualizar reaction_type)
DROP POLICY IF EXISTS "Users can update own reactions" ON public.prayer_reactions;
CREATE POLICY "Users can update own reactions"
  ON public.prayer_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = reactor_user_id)
  WITH CHECK (auth.uid() = reactor_user_id);

-- 4. Política de DELETE (para remover reação ao clicar no mesmo emoji já ativo)
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.prayer_reactions;
CREATE POLICY "Users can delete own reactions"
  ON public.prayer_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = reactor_user_id);
