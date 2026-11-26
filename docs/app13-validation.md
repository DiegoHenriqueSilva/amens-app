# APP13 — Editar conta, devoção, privacidade e indicações

**Status:** Em validação funcional
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
- A validação de identidade foi corrigida na branch: o token autenticado agora
  precisa corresponder ao usuário indicado, com tratamento de duplicidade e
  falhas antes de conceder XP/notificar.
- A função verifica indicação repetida, mas a corrida concorrente e a falha
  parcial entre inserção, XP e notificação ainda não foram validadas.
- A projeção pública dos campos de perfil deve ser testada com uma segunda conta.

## Matriz de testes

| Caso | Validação | Estado |
| --- | --- | --- |
| APP13-T01 | Salvar, cancelar, recarregar e falhar gravação | Cancelamento aprovado; falha de gravação pendente |
| APP13-T02 | Foto válida, formato/tamanho inválido e falha de upload | Tipo e tamanho inválidos aprovados; upload válido pendente |
| APP13-T03 | Nome público e presença na paróquia entre duas contas | Não executado |
| APP13-T04 | Indicação válida, própria, repetida e concorrente | Não executado |
| APP13-T05 | Preferência de desempenho e movimento reduzido | Não executado |
| APP13-T06 | Devoção, nome real, paróquia e consentimentos | Campos exibidos; persistência cruzada pendente |
| APP13-T07 | Estatísticas, pontos, convidados e sair | Não executado |
| APP13-T08 | 320 px, paisagem, teclado e estados de erro | Não executado |
| APP13-T09 | Build, lint e segurança das funções | Build e contrato da indicação aprovados |

## Execução inicial — 26/11/2026

- `/profile/edit` autenticado abre diretamente no modo de edição.
- Campos de devoção e presença pública na paróquia foram encontrados.
- Cancelar uma alteração temporária retornou ao altar sem persistir o valor.
- Captura autenticada gerada em `artifacts/app13-profile-edit-390.png`.
- Upload de arquivo não-imagem e imagem acima de 5 MB rejeitados antes do
  Storage.
- Atualização do próprio perfil confirmada diretamente no Supabase sem alterar
  o valor armazenado.
- Contrato de segurança de `process-referral` validado estaticamente.
- `npm run build`: aprovado.

Ainda faltam upload real, falhas parciais de perfil/Auth, privacidade observada
por uma segunda conta, concorrência real da indicação, persistência dos novos
campos e teste nativo de movimento reduzido.

## Critérios de conclusão

O APP13 só será concluído após validar a edição completa, os estados de erro,
upload, privacidade com segunda conta, indicação legítima sem duplicidade,
preferências, acessibilidade, responsividade e o contrato de segurança da Edge
Function.
