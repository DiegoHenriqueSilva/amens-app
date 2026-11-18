-- ADM00 · Passo 2 — PROVAR A FALHA (e, depois, provar a correção)
-- Simula um USUÁRIO COMUM dentro de uma transação que é DESFEITA no final
-- (ROLLBACK). Nada é gravado de verdade.
--
-- Antes de rodar, troque:
--   <UUID_USUARIO_COMUM>  -> id de uma conta de teste SEM papel admin/moderador
--   <UUID_PEDIDO_ALHEIO>  -> id de um pedido de oração de OUTRA pessoa
--   <UUID_OUTRA_PESSOA>   -> id de qualquer outro usuário

begin;
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"<UUID_USUARIO_COMUM>","role":"authenticated"}', true);

  -- S1: usuário comum tentando "banir" o pedido de outra pessoa
  update public.prayer_requests
     set status = 'banned'
   where id = '<UUID_PEDIDO_ALHEIO>'
  returning id, status;
  -- ANTES da correção: retorna 1 linha (FALHA confirmada)
  -- DEPOIS da correção: retorna 0 linhas (bloqueado)

  -- S2: usuário comum criando um aviso "oficial" para outra pessoa
  insert into public.notifications (user_id, message, type)
  values ('<UUID_OUTRA_PESSOA>', 'Teste ADM00: aviso falso da moderação', 'system')
  returning id;
  -- ANTES: insere (FALHA confirmada)
  -- DEPOIS: erro "new row violates row-level security policy"
rollback;

-- Fluxos legítimos que PRECISAM continuar funcionando depois da correção.
-- Rode como o mesmo usuário comum (também com rollback no final):
begin;
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"<UUID_USUARIO_COMUM>","role":"authenticated"}', true);

  -- convite/reação/testemunho: notificação sem type -> deve INSERIR
  insert into public.notifications (user_id, message)
  values ('<UUID_OUTRA_PESSOA>', 'Teste ADM00: reação legítima')
  returning id;

  -- orar por um pedido -> deve continuar incrementando
  select public.increment_prayer_count('<UUID_PEDIDO_ALHEIO>');
rollback;
