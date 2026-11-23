# ADM06 — Feedback e respostas ao usuário

Rota: `/admin/feedback` (moderador e admin, como na ADM00). Pacote: `revisao/admin/ADM06-feedback-e-respostas.md` (revisão de 15/11/2026 sobre `0063610`).

## 1. Decisões aprovadas (22/11/2026)

| Tema | Decisão | Alternativa descartada |
|---|---|---|
| Gravação da resposta (F01/F02) | **Comando único no servidor:** aviso ao usuário, histórico, situação e log juntos, ou nada. Conflito (`PT409`) quando outra pessoa respondeu antes | Duas gravações no navegador com reparo |
| Responder de novo | **Guardar todas:** cada resposta vira item do histórico e aviso; "Responder de novo" mostra as anteriores | Uma resposta só |
| Layout (U01) | **Cartão por feedback**, mesmo padrão da ADM04 | Tabela com painel lateral |
| E-mail (F03) | Segue a **S6 da ADM00** (moderador vê e-mails). A lista traz só o e-mail de quem enviou cada feedback | — |

## 2. Problemas encontrados (`0063610` e produção em 22/11)

1. **Sucesso falso (C04).** A resposta fazia dois `await` sem conferir `error` (o SDK não lança exceção). Aparecia "Resposta enviada como notificação." mesmo se o aviso ou a marcação falhassem.
2. **Aviso duplicado.** Se o aviso entrava e a marcação falhava, a nova tentativa mandava outro aviso. Dois moderadores ao mesmo tempo também geravam dois avisos.
3. **Resposta apagada.** Responder de novo sobrescrevia `reply_text`: a resposta anterior sumia do painel, embora o usuário já a tivesse recebido.
4. **Sem log.** Nenhuma resposta ou arquivamento ia para `moderation_logs`.
5. **Envio forjável.** Quem envia podia gravar `status`, `reply_text` e `replied_by`, por exemplo criar um feedback já "respondido por" um moderador, e não havia limite de envios. Conta suspensa também enviava.
6. **E-mails demais.** Para mostrar 3 feedbacks, o painel baixava o e-mail de **todos** os usuários (`get_users_admin`) e até 1.000 perfis.
7. **Cortes.** A lista parava em 300, o filtro de categoria era feito no navegador sobre esses 300, e a mensagem era cortada em 3 linhas sem como ler o resto.
8. **Menu sem nome.** As ações ficavam num menu de ícone sem nome acessível, e "Marcar como não lido" aparecia até para os respondidos.
9. **Sessão em cache global.** A consulta `session` usava chave global com `staleTime: Infinity`; ela saiu da tela.
10. **Feedback fora do app (fora do escopo, B22).** O `FeedbackDialog` (APP18) **não está montado em nenhuma tela**, então o usuário não tem por onde enviar feedback.

## 3. Solução

**Banco** (`20261122020000_adm06_feedback.sql`, **aplicada em produção em 22/11**):
- **Histórico:** tabela `user_feedback_replies` (quem, quando, texto, aviso enviado). As respostas antigas foram migradas, e `reply_text` continua com a última.
- **Envio pelo app:** o trigger `user_feedback_before_write` força `unread`, sem campos de resposta, e o autor é quem está logado. Limite de 10 por hora. Conta suspensa ou removida não envia.
- **Funções** (moderador e admin):

| Função | O que faz |
|---|---|
| `admin_list_feedback(aba, categoria, busca, início, limite)` | Paginada no servidor, com contagem por aba; nome e e-mail só de quem enviou; histórico de respostas; busca escapada no texto, no nome, no e-mail e nas respostas |
| `admin_set_feedback_status(id, situação, situação esperada)` | Lido, não lido, arquivado. `PT409` se outra pessoa mudou antes. Arquivar e desarquivar vão para o log |
| `admin_reply_feedback(id, texto, respostas esperadas)` | Aviso (`type = feedback_reply`), histórico, situação "Respondido" e log na mesma transação. `PT409` se a contagem de respostas mudou (duplo clique, outra aba, outra pessoa). Sem conta de destino: recusa com motivo |

**Depois do deploy** (`20261122030000`, **NÃO aplicada**): tira a escrita direta em `user_feedback`, que o painel publicado ainda usa.

**Front:**
- **`AdminFeedback.tsx`:**
  - cartões com categoria, situação, data, quem enviou (nome e e-mail), texto completo ("Ver tudo" acima de 400 caracteres), histórico e botões visíveis;
  - no diálogo de resposta: "Para:" com destinatário, mensagem original inteira, respostas anteriores, contador de caracteres e "Ver como o usuário vai receber";
  - em erro, o texto continua no diálogo. Em conflito, ele mostra a resposta nova e pede "Li a resposta nova; continuar".
- **`AdminLogs.tsx`:** alvo "Feedback" e ações `reply`, `archive` e `unarchive`.

## 4. Revisão de conteúdo

| Texto | Onde | Veredito |
|---|---|---|
| "A equipe do Améns respondeu ao seu feedback "{começo do texto}": {resposta}" | Aviso ao usuário em Mensagens | **Ajustado.** O antigo era "Em resposta ao seu feedback (Sugestão): …". Agora diz quem respondeu e não mostra a categoria interna ("Bug") |
| "Resposta enviada. O usuário vai vê-la em Mensagens." | Sucesso | **Ajustado.** O antigo "Resposta enviada como notificação." usava termo técnico e aparecia mesmo quando falhava |
| "Outra pessoa respondeu este feedback enquanto você escrevia. Seu texto foi mantido: confira a resposta dela antes de enviar." | Conflito | Novo |
| "Quem enviou este feedback não tem mais conta. Não há para quem responder." | Sem destinatário | Novo. Antes o botão sumia sem explicação |
| "Você já enviou vários feedbacks na última hora. Tente de novo mais tarde." | App (limite) | Novo |
| "Ninguém da equipe marcou como lido nem respondeu ainda." e as outras ajudas de aba | Abas | Novos |
| "Sem conta (a conta foi excluída)" | Cartão | **Ajustado.** O antigo "Anônimo" não era verdade: o feedback sempre tem autor, e o vínculo some quando a conta é excluída |
| "Problema / Bug" | Categoria | Igual ao rótulo do app (antes "Bug") |

## 5. Artefatos

| Artefato | Destino |
|---|---|
| `supabase/migrations/20261122020000_adm06_feedback.sql` | **Aplicada** em produção (22/11). É idempotente |
| `supabase/migrations/20261122030000_adm06_feedback_escrita_so_por_funcoes.sql` | **Pendente:** aplicar logo depois do deploy |
| `docs/admin/testes/bateria_adm06_feedback.sql` | Bateria (transação desfeita) |
| `docs/admin/testes/tela/fase6_feedback.cjs`, `limpa_adm06.sql` | Testes de tela (moderador) |

## 6. Testes

### 6.1 Bateria em produção — 30/30 (22/11/2026)

Rodada junto com a migration (transação desfeita) e depois dela aplicada. A ADM05 (65/65) foi repetida sem regressão.

| Grupo | Casos | Cobre |
|---|---|---|
| Migração | B1 | Toda resposta antiga está no histórico |
| Envio | E1–E6 | Envio forjado ("respondido", `reply_text`, outro `user_id`) vira "Não lido" do próprio autor; texto curto recusado; usuário não altera nem lê a fila; 11º envio na hora recusado; conta suspensa recusada |
| Permissões | P1–P4 | Usuário comum e visitante sem as funções do painel; histórico fechado para usuário |
| Resposta | R1–R6 | Aviso com o texto certo e tipo `feedback_reply`; situação, autor e log; **repetir com a contagem velha recusa sem duplicar o aviso**; segunda resposta (admin) vai ao histórico; vazia recusada; sem destinatário; feedback inexistente |
| Situação | S1–S5 | Lido; repetir dá `PT409`; arquivar e desarquivar com log; "Respondido" só pelo comando |
| Listagem | L1–L5, V1 | Contagem por aba; e-mail de quem enviou; histórico; categoria + busca nas respostas; `%` literal; aba inválida; **320 feedbacks, página na posição 300** |

### 6.2 Testes de tela com login (22/11/2026)

Feitos com `fase6_feedback.cjs` contra produção, com o app local na porta 8080 (ADM00–ADM06 integradas).
- **Contas:** `adm-teste-moderador`, `adm-teste-autor` e `adm-teste-denunciante1`.
- **Envio:** feito pela API com a conta do usuário, porque o diálogo do app não está montado (B22).
- **Dados:** apagados por `limpa_adm06.sql`. As capturas estão em `docs/admin/evidencias/ADM06/`.

| Caso | Observado | Estado |
|---|---|---|
| T01 · Ciclo A → equipe → A | Feedback enviado como "respondido" chega como **Não lido**; o moderador responde; o usuário vê "A equipe do Améns respondeu ao seu feedback…" em Mensagens. O usuário não lê a fila (`[]`) | **Aprovado** |
| T02 · Falhas | Outra sessão responde com o diálogo aberto: erro claro, texto mantido, resposta nova aparece; "Li a resposta nova; continuar" e o envio funciona. No banco, exatamente 3 respostas, sem duplicadas | **Aprovado** |
| T03 · Papéis | Moderador responde e vê só o e-mail de quem enviou; usuário comum sem acesso (bateria P1–P4) | **Aprovado** |
| T04 · Estado e volume | Lido, arquivar e desarquivar com aviso; "Ver tudo" no texto longo; 320 itens paginados (bateria V1) | **Aprovado** |
| U01–U03 · Tamanhos | 1440, 390, 320 e 844 × 390 px nos temas atual e legado; diálogo de resposta no celular | **Aprovado** visualmente |

**Defeito encontrado no teste de tela e corrigido:** clicar em "Li a resposta nova; continuar" **já enviava a resposta**. O React reaproveitava o mesmo `<button>`, que virava `submit` durante o clique. Os dois botões agora têm `key` próprias, e o teste confirma que só o "Enviar resposta" envia.

## 7. Pendente

- [ ] Aplicar `20261122030000` logo depois do deploy.
- [ ] Atualizar `context-app-features` (PR #24) com o contrato de feedback.
- [ ] Revisão do colega.

**Fora do escopo** (`docs/backlog/ADM06.md`): B22, diálogo de feedback não montado no app; B23, o usuário não vê o histórico dos próprios feedbacks.
