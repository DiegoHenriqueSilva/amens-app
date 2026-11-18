# ADM04 — Reports e tratamento de denúncias

Pacote: `amens-planejamento/revisao/admin/ADM04-reports-e-tratamento-de-denuncias.md`. Base: `0063610`, empilhada sobre a ADM03. Branch: `erickyamanaka/fix/adm04-reports-denuncias`.

Estado: **Em revisão**. O banco foi aplicado em produção em 18/11/2026, com a bateria em **51/51**, e os testes de tela foram feitos com as contas de teste. A migration de privacidade das colunas só deve ser aplicada **depois do deploy do front** (§7).

## 1. Decisões aprovadas (18/11/2026)

| Tema | Decisão |
|---|---|
| Escalada automática | Vale **3 pessoas distintas**, porque cada pessoa só tem uma denúncia aberta por alvo. Ao chegar ao limiar, um pedido **Ativo** vai para "Em revisão", com log e aviso ao autor. Se todas as denúncias forem encerradas como sem fundamento, o pedido **volta sozinho** ao estado anterior |
| Decisão | **Por alvo:** a decisão sobre um pedido, pessoa ou contribuição encerra **todas** as denúncias abertas daquele alvo, cada uma com log, e cada denunciante recebe um aviso uma vez |
| Pessoa ou remetente | **Suspender** usa o comando da ADM02 (`admin_suspend_user`: 1–365 dias, data final e motivo obrigatório) |
| Layout | **A: fila por alvo.** Um cartão por alvo mostra o que foi denunciado, quantas pessoas denunciaram, os motivos e as ações diretas. O mesmo layout serve no celular |

Decisões técnicas sem impacto de produto, que seguem o padrão das ADM anteriores:

- **Identidade do denunciante:** não aparece no painel (§5).
- **Motivo:** obrigatório (≥ 3 caracteres) nas ações restritivas e opcional em "Sem fundamento", como em Aprovar na ADM03.
- **Conta suspensa ou desativada:** não pode denunciar, pela mesma regra de "interações pausadas" da ADM02.

## 2. Problemas encontrados (`0063610` e produção em 18/11)

Os problemas marcados com ✔ foram **comprovados em produção** numa transação desfeita.

| # | Problema | Efeito |
|---|---|---|
| 1 ✔ | A escalada conta **reports, não pessoas**, e não há limite por pessoa | **Uma única conta, denunciando 3 vezes, esconde qualquer pedido** |
| 2 ✔ | A escalada tira de `completed`, `policy_violation` e `banned` | O pedido concluído perde o estado e some sem que ninguém decida |
| 3 ✔ | A escalada não grava log nem avisa o autor; os dois triggers de escalada rodam juntos (B14) | Ocultação silenciosa, sem rastro |
| 4 | Se todas as denúncias forem descartadas, o pedido escalado continua oculto | Ocultação permanente indevida (T03) |
| 5 ✔ | Quem denuncia escolhe `status`, `moderator_id`, `resolved_by` e `resolution_notes` no INSERT | Um usuário comum cria um report "resolvido" com moderador e nota forjados |
| 6 ✔ | Não há CHECK de `status`, `target_type` nem `category`, e o padrão era `pending`, enquanto o painel só conhece `open` (B13) | O único report de produção (maio/2026, `pending`) **nunca apareceu** no painel nem no card "Reports abertos" |
| 7 | Cada ação é uma sequência de chamadas no navegador; falhas de log e de aviso são ignoradas; "Deletar" e "Remover conteúdo" nem conferem erro | Falso sucesso e estado parcial |
| 8 | Denúncia de pedido e de contribuição não registra o autor do conteúdo, e o painel busca `target_user_id` | O autor **nunca** recebia os avisos do painel |
| 9 | Pessoa, contribuição e remetente aparecem só como "Usuário", "Corrente de Oração" ou "Mensagem", **sem mostrar quem ou o quê** | O moderador decide às cegas (U01) |
| 10 | "Remover conteúdo" de pessoa suspende **7 dias fixos**, sem motivo e por `update` direto | Contorna a ADM02 |
| 11 | Banir pelo report gera log `ban`, enquanto a ADM03 usa `reject`, e o autor recebe **dois avisos**: o do painel e o do trigger | Auditoria inconsistente e aviso duplicado |
| 12 | Editar pelo report não usa `admin_edit_prayer` (sem proteção de concorrência) | Edição simultânea silenciosa |
| 13 | Banir ou editar resolve só **a denúncia clicada**; as outras do mesmo pedido continuam abertas | Fila inconsistente |
| 14 | "Reabrir e reverter" deduz a ação pelo texto da nota (`includes("editado")`) e devolve sempre para `active` (B16) | Reversão errada ou incompleta |
| 15 | O denunciante recebe o resultado com detalhes ("O conteúdo foi removido…") | Expõe a sanção de outra pessoa |
| 16 | Até 200 reports, busca só nos já carregados, erro de consulta mostrado como lista vazia | Falso vazio (T04) |
| 17 | Abas explicadas só por tooltip (hover), menu sem nome acessível, tabela sem versão celular, ações destrutivas sem confirmação | U01–U03 |
| 18 | O denunciante podia ler, pela API, `resolution_notes` e `moderator_id` das próprias denúncias | Vazava o motivo da moderação sobre outra pessoa (T05) |

## 3. Solução

**Banco:** comandos no servidor, no mesmo padrão da ADM03.

| Peça | O que faz |
|---|---|
| Normalização | `pending` → `open`, padrão `open`, CHECK de status, tipo, categoria e tamanhos; colunas `decision` e `decision_meta` registram a decisão para a reversão |
| `prayer_reports_before_insert` | Quem denuncia não escolhe status nem campos de moderação. Confere se o alvo existe, impede denunciar a si mesmo e ignora em silêncio uma 2ª denúncia aberta da mesma pessoa para o mesmo alvo. Há também um índice único contra corrida. Conta suspensa ou desativada não denuncia |
| `auto_escalate_prayer_reports` | Um único trigger conta **pessoas distintas** e só tira de `active`, com log `auto_escalate` (sem moderador) e aviso ao autor |
| `admin_list_reports` | Fila por alvo, paginada no servidor, com a contagem por aba, a busca, o contexto do alvo e as denúncias. Não expõe quem denunciou |
| `admin_decide_reports` | Decisão por alvo (sem fundamento, resolver, violação, editar, remover contribuição, suspender) com as denúncias encerradas, logs e avisos **na mesma transação**. Recusa com `PT409` se chegou denúncia nova ou se outra pessoa já tratou |
| `admin_reopen_reports` | Reabre uma decisão e desfaz o efeito a partir de `decision`/`decision_meta`, só se o alvo ainda estiver como a decisão deixou |
| `admin_delete_report` | Só admin, com motivo: some do painel e fica guardado |
| `admin_moderate_prayers` (ADM03) | O "Aprovar" reabre as denúncias decididas como violação ou edição pela coluna `decision`, e não mais pelo texto da nota (B16) |

**Tela:** fila por alvo, com o mesmo `AdminActionDialog`, a mesma edição da ADM03 e a suspensão da ADM02.

## 4. Revisão de conteúdo (regra content-review-enforcement)

Os textos foram revisados **antes** do código. O critério:
- **Denunciante:** acolher, sem revelar a sanção aplicada a outra pessoa.
- **Autor:** explicar o efeito, sem culpa e sem promessa espiritual.

| Texto | Para quem | Veredito |
|---|---|---|
| "Analisamos sua denúncia com cuidado. O conteúdo está dentro das diretrizes do Améns, por isso ela foi encerrada. Obrigado por ajudar a cuidar da comunidade." | Denunciante (sem fundamento) | Aprovado. Substitui dois textos antigos que diziam o mesmo de formas diferentes |
| "Analisamos sua denúncia e tomamos as providências necessárias. Obrigado por ajudar a cuidar da comunidade." | Denunciante (qualquer outra decisão) | **Ajustado.** O antigo "O conteúdo foi removido por violar nossas diretrizes" expunha a sanção de outra pessoa |
| "Seu pedido de oração está em revisão pela moderação. Enquanto isso, ele não aparece para a comunidade." | Autor (escalada automática) | Aprovado na ADM03; reutilizado |
| "Seu pedido de oração foi revisado e está visível para a comunidade, que poderá rezar com você." | Autor (volta após "sem fundamento" ou reversão) | Aprovado na ADM03; reutilizado |
| "Sua participação em uma corrente de oração foi retirada pela moderação por não seguir as diretrizes do Améns." | Autor da contribuição | Aprovado: diz o que aconteceu, sem culpar |
| "Sua participação em uma corrente de oração foi restaurada pela moderação." | Autor da contribuição (reversão) | Aprovado |
| Antigo para o autor: "Seu conteúdo foi analisado por um moderador." | — | **Removido:** não dizia nada útil e era enviado até quando nada mudava |
| "Você não pode denunciar a si mesmo." / "Este conteúdo não está mais disponível para denúncia." | Quem denuncia (erro) | Aprovado |

Os textos do painel (consequência de cada ação, ajuda das abas) descrevem o efeito real e ficam em §6.

## 5. Privacidade (T05)

| Papel | Vê |
|---|---|
| Denunciante | As próprias denúncias (categoria, descrição, situação). **Não** vê nota, decisão nem moderador: o SELECT dessas colunas foi revogado |
| Denunciado | Nada das denúncias; só o aviso sobre o próprio conteúdo |
| Usuário comum | Nada |
| Moderador / admin | O alvo, o autor do alvo, as categorias e descrições, e "Pessoa 1, 2…" no lugar de quem denunciou. A identidade do denunciante não sai do banco pelo painel |

## 6. Artefatos

- `supabase/migrations/20261118010000_adm04_reports_commands.sql`: **aplicada em produção em 18/11/2026.** É idempotente e pode ser reaplicada.
- `supabase/migrations/20261118020000_adm04_privacidade_colunas.sql`: **NÃO aplicada.** Aplicar logo depois do deploy do front, porque o painel antigo lê essas colunas direto.
- `src/components/admin/AdminReports.tsx`: reescrito como fila por alvo.
- `src/components/admin/AdminPrayers.tsx`: `EditPrayerDialog` exportado, com `onSubmit` opcional.
- `src/components/admin/AdminLogs.tsx`: rótulos `auto_escalate`, `reopen_report` e `delete_report`; mostra "Automático" quando não há moderador.
- Bateria: `docs/admin/testes/bateria_adm04_reports.sql`. Roteiros de tela: `docs/admin/testes/tela/fase4_reports.cjs`, `semeia_adm04.cjs` e `limpa_adm04.sql`.
- Evidências: `docs/admin/evidencias/ADM04/`.

## 7. Testes

### 7.1 Bateria em produção — 51/51 (18/11/2026)

A bateria roda numa transação desfeita, com pedidos e participação sintéticos. Os denunciantes são contas comuns usadas só dentro da transação. A bateria da ADM03 também foi repetida com a migration da ADM04: **34/34**.

| ID | Teste | Resultado |
|---|---|---|
| I1 | Denúncia enviada como "resolvida", com moderador e nota forjados | Gravada como `open`, sem nota nem moderador ✅ |
| I2 | A mesma pessoa denuncia o mesmo pedido 3 vezes | 1 denúncia ✅ |
| I3–I6 | Autodenúncia; pedido removido; categoria inválida; "Outro" sem motivo | `self_report`, `not_found`, `23514`, `reason_required` ✅ |
| I7 | Conta suspensa denuncia | `account_suspended` ✅ |
| I8 | Denunciante lê a nota da moderação | Bloqueado **depois** da migration `020000`; hoje ainda permitido (§8) |
| E1 | 3 denúncias da mesma pessoa | Pedido continua `active` ✅ |
| E2 | 3 pessoas distintas | `pending_review` + 1 log `auto_escalate` sem moderador + 1 aviso ao autor ✅ |
| E3 | 3 pessoas num pedido **concluído** | Continua `completed` ✅ |
| L1–L4 | Comum lista; contagem de pessoas e "Pessoa 1, 2, 3"; o id de quem denunciou não sai do banco; contagem por aba | ✅ |
| D0–D2 | Comum decide; ação inválida para o tipo; conjunto de denúncias diferente do atual | `42501`, `invalid_action`, `PT409 stale` ✅ |
| D3 | Sem fundamento num pedido escalado | Volta a `active`; 3 denúncias encerradas, 3 avisos neutros, 1 aviso ao autor, 3 logs ✅ |
| D4 | Decidir de novo | `PT409 stale` ✅ |
| D5–D6 | Violação sem motivo; violação com motivo | `reason_required`; `policy_violation` com **1** aviso ao autor (era 2) e log `reject` ✅ |
| R1–R2 | Reabrir e reverter a violação; reabrir de novo | Volta a `active` com 2 denúncias abertas; `PT409` ✅ |
| D7 | Editar com texto desatualizado | `PT409 stale` ✅ |
| B16 | Aprovar em Pedidos depois de uma violação decidida por denúncia | A denúncia é reaberta pela coluna `decision` ✅ |
| D8, R3 | Retirar participação e reverter | Retirada + aviso ao autor; restaurada ✅ |
| D9–D10, R4 | Suspender com 500 dias; com 3 dias; reverter | `invalid_days`; suspensa, e só a denúncia de "Pessoa" é encerrada (a de "Remetente" segue aberta); suspensão retirada ✅ |
| X1–X2 | Excluir denúncia como moderador; como admin | `42501`; ok ✅ |
| V1–V2 | **210 alvos** com denúncia aberta; limite acima de 100 | Total 210, páginas de 50, a última com 10; `22023` ✅ |
| B13 | Nenhuma denúncia fora de `open`, `resolved` e `dismissed`; padrão `open` | ✅ |

### 7.2 Testes de tela com login (18/11/2026)

**Contas:**
- moderadora `adm-teste-moderador@amens.test`;
- autora `adm-teste-autor@amens.test`;
- denunciantes `adm-teste-denunciante1@` e `adm-teste-denunciante2@amens.test`, criadas para este teste.

As senhas ficam fora do repositório.

**Dados:** um pedido e uma participação criados **pela API real**, como o app faria, e 6 denúncias também pela API. Depois do teste, tudo foi apagado com `limpa_adm04.sql`, e produção voltou a 28 pedidos e 1 denúncia (a real, de maio).

| Caso | Roteiro | Observado | Estado |
|---|---|---|---|
| T01 · Tipos | Denúncia de pedido, pessoa, remetente e participação, todas pela API | Os 4 cartões mostram o tipo, o alvo (texto, nome, cidade, situação), quantas pessoas denunciaram e os motivos, inclusive "Outro" com o motivo informado | **Aprovado** (pela API; os diálogos do app são da APP05) |
| T02 · Resolução | Sem fundamento, reabrir, violação, resolver, retirar participação, suspender e reverter | Cada decisão encerra todas as denúncias do alvo, avisa cada pessoa uma vez e o alvo fica coerente | **Aprovado** |
| T03 · Escalada | 3 pessoas → "Em revisão"; sem fundamento → volta a "Ativo" | Ver acima; repetir a decisão dá `PT409` | **Aprovado** |
| T03 · Corrida | Chega uma denúncia nova com o diálogo de suspensão aberto | Erro "Chegaram novas denúncias… A lista foi atualizada"; o diálogo passa a dizer "As 2 denúncias"; a nova tentativa no mesmo diálogo funciona | **Aprovado** |
| T04 · Volume e erro | Bateria V1 com 210 alvos; erro de consulta mostra "Não foi possível carregar…" com "Tentar novamente" | Paginação no servidor, sem falso vazio | **Aprovado** no banco; erro de rede na tela **Não executado** |
| T05 · Privacidade | O painel não mostra quem denunciou ("Pessoa 1, 2…"); o denunciante recebe aviso neutro | Avisos "Analisamos sua denúncia…" (`f4_14`) | **Parcial**: o bloqueio das colunas aguarda a migration `020000` |
| U01 · Tamanhos | 1440, 390, 320 e 844 × 390 px, temas atual e legado | Sem corte; ações visíveis sem hover | **Aprovado** visualmente |

### 7.3 Defeitos encontrados pelos testes de tela e corrigidos

1. **"1 denúncia aberta é encerrada como resolvidas":** a concordância foi corrigida.
2. **A corrida deixava o diálogo preso.** Depois do erro, a nova tentativa enviava o conjunto antigo e falhava de novo. Agora a lista se atualiza sozinha, e o diálogo aberto passa a usar os dados atuais do alvo.
3. **A revogação de colunas quebraria o painel antigo em produção:** foi separada na migration `020000`, a aplicar depois do deploy.

## 8. Pendente

| Item | Estado |
|---|---|
| Aplicar `20261118020000_adm04_privacidade_colunas.sql` depois do deploy do front | Pendente (T05 completo) |
| Diálogos de denúncia de pessoa, mensagem e participação **não estão ligados** em nenhuma tela do app (só o de pedido, em `/pray`) | Fora do escopo: APP05-F04. O painel já trata os 4 tipos |
| Excluir denúncia como admin na tela | Não executado na tela (sem login de admin por e-mail); coberto pela bateria (X2) |
| U02–U06 (zoom 200%, teclado completo, menos movimento) | Não executado |
| Revisão do colega | Pendente |
