-- 1. Função para obter o tempo do servidor em milissegundos (Sincronização)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN extract(epoch from now()) * 1000;
END;
$$;

-- 2. Função "Piloto Automático" para participar da corrente (Winner Selection)
-- Esta função garante que a disputa pelo slot seja atômica no servidor.
CREATE OR REPLACE FUNCTION public.join_prayer_chain(
  p_target_timestamp bigint,
  p_author_name text,
  p_author_city text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  -- Obtém o ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verifica se o slot já está ocupado
  SELECT EXISTS (
    SELECT 1 FROM public.prayer_contributions 
    WHERE target_timestamp = p_target_timestamp
  ) INTO v_exists;

  IF v_exists THEN
    RETURN false; -- Slot já ocupado (Perdeu a disputa)
  END IF;

  -- Tenta inserir (O UNIQUE(target_timestamp) garante a atomicidade final)
  BEGIN
    INSERT INTO public.prayer_contributions (
      user_id, 
      target_timestamp, 
      author_name, 
      author_city
    ) VALUES (
      v_user_id, 
      p_target_timestamp, 
      p_author_name, 
      p_author_city
    );
    RETURN true; -- Sucesso (Venceu a disputa)
  EXCEPTION WHEN unique_violation THEN
    RETURN false; -- Slot ocupado no último milissegundo
  END;
END;
$$;

-- 3. Cleanup: Função para remover contribuições antigas (Opcional, mantém o banco leve)
CREATE OR REPLACE FUNCTION public.cleanup_prayer_contributions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.prayer_contributions
  WHERE target_timestamp < (extract(epoch from now()) * 1000) - 3600000; -- Remove o que tem mais de 1 hora
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_server_time TO public;
GRANT EXECUTE ON FUNCTION public.join_prayer_chain TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_prayer_contributions TO authenticated;
