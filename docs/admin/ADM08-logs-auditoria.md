# ADM08 — Logs de moderação e auditoria

Rota: `/admin/logs` (só admin, como na ADM00). Pacote: `revisao/admin/ADM08-logs-e-auditoria.md` (revisão de 15/11/2026 sobre `0063610`).

## 1. Decisões aprovadas (23/11/2026)

| Tema | Decisão | Alternativa descartada |
|---|---|---|
| Layout | **Tabela com detalhe expansível** no desktop e cartões no celular | Linha do tempo por dia |
| Texto íntimo (U03) | **Escondido, sob demanda.** O texto anterior de um pedido editado (ADM03) fica fora da lista e só aparece com "Mostrar texto anterior" | Nunca mostrar |
| Apoiadores | **Na mesma trilha, sem valores:** tipo "Apoiadores", "Reconhecimento ativado/desativado" | Deixar só na ADM10 |
| Auditoria (F01) | Log obrigatório **na mesma transação** do comando, como recomendado no pacote. As ADM02–ADM07 já gravam assim | Fila assíncrona com reparo |

## 2. Problemas encontrados (`0063610` e produção em 23/11)

1. **Lista cortada (T03).** A tela parava em 500 registros e a busca era feita no navegador sobre esses 500. Um log antigo simplesmente não aparecia.
2. **Alvo ilegível.** O alvo vinha como ID truncado ("a1b2c3d4…"), exceto pessoa e igreja. Pedido, denúncia, participação e feedback não tinham nome, e alvo removido não era sinalizado.
3. **E-mails de todos.** Para mostrar o ator, a tela baixava o e-mail de todos os usuários (`get_users_admin`).
4. **Detalhes invisíveis.** `metadata` (de/para, dias de suspensão, decisão, lote) nunca aparecia.
5. **Texto íntimo no registro.** A ADM03 guarda o título e o texto anteriores ao editar um pedido. Uma tela que mostrasse `metadata` sem cuidado exporia isso (U03).
6. **Data forjável (F02).** A policy já forçava `moderator_id = auth.uid()` (ADM00), mas quem grava pela API ainda escolhia o `created_at`, podendo **antedatar** um registro.
7. **Ações com rótulo cru.** Ações novas (`auto_escalate`, `reopen_report`, mesclagem, configurações…) apareciam com o nome técnico em parte dos filtros; "Report" e "Role" sem tradução.
8. **Erro e vazio iguais (U02).** Erro de carregamento e "nenhum resultado" eram a mesma mensagem, sem "Tentar novamente".
9. **Apoiadores fora da trilha.** A auditoria de reconhecimento (`supporter_recognition_audit`) não aparecia em lugar nenhum do painel.

Já estavam corretos e foram **comprovados**:
- registro não pode ser alterado nem apagado pela API (não há policy de UPDATE/DELETE);
- as ADM02–ADM07 gravam o log na mesma transação da ação.

## 3. Solução

**Banco** (`20261123000000_adm08_logs.sql`, **aplicada em produção em 23/11**; funciona com o painel publicado):
- **Trigger `moderation_logs_before_insert`:** pela API, o ator é quem está logado e a data é a do servidor. Os comandos do servidor não são afetados.
- **Permissões:** `UPDATE`/`DELETE`/`TRUNCATE` revogados de `anon` e `authenticated`; `anon` não lê nem grava.
- **`admin_list_logs(tipo, ação, quem, busca, de, até, início, limite)`**, só admin:
  - paginação no servidor, sem corte;
  - período em horário de Brasília;
  - "quem fez" pode ser "Automático";
  - busca por quem fez, alvo, motivo ou ID;
  - **alvo legível**: pedido (título), pessoa, igreja (nome · cidade/UF), denúncia (motivo), participação, feedback, configuração e lote de importação, com "(removido)" ou "Não existe mais";
  - inclui a auditoria de apoiadores;
  - `details` sem `previous_title`/`previous_content`, só a indicação `has_previous_text`.
- **`admin_log_actors()`:** quem já agiu, com a contagem, para o filtro.
- **`admin_log_previous_text(id)`:** o texto anterior, sob demanda.

**Front** (`AdminLogs.tsx`):
- **Filtros:** tipo, ação (em ordem alfabética), quem fez, período De/Até e busca, com "Limpar filtros".
- **Tabela:** quando, quem fez (com e-mail), ação, alvo (tipo + nome) e motivo.
- **Detalhe expansível:**
  - motivo completo;
  - de/para traduzidos (situações, decisões, origem);
  - ID do alvo com botão de copiar;
  - texto anterior escondido, com "Mostrar texto anterior".
- **Estados separados:** erro (com "Tentar novamente" e a última consulta mantida), "Nenhum registro com esses filtros." e período inválido.
- **Celular:** cartões com "Ver detalhes".

## 4. Revisão de conteúdo

| Texto | Veredito |
|---|---|
| "Quem fez o quê, sobre qual alvo e com qual motivo. Os registros não podem ser alterados nem apagados pelo painel. Horários de Brasília." | **Ajustado.** O antigo prometia "Auditoria completa" e mostrava só 500 registros; agora explica a garantia e o fuso |
| "Moderador / Admin", "Role atribuída", "Report resolvido", "Deletado" | **Trocados** por "Quem fez", "Papel alterado", "Denúncia resolvida" e "Removido" |
| "Automático (sistema)" / "Sem registro de quem fez" | Novo: diferencia ação automática de registro sem ator |
| "Texto anterior guardado, escondido por ser conteúdo do usuário." / "Texto anterior à edição (não compartilhe):" | Novo (U03) |
| "Período inválido: a data final é anterior à inicial. Corrija as datas para ver os registros." | Novo (U02) |
| "Não foi possível carregar os logs; abaixo está a última consulta que funcionou." | Novo (U02) |

## 5. Artefatos

| Artefato | Destino |
|---|---|
| `supabase/migrations/20261123000000_adm08_logs.sql` | **Aplicada** em produção (23/11). É idempotente; sem pós-deploy |
| `docs/admin/testes/bateria_adm08_logs.sql` | Bateria (transação desfeita) |
| `docs/admin/testes/tela/fase8_logs.cjs`, `semeia_adm08.sql`, `limpa_adm08.sql` | Testes de tela |

## 6. Testes

### 6.1 Bateria em produção — 25/25 (23/11/2026)

Rodada junto com a migration e depois dela aplicada. As baterias da ADM05 (65/65) e da ADM07 (32/32) foram repetidas sem regressão.

| Grupo | Casos | Cobre |
|---|---|---|
| Acesso | P1–P4 | Moderador, usuário e visitante sem a consulta; visitante não lê a tabela; usuário vê 0 linhas |
| Integridade | I1–I4 | Moderador grava com outro ator e data de 2020: fica com ele mesmo e a data de agora. Alterar dá `42501`. Apagar (até admin) dá `42501` e o registro continua. Usuário comum não grava |
| Atomicidade (T02) | A1–A2 | Com o log forçado a falhar, `admin_suspend_user` dá erro **e a suspensão não acontece**; sem a falha, ação e log entram juntos |
| Lista | L1–L9 | Alvo legível; texto íntimo fora da resposta; texto anterior só sob demanda e só para admin; alvo removido sinalizado; busca pelo nome do alvo; filtros combinados; "Automático"; período futuro e período invertido |
| Volume (T03) | V1 | 600 registros, página na posição 550 |
| Apoiadores | S1–S2 | Reconhecimento na trilha, com ator e alvo, sem valores; lista de quem agiu |

### 6.2 Testes de tela com login (23/11/2026)

Feitos com `fase8_logs.cjs` contra produção, com o app local (ADM00–ADM08 integradas).
- **Conta admin temporária:** papel retirado ao final.
- **Ações reais:** suspender e retirar suspensão.
- **Dados de teste:** apagados por `limpa_adm08.sql`.

| Caso | Observado | Estado |
|---|---|---|
| T01 · Trilha | Suspensão e retirada aparecem com quem fez, alvo pelo nome, motivo e detalhe (dias, até quando) | **Aprovado** |
| T02 · Falha obrigatória | Comprovado na bateria (A1): o log falha e a ação não acontece | **Aprovado** |
| T03 · Volume e filtros | 160+ registros paginados de 50 em 50; "Automático"; período; busca; "Nenhum registro com esses filtros." | **Aprovado** |
| T04 · Integridade e acesso | Pela API, o moderador gravou um log como se fosse o admin, com data de 2020, e ele apareceu **como do moderador, com a hora real**. Apagar dá 403. A consulta e a tela recusam o moderador | **Aprovado** |
| U03 · Texto íntimo | O detalhe diz "Texto anterior guardado…"; o texto só aparece com o clique | **Aprovado** |
| U01 · Tamanhos | 1440, 390, 320 e 844 × 390 px nos temas atual e legado | **Aprovado** visualmente |

**Defeitos encontrados no teste de tela e corrigidos:**
1. **Período invertido** aparecia como "Nenhum registro com esses filtros.". Agora mostra o aviso de período inválido.
2. **Em 320 px**, o campo "Até" era cortado. As datas agora ficam empilhadas.

## 7. Pendente

- [ ] **ADM09:** a Corrente ainda grava log direto pelo navegador. Depois que ela passar a usar um comando do servidor, revogar o `INSERT` direto em `moderation_logs`.
- [ ] Atualizar `context-app-features` (PR #24).
- [ ] Revisão do colega.
