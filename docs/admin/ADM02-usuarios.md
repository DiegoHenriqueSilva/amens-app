# ADM02 — Usuários, papéis, suspensão e detalhes

Branch: `fix/adm02-users` (a partir de `origin/main` @ `0063610`).
Estado: **Em andamento**. O banco foi aplicado e testado em produção (**50/50**). Faltam os testes visuais e de interface com login (seção 6).

## 1. Decisões aprovadas (2026-11-16)

- **F04, proteção do próprio admin:** ninguém suspende, remove ou muda o **próprio** papel, e o sistema **nunca fica sem admin**. Vale para qualquer caminho: comando, API direta ou SQL do app.
- **F02, efeito real:** uma conta suspensa ou removida **continua lendo**, mas o **banco recusa** criar pedido, editar o próprio pedido, interceder, reagir, contribuir na corrente (inclusive via `join_prayer_chain`), registrar intenção, convidar amigo e enviar notificação. O app mostra um aviso com o prazo.
- **Solução:** comandos administrativos no servidor (RPC `SECURITY DEFINER`), conforme recomendado no pacote. Cada um valida ator, alvo, motivo e intervalo e grava **ação + log na mesma transação**.

## 2. Problemas encontrados e correções

| # | Problema (estado em 0063610) | Correção | Item |
|---|---|---|---|
| 1 | **Suspensão e remoção não tinham efeito:** nada no app nem no banco conferia `suspended_until` ou `deleted_at` | Trigger `enforce_account_not_restricted` em 7 tabelas + aviso no app (`AccountStatusBanner`) | F02 |
| 2 | "Banir usuário", "Remover suspensão" e a troca de papel agiam **com um clique**, sem confirmação | Diálogo único (`AdminActionDialog`) com identidade do alvo, motivo obrigatório e erro do servidor sem fechar | U01 |
| 3 | A troca de papel apagava e depois inseria: se falhasse no meio, a pessoa ficava sem papel | `admin_set_user_role`: insere o novo antes de remover o antigo, na mesma transação | F01 |
| 4 | Falha no log de auditoria era ignorada (`console.warn`) e a ação aparecia como sucesso | Log gravado dentro do comando: sem log, não há ação | F03/T05 |
| 5 | "Definir XP" de outra pessoa falhava sempre: o RLS de `user_xp` só permite alterar o próprio | `admin_set_user_xp` | F03 |
| 6 | O multiplicador aparecia **sempre como 1×**: a consulta pedia a coluna `notes`, que não existe | Consulta corrigida e erro exibido | F03 |
| 7 | Duração inválida virava 7 dias sem aviso; número negativo criava uma suspensão já vencida, registrada no log | Validação de 1 a 365 dias na tela e no servidor, com a data final exibida antes de confirmar | U02 |
| 8 | Admin podia se banir, se rebaixar ou remover o último admin | Regra F04 no servidor (comandos + triggers) | F04 |
| 9 | Lista truncada em 500 sem aviso; papel errado quando a pessoa tinha mais de um papel | Limite 1000 com aviso "mostrando X de Y"; vale o maior papel | F03 |
| 10 | O detalhe não mostrava a cota diária nem o histórico de suspensão e remoção | Cota (`prayer_daily_allowance`) + histórico completo com de/para | §1 |
| 11 | Tooltips das abas só abriam com mouse; botão de ações sem nome acessível | Texto de ajuda visível e `aria-label` com o nome do alvo; tabela rolável no celular | U03 |

**F05, reconhecimento de apoiador:** Usuários e Doações usam **o mesmo** componente (`AdminSupporter`) e o mesmo comando (`admin_supporter`, só admin), com trilha em `supporter_recognition_audit`. Não há cobrança nem reembolso implícito: o comando só liga ou desliga o reconhecimento. ✅ Observação para a ADM10: ele não grava em `moderation_logs`, então a ação não aparece na tela de Logs (ADM08).

## 3. Contrato dos comandos (todos exigem motivo ≥ 3 caracteres)

| Comando | Quem | Validações |
|---|---|---|
| `admin_suspend_user(p_user, p_days, p_reason)` | moderador ou admin | 1–365 dias; não em si; conta não removida |
| `admin_unsuspend_user(p_user, p_reason)` | moderador ou admin | precisa estar suspenso |
| `admin_set_user_removed(p_user, p_removed, p_reason)` | admin | não em si; não remove admin (retire o papel antes); sem efeito repetido |
| `admin_set_user_role(p_user, p_role, p_reason)` | admin | `user`/`moderator`/`admin`; não em si; último admin protegido; log com de/para |
| `admin_set_user_xp(p_user, p_xp, p_reason)` | admin | 0–10.000.000; log com de/para |
| `admin_set_xp_multiplier(p_user, p_multiplier, p_reason)` | admin | 0,1–10; log com de/para |
| `my_account_status()` | o próprio usuário | usado pelo aviso no app |

Erros voltam em português, com `hint` para o código (`self_action`, `last_admin`, `invalid_days`, `account_suspended`…).

## 4. Artefatos

- `supabase/migrations/20261116040000_adm02_user_admin_commands.sql`: **aplicada em produção (`fszltwvhbdasqoznnors`) em 2026-11-16**. Rollback: `docs/admin/sql/adm02_rollback.sql`.
- `src/components/admin/AdminUsers.tsx`, `AdminUserDetail.tsx`, `AdminActionDialog.tsx` (novo), `src/components/AccountStatusBanner.tsx` (novo), `src/lib/admin-rpc.ts` (novo), `src/App.tsx`.
- Bateria: `docs/admin/testes/bateria_adm02_usuarios.mjs`.

### ⚠️ Incidente durante a entrega

A 1ª versão do trigger lia `old.user_id`. Em PL/pgSQL o `AND` não tem curto-circuito garantido, e `prayer_reactions` e `friend_requests` não têm essa coluna. Por isso, **por cerca de 15 minutos, usuários comuns não conseguiram reagir nem enviar convites de amizade em produção**. A bateria detectou o problema (erro 42703), que foi corrigido com um `IF` aninhado e reconfirmado (reação e convite OK). Não há registro de quantas tentativas falharam nesse intervalo.

A bateria também pegou um 2º defeito antes de qualquer uso real: o trigger de papéis era `SECURITY DEFINER` e, por isso, não detectava "self" pela API direta. Foi trocado para `SECURITY INVOKER`.

## 5. Testes em produção — 50/50 (2026-11-16)

Tudo numa transação desfeita. Uma conta comum recebeu o papel de moderador só durante o teste. Depois foi conferido que nada ficou gravado: 5 admins, 0 moderadores, 0 logs, notificações, XP ou ajustes de teste.

| ID | Teste | Esperado | Obtido | |
|---|---|---|---|---|
| T02a | comum chama comando de papel | `bloq:42501` | `bloq:42501` | ✅ |
| T02b | comum se insere como admin direto | `bloq:42501` | `bloq:42501:self_action` | ✅ |
| T02c | comum suspende alguém | `bloq:42501` | `bloq:42501` | ✅ |
| T02d | moderador muda papel | `bloq:42501` | `bloq:42501` | ✅ |
| T02e | moderador remove conta | `bloq:42501` | `bloq:42501` | ✅ |
| T02f | moderador ajusta XP | `bloq:42501` | `bloq:42501` | ✅ |
| T02g | admin muda o próprio papel | `bloq:42501:self_action` | `bloq:42501:self_action` | ✅ |
| T02h | admin muda o próprio papel direto | `bloq:42501:self_action` | `bloq:42501:self_action` | ✅ |
| T02i | admin promove alvo a moderador | `ok:1` | `ok:1` | ✅ |
| T02j | papel do alvo depois | `moderator` | `moderator` | ✅ |
| T02k | admin devolve alvo a usuário | `ok:1` | `ok:1` | ✅ |
| T02l | alvo sem papel | `0` | `0` | ✅ |
| T02m | papel inválido | `bloq:22023` | `bloq:22023` | ✅ |
| T02n | sem motivo | `bloq:22023:reason_required` | `bloq:22023:reason_required` | ✅ |
| T02o | usuário inexistente | `bloq:P0002` | `bloq:P0002` | ✅ |
| T02p | remover o último admin | `bloq:42501:last_admin` | `bloq:42501:last_admin` | ✅ |
| T03a | duração 0 dias | `bloq:22023:invalid_days` | `bloq:22023:invalid_days` | ✅ |
| T03b | duração 400 dias | `bloq:22023:invalid_days` | `bloq:22023:invalid_days` | ✅ |
| T03c | admin suspende a si mesmo | `bloq:42501:self_action` | `bloq:42501:self_action` | ✅ |
| T03d | admin suspende a si mesmo direto | `bloq:42501:self_action` | `bloq:42501:self_action` | ✅ |
| T03e | admin suspende alvo por 3 dias | `ok:1` | `ok:1` | ✅ |
| T01a | só o alvo mudou (outros perfis intactos) | `true` | `true` | ✅ |
| T01b | alvo suspenso por ~3 dias | `true` | `true` | ✅ |
| T03f | alvo recebe estado restrito | `true` | `true` | ✅ |
| T03g | suspenso cria pedido | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03h | suspenso reage | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03i | suspenso intercede | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03j | suspenso convida amigo | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03k | suspenso envia notificação | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03l | suspenso entra na corrente (RPC) | `bloq:42501:account_suspended` | `bloq:42501:account_suspended` | ✅ |
| T03m | suspenso continua lendo | `true` | `true` | ✅ |
| T03n | admin retira a suspensão | `ok:1` | `ok:1` | ✅ |
| T03o | liberado interage de novo | `ok:1` | `ok:1` | ✅ |
| T03p | admin remove (bane) o alvo | `ok:1` | `ok:1` | ✅ |
| T03q | admin remove outro admin | `bloq:42501:target_is_admin` | `bloq:42501:target_is_admin` | ✅ |
| T03r | banido interage | `bloq:42501:account_removed` | `bloq:42501:account_removed` | ✅ |
| T03s | admin restaura o alvo | `ok:1` | `ok:1` | ✅ |
| T03t | restaurado interage de novo | `ok:1` | `ok:1` | ✅ |
| T04a | XP negativo | `bloq:22023:invalid_xp` | `bloq:22023:invalid_xp` | ✅ |
| T04b | XP acima do teto | `bloq:22023:invalid_xp` | `bloq:22023:invalid_xp` | ✅ |
| T04c | XP 1.000.000 válido | `ok:1` | `ok:1` | ✅ |
| T04d | XP gravado | `1000000` | `1000000` | ✅ |
| T04e | cota diária subiu com o nível | `true` | `true` | ✅ |
| T04f | multiplicador 0 | `bloq:22023:invalid_multiplier` | `bloq:22023:invalid_multiplier` | ✅ |
| T04g | multiplicador 11 | `bloq:22023:invalid_multiplier` | `bloq:22023:invalid_multiplier` | ✅ |
| T04h | multiplicador 2,5 válido | `ok:1` | `ok:1` | ✅ |
| T04i | multiplicador gravado | `2.5` | `2.5` | ✅ |
| T05a | logs dos 8 comandos válidos (ator, alvo, motivo) | `8` | `8` | ✅ |
| T05b | log de papel guarda de/para | `true` | `true` | ✅ |
| T05c | comandos recusados não geraram log | `0` | `0` | ✅ |

Mapeamento para o pacote: T01 → T01a/b; T02 → T02a–p; T03 → T03a–t; T04 → T04a–i (a cota sobe com o nível); T05 → T05a–c (log íntegro com ator, alvo, motivo e de/para; comando recusado não gera log nem efeito).

## 6. Pendente (manual, com login)

| Caso | Como | Estado |
|---|---|---|
| T01 na tela | Filtrar, abrir detalhe, ajustar XP, voltar à lista: só o alvo muda e a lista atualiza | Não executado |
| T03 no app | Suspender uma conta de teste com sessão aberta: aparece o aviso e tentar publicar, orar ou reagir mostra o erro; ao retirar a suspensão, tudo volta | Não executado |
| T05 na tela | Ação negada pelo servidor (ex.: rebaixar o último admin) mostra o erro no diálogo, que não fecha nem mostra sucesso | Não executado |
| U01–U03 | Diálogos com Tab/Esc, 390 px, dois temas | Não executado |

## 7. Integração com outras tarefas

- **ADM04 (Reports):** a suspensão de 7 dias feita a partir de um report ainda usa `update` direto em `profiles`. Funciona, porque o trigger valida moderador e "não em si", mas não exige motivo nem passa pelo comando. Migrar para `admin_suspend_user`.
- **ADM08 (Logs):** os novos logs têm `metadata` (de/para, dias, até quando).
- **APP02/APP13:** as telas do app podem tratar o `hint` `account_suspended`/`account_removed` com uma mensagem própria.

## Revisão de conteúdo (regra content-review-enforcement)

Textos vistos por usuários comuns, revisados com `agent-content-review` e `context-content-guidelines`:

| Onde | Texto anterior | Veredito | Texto final |
|---|---|---|---|
| Aviso no app (removida) | "Sua conta foi removida pela moderação. Você pode ler o conteúdo, mas não pode publicar, orar, reagir ou convidar amigos." | Ajustado: tom punitivo e "não pode orar" soa como proibição de fé | "Sua conta foi desativada pela moderação. Você ainda pode ler os pedidos e acompanhar a comunidade, mas não é possível publicar, registrar orações, reagir ou convidar amigos." |
| Aviso no app (suspensa) | "Sua conta está suspensa até … Até lá você pode ler o conteúdo, mas não pode …" | Ajustado: frio, foco na proibição | "Sua conta está com as interações pausadas até … Até lá, você ainda pode ler os pedidos e acompanhar a comunidade." |
| Erro do banco (removida) | "Sua conta foi removida pela moderação e não pode realizar esta ação." | Ajustado | "Sua conta foi desativada pela moderação. Você ainda pode ler o conteúdo, mas esta ação não está disponível." |
| Erro do banco (suspensa) | "Sua conta está suspensa até % (horário de Brasília)." | Ajustado | "Sua conta está com as interações pausadas até % (horário de Brasília). Até lá, você ainda pode ler o conteúdo." |

As mensagens do banco foram trocadas pela migration `20261116050000_adm02_account_messages_tone.sql` (só texto; lógica idêntica, conferida por hash com a função em produção). Aplicada em produção em 17/11/2026 e testada em transação desfeita: conta livre convida normalmente; suspensa e removida recebem `42501` com o texto novo.

Textos do painel admin (diálogos, erros de comando) são de uso interno da equipe e foram considerados **Aprovados** (claros, sem promessa espiritual nem gamificação).
