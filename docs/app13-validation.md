# APP13 — Editar conta, devoção, privacidade e indicações

**Status:** Auditoria inicial  
**Branch:** `codex/feature/app13-account-privacy-referrals`

## Escopo

- Edição em `/profile/edit`.
- Nome público, nome real, cidade, estado e paróquia.
- Santo de devoção e consentimento de presença na paróquia.
- Foto de perfil e validação de upload.
- Pontos, estatísticas, convidados e sair da conta.
- Link de indicação e processamento idempotente.
- Preferências de desempenho e movimento reduzido.

## Achados iniciais

- A tela de edição existe e atualiza `profiles` e metadados do Auth.
- O upload grava no bucket `avatars` e depois atualiza `profiles.avatar_url`.
- O cancelamento da edição precisa ser validado para garantir que não persiste
  alterações parciais.
- A Edge Function `process-referral` recebe `referrer_user_id` e
  `referred_user_id` diretamente do corpo da requisição. Esse contrato precisa
  ser validado contra a identidade autenticada antes de conceder XP.
- A função verifica indicação repetida, mas a corrida concorrente e a falha
  parcial entre inserção, XP e notificação ainda não foram validadas.
- A projeção pública dos campos de perfil deve ser testada com uma segunda conta.

## Matriz de testes

| Caso | Validação | Estado |
| --- | --- | --- |
| APP13-T01 | Salvar, cancelar, recarregar e falhar gravação | Não executado |
| APP13-T02 | Foto válida, formato/tamanho inválido e falha de upload | Não executado |
| APP13-T03 | Nome público e presença na paróquia entre duas contas | Não executado |
| APP13-T04 | Indicação válida, própria, repetida e concorrente | Não executado |
| APP13-T05 | Preferência de desempenho e movimento reduzido | Não executado |
| APP13-T06 | Devoção, nome real, paróquia e consentimentos | Não executado |
| APP13-T07 | Estatísticas, pontos, convidados e sair | Não executado |
| APP13-T08 | 320 px, paisagem, teclado e estados de erro | Não executado |
| APP13-T09 | Build, lint e segurança das funções | Não executado |

## Critérios de conclusão

O APP13 só será concluído após validar a edição completa, os estados de erro,
upload, privacidade com segunda conta, indicação legítima sem duplicidade,
preferências, acessibilidade, responsividade e o contrato de segurança da Edge
Function.
