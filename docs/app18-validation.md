# APP18 — Enviar sugestão ou problema à equipe

**Status:** Concluído e aprovado  
**Branch:** `codex/feature/app18-feedback-suggestions`

## Correções realizadas

- O feedback exige sessão autenticada antes do envio.
- Categorias e mensagem continuam validadas no cliente e no banco.
- O diálogo informa que sugestão/problema é diferente de denúncia de conteúdo ou usuário.
- Labels foram ligados aos controles.
- O contador informa limite de 2000 caracteres e mínimo de 10.
- O nome de fechamento permanece acessível pelo componente de diálogo.
- Falhas preservam o texto para nova tentativa.
- Cancelamento limpa o rascunho ao fechar.
- Respostas administrativas passaram a usar uma RPC transacional.
- A notificação e a marcação do feedback como respondido agora são concluídas juntas ou falham juntas.

## Validações realizadas

- Usuário autenticado abriu o diálogo.
- Categoria foi selecionada corretamente.
- Campo de mensagem ficou acessível e visível.
- Explicação diferenciando feedback de denúncia foi exibida.
- Cancelamento e limpeza do rascunho foram aprovados.
- `npm run build` aprovado.
- `git diff --check` aprovado.
- `node tests/app18-feedback-smoke.e2e.mjs` aprovado.
- Envio real autenticado para o Supabase aprovado.
- Feedback localizado pelo moderador no painel/dados administrativos.
- Resposta transacional pela RPC aprovada, com status `replied` e texto salvo.
- Notificação criada para o usuário remetente aprovada.
- Outro usuário não conseguiu visualizar o feedback (`0` registros).
- Usuário comum não conseguiu executar a RPC de resposta (`Moderator access required`).

## Evidência

![Diálogo autenticado de feedback](../artifacts/app18-feedback-dialog.png)

## Migration

Foi criada a migration:

`supabase/migrations/20261128010000_app18_feedback_reply_rpc.sql`

Ela cria `reply_to_user_feedback`, que valida moderador/admin e envia a resposta
junto com a notificação de forma transacional. A migration foi aplicada no SQL
Editor do Supabase e validada no ciclo completo.

Também foi aplicada a policy idempotente:

`supabase/migrations/20261128011000_app18_feedback_insert_policy.sql`

Ela permite que uma conta autenticada insira somente feedback cujo `user_id`
seja o próprio usuário autenticado, sem abrir leitura de feedbacks de terceiros.

## Resultado final

O fluxo APP18 foi validado de ponta a ponta: envio autenticado, acesso
administrativo, resposta, gravação transacional, notificação e isolamento entre
usuários. A validação automatizada também confirmou o diálogo, os rótulos, as
categorias, o cancelamento e a limpeza do rascunho.
