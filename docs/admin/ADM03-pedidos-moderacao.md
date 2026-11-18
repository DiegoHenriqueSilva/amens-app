# ADM03 — Pedidos de oração e moderação

Branch: `erickyamanaka/fix/adm03-pedidos-moderacao`, montada sobre a ADM02 (`erickyamanaka/fix/adm02-usuarios`) para reaproveitar `AdminActionDialog` e `adminRpc`.

Estado: **Em revisão**. O banco foi aplicado e testado em produção (**34/34**). Os testes de tela com moderador, lote, corrida e ciclo pelo app foram executados em 18/11/2026 (seção 5.1). Faltam U02–U06 e a revisão do colega (seção 6).

## 1. Decisões aprovadas (17/11/2026)

- **Seleção em lote:** o pacote citava "ações em lote existentes", mas a tela **não tinha** seleção nem lote em `0063610`. O time decidiu **criar**:
  - caixas de seleção e barra "N selecionados";
  - confirmação com quantidade e consequência;
  - resultado por item.
- **Aviso ao autor em toda decisão:** aprovado, em revisão, violação, removido, restaurado e editado. Repetir a mesma decisão não gera aviso duplicado, porque o servidor recusa com `no_change`.
- **Motivo:** obrigatório (≥ 3 caracteres) em revisão, violação, remoção, restauração e edição. Em Aprovar é opcional, mas, se informado, precisa ter 3 ou mais caracteres.
- **Layout:** opção A, a tabela atual melhorada, consistente com a tela de Usuários. Abaixo de 768 px vira cartões empilhados.
- **Solução:** comandos de moderação no servidor com resultado por item, a recomendada no pacote. A alternativa, passos separados no cliente com recuperação, foi descartada porque não garante consistência entre decisão, log e aviso.

## 2. Problemas encontrados (`0063610`) e correções

| # | Problema | Correção | Item |
|---|---|---|---|
| 1 | Decisão, log, reabertura de reports e aviso eram chamadas separadas no cliente. A falha do log era ignorada (`console.warn`) e a ação aparecia como sucesso | `admin_moderate_prayers`: tudo na mesma transação do item | F01, T04 |
| 2 | Aprovar e "Colocar em revisão" não avisavam o autor | Aviso `prayer_approved` / `prayer_in_review` (e `prayer_restored`) | F01 |
| 3 | Todas as listas paravam em **300** sem aviso; a busca filtrava só esses 300 no navegador | `admin_list_prayers`: paginação no servidor (50 por página), total real por aba e busca no servidor | F02, T01 |
| 4 | A aba "Banidos" juntava duas consultas de até 300 e **ignorava o erro** de cada uma; a lista de contas desativadas parava em 500 | Calculada no banco numa consulta só, com erro propagado | F02 |
| 5 | Erro de carregamento aparecia como "Nenhum pedido encontrado" | Erro distinto de vazio, com "Tentar novamente" | G03 |
| 6 | Aprovar, violação, revisão, remover e restaurar agiam **com um clique** e sem motivo | Confirmação com o alvo, a consequência e o motivo | U01 |
| 7 | Dois moderadores podiam decidir o mesmo pedido sem perceber | O servidor compara o estado visto com o atual e recusa com `stale` ("alterado por outra pessoa") | F03, T03 |
| 8 | Status `banned` só aparecia em "Todos" | Entra na aba "Banidos" | F02 |
| 9 | Edição sem limite, sem detectar edição simultânea, com o aviso enviado pelo cliente | `admin_edit_prayer`: 1–1000 caracteres, título ≤ 150, `stale`; log guarda o texto anterior | F01 |
| 10 | "Colocar em revisão" era registrado no log como `reject` | Nova ação `send_to_review` (rótulo incluído na tela de Logs) | ADM08 |
| 11 | Explicação das abas só aparecia no hover; "Ver mais" sem `aria-expanded`; botão de ações sem nome | Texto da aba visível, `aria-expanded`/`aria-controls`, `aria-label` com o título do pedido | U02 |
| 12 | A prioridade da fila dependia só da cor | "Pendentes" em ordem de antiguidade, com "Na fila há X" e "N denúncias em aberto" em texto | U02 |
| 13 | Tabela de 280 px fixos e `p-6` no celular | Cartões empilhados abaixo de 768 px; abas com rolagem | U01 |

**Comportamento preservado:** ao **aprovar**, os reports encerrados por uma decisão restritiva (notas com "editado", "banido" ou "violação") voltam a `open`, e o aviso "editado, aguarda aprovação" é apagado, como em `0063610`. A regra depende do texto da nota, o que é frágil. Fica como contrato a formalizar na ADM04.

## 3. Contrato dos comandos

| Comando | Quem | Entrada | Saída |
|---|---|---|---|
| `admin_list_prayers(p_tab, p_search, p_offset, p_limit)` | mod/admin | aba `all/pending/active/completed/banned_users`, busca, página (limite 1–100) | `{ total, rows[], counts{} }`. Cada linha traz `author_removed` e `open_reports` |
| `admin_moderate_prayers(p_items, p_action, p_reason)` | mod/admin | `p_items` = `[{id, status, deleted}]` (estado visto, até 100); `p_action` = `approve/review/violation/remove/restore` | `[{id, ok}]` ou `[{id, ok:false, code, hint, message}]` |
| `admin_edit_prayer(p_id, p_title, p_content, p_reason, p_expected_content)` | mod/admin | texto novo + texto visto | `void` ou erro |

Valores de `hint`: `reason_required`, `too_many`, `empty`, `not_found`, `stale`, `no_change`, `removed`, `invalid_content`, `invalid_title`.

| Ação | Status final | Log (`moderation_logs.action`) | Aviso ao autor |
|---|---|---|---|
| Aprovar | `active` | `approve` | `prayer_approved` (novo) |
| Colocar em revisão | `pending_review` | `send_to_review` (novo) | `prayer_in_review` (novo) |
| Marcar violação | `policy_violation` | `reject` (mantido por compatibilidade com ADM08) | `prayer_policy_violation` (trigger existente) |
| Remover | `deleted_at` preenchido | `soft_delete` | `prayer_moderated` (trigger existente) |
| Restaurar | `deleted_at` nulo | `restore` | `prayer_restored` (novo) |
| Editar | `pending_review` | `edit_content` (+ texto anterior) | `prayer_edit_mod` (mensagem revisada) |

O `metadata` de todos os logs inclui `from_status`, `to_status`, `was_deleted` e `batch_size`.

## 4. Artefatos

- `supabase/migrations/20261117000000_adm03_prayer_moderation_commands.sql`: **aplicada em produção (`fszltwvhbdasqoznnors`) em 17/11/2026.** Rollback em `docs/admin/sql/adm03_rollback.sql`.
- `src/components/admin/AdminPrayers.tsx` (reescrito).
- `src/components/admin/AdminActionDialog.tsx`: novo `reasonOptional`.
- `src/components/admin/AdminLogs.tsx`: rótulo `send_to_review`.
- `supabase/migrations/20261118000000_adm03_edit_stale_sem_repeticao.sql`: **aplicada em produção em 18/11/2026** (correção da seção 5.1).
- Bateria: `docs/admin/testes/bateria_adm03_pedidos.sql`.
- Evidências dos testes de tela: `docs/admin/evidencias/ADM03/testes-de-tela/`.

## 5. Testes em produção — 34/34 (17/11/2026)

Tudo rodou numa transação desfeita, com 3 pedidos sintéticos. Uma conta comum recebeu o papel de moderador só durante o teste. Depois foi conferido que não ficou nenhum pedido nem log de teste.

| ID | Teste | Obtido |
|---|---|---|
| L1, M1, E0 | Usuário comum chama listar, decidir e editar | `42501` nos três ✅ |
| L2 | Total de "Pendentes" = contagem direta no banco | diferença 0 ✅ |
| L3 | Paginação devolve só o limite pedido | 2 de 2 ✅ |
| L4 | Busca com `%` e `_` literais | 1 resultado ✅ |
| L5 | Limite de página acima de 100 | `22023` ✅ |
| M2 | Violação sem motivo | `reason_required` ✅ |
| M3 | Lote com 101 itens | `too_many` ✅ |
| M4 | **Lote com falha parcial:** item válido + estado visto desatualizado + inexistente | `ok, stale, not_found`; o 2º pedido continuou `active` ✅ |
| M5 | Violação gera 1 aviso ao autor | 1 ✅ |
| M6–M7 | Aprovar sem motivo; aprovar de novo | ok, depois `no_change`; continua 1 aviso só ✅ |
| M8 | Revisão com motivo → aviso | 1 ✅ |
| M9 | Remover → avisos antigos apagados e aviso de remoção | só `prayer_moderated` ✅ |
| M10 | Aprovar pedido removido | `removed` ✅ |
| M11 | Restaurar → aviso | 1 ✅ |
| E1 | Edição sem motivo | `reason_required` ✅ |
| E2 | **Edição simultânea:** texto visto ≠ atual | `PT409 stale` ✅ (era `40001`, ver 5.1) |
| E3 | Edição válida → `pending_review` + 1 aviso | ✅ |
| E4 | Conteúdo com 1001 caracteres | `invalid_content` ✅ |
| A1–A2 | Só sucessos geram log, com ator e `from_status` | 6 de 6 ✅ |
| A3 | Motivo gravado | ✅ |
| A4 | Log da edição guarda o texto anterior | ✅ |
| M12 | Admin também decide | ok ✅ |

Mapeamento para o pacote:
- **T01:** L2–L5.
- **T03:** M4, E2.
- **T04:** A1–A4, M5–M11.
- **T05:** L1, M1, E0, M12.
- **T02 (ciclo pelo app):** seção 5.1.

### 5.1 Testes de tela com login — 18/11/2026

**Ambiente:** app local (porta 8080) com ADM00 + ADM01 + ADM03 integrados, ligado ao Supabase de produção. Chrome headless (Playwright). Os roteiros estão em `docs/admin/testes/tela/`.

**Contas de teste** criadas em produção para isso, com login por e-mail e senha:
- `adm-teste-moderador@amens.test`, papel moderador;
- `adm-teste-autor@amens.test`, conta comum.

As senhas **não estão no repositório**; peça ao responsável. A conta `teste-moderador@amens.test`, criada por outra pessoa em 16/11, não foi usada.

**Dados:** 6 pedidos sintéticos "[TESTE ADM03] Lote N", criados como `pending_review` para não aparecerem na comunidade, mais 1 pedido enviado pelo app no ciclo. Ao final foram **apagados**, com avisos e logs. Produção voltou a 28 pedidos, sem resíduo.

| Caso | Roteiro | Observado | Estado |
|---|---|---|---|
| T05 · Moderador na tela | O moderador lista, filtra, seleciona e decide; abre o menu do portal | Só Pedidos, Reports, Igrejas e Feedback no menu; todas as ações funcionam | **Aprovado** |
| T03 · Lote parcial e corrida | A seleciona os Lotes 1–4; **B, em outra sessão,** marca violação no Lote 2; A aplica "Marcar violação" nos 4 | "3 de 4 pedidos foram atualizados"; o Lote 2 mostra "Este pedido foi alterado por outra pessoa"; 3 logs e 3 avisos novos, sem duplicar | **Aprovado** |
| T03 · Motivo obrigatório no lote | Confirmar sem motivo | O diálogo não fecha | **Aprovado** |
| T03 · Edição simultânea | A abre a edição do Lote 5; B edita e salva; A salva | B: 204. A: **409 em 0,36 s**, erro no diálogo e o texto de A preservado | **Aprovado** após correção 2 |
| T02 · Ciclo pelo app | O autor envia por `/submit`; o moderador coloca em revisão → aprova → remove | Comunidade (visitante): visível → oculto → visível → oculto. O autor recebe em **Mensagens** um aviso a cada decisão, com os textos da seção 7 | **Aprovado** |

**Defeitos encontrados pelos testes de tela e corrigidos:**

1. **A nova tentativa do lote falhava para sempre.** A seleção guardava a cópia do pedido no momento do clique. Depois de um lote parcial, o item que falhou continuava selecionado com a situação antiga, mesmo que já tivesse saído da aba. A barra oferecia ações inválidas, e cada nova tentativa voltava como "alterado por outra pessoa". **Correção** em `AdminPrayers.tsx`:
   - quando a lista é atualizada, a seleção passa a usar a situação atual;
   - pedidos que saíram da aba deixam de estar selecionados;
   - a seleção vale só para a página visível;
   - o texto do resultado parcial foi ajustado (seção 7).
2. **Edição com conflito travava a chamada, com uma conexão do banco presa em loop.** O conflito usava o SQLSTATE `40001` (serialization_failure), e o **PostgREST repete automaticamente** transações que falham com esse código. Como o pedido continuava alterado, a repetição nunca terminava: a tela ficava em "Salvando…" e uma conexão de produção seguia ocupada repetindo a função. A bateria SQL não pegou porque chama a função direto, sem o PostgREST.
   - **Correção:** o código passou a ser `PT409`, que o PostgREST devolve como HTTP 409 sem repetir. A migration `20261118000000` foi aplicada em 18/11.
   - **Conferência:** as conexões em loop sumiram de `pg_stat_activity` logo após a troca. Cada repetição era desfeita, então nada foi gravado.
   - **`admin_moderate_prayers`:** não muda, porque captura o `40001` por item dentro da função.
   - **Lição:** nenhum comando chamado pelo app deve deixar escapar `40001` ou `40P01`.

## 6. Pendente

| Caso | O que falta | Estado |
|---|---|---|
| T02 · Visão de intercessor logado | A comunidade foi conferida como visitante (consulta pública); falta uma 2ª conta comum vendo o feed de orações | Parcial |
| U02–U06 | Zoom 200%, teclado completo, menos movimento | Não executado |
| F04 | Integração com ADM04 (reports) e a projeção pública APP03/APP04 | Parcial: ver backlog B13–B15 |

## 7. Revisão de conteúdo (regra content-review-enforcement)

| Texto (visto pelo autor) | Veredito |
|---|---|
| "Seu pedido de oração foi revisado e está visível para a comunidade, que poderá rezar com você." | Aprovado: acolhedor, sem promessa espiritual |
| "Seu pedido de oração está em revisão pela moderação. Enquanto isso, ele não aparece para a comunidade." | Aprovado: claro sobre a consequência, sem culpa |
| "Seu pedido de oração foi restaurado pela moderação e voltou ao seu histórico." | Aprovado |
| Antigo: "Seu pedido de oração foi editado pelo moderador e aguarda nova aprovação." → "Seu pedido de oração recebeu um ajuste da moderação e passará por uma nova revisão antes de voltar à comunidade." | Ajustado: menos frio, explica o que acontece |
| Avisos de violação e remoção (triggers já existentes) | Fora do escopo (B15) |

| Resultado parcial do lote (painel). Antigo: "Os que falharam continuam selecionados para você tentar de novo." → "A lista já mostra a situação atual: os que falharam e continuam nesta aba seguem selecionados para você revisar." | Ajustado (18/11): o texto antigo prometia uma nova tentativa que, com a seleção desatualizada, sempre falhava |

Os demais textos do painel (consequências, confirmações) são internos e descrevem o efeito real: Aprovado.
