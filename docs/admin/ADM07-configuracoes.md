# ADM07 — Configurações e parâmetros efetivos

Rota: `/admin/settings` (só admin). Pacote: `revisao/admin/ADM07-configuracoes-e-parametros.md` (revisão de 15/11/2026 sobre `0063610`).

## 1. Decisões aprovadas (22/11/2026)

| Tema | Decisão | Alternativa descartada |
|---|---|---|
| Multiplicador de XP (F01) | **Fazer valer:** cada ganho = valor da ação × global × individual (ADM02), nos próximos ganhos | Tirar do painel |
| Níveis (F02) | **Só leitura:** o painel mostra os 20 níveis reais, a cota diária de cada um e quantas pessoas estão nele. A edição sai, por decisão registrada | Tornar editável (mexeria em jornada, perfil e árvore do app) |
| Segurança do XP | **Corrigir nesta entrega** (achado durante a análise) | Backlog |
| Testes de tela | Conta admin temporária, com o papel retirado ao final | — |

## 2. Problemas encontrados (`0063610` e produção em 22/11)

1. **Multiplicador global sem efeito.** Nenhuma função do banco e nenhuma linha do app lê `xp_global_multiplier`. O **multiplicador individual da ADM02** também não valia: `add_xp` ignorava os dois.
2. **Thresholds com sucesso falso.** "Salvar thresholds" gravava `xp_levels_json`, chave que **não existe**. O `update` atingia 0 linhas e a tela dizia "Configuração salva.". Os níveis reais estão fixos em `prayer_level_number` (SQL) e em `CELESTIAL_LEVELS` (app), e as duas listas são iguais.
3. **`JSON.parse` sem proteção.** Um valor malformado derrubava a tela inteira.
4. **Salvar sem conferir.** Com a chave ausente ou sem permissão, o `update` não dá erro, então "Configuração salva." aparecia sem nada gravado. Não havia log, nem proteção contra duas sessões, nem validação: o limite de denúncias aceitava 1, e aí uma pessoa tiraria qualquer pedido do ar.
5. **Falha de segurança no XP.**
   - `add_xp(p_user_id, p_xp_amount, p_action)` era `SECURITY DEFINER` e executável por `anon`. Qualquer pessoa, **mesmo sem login**, dava ou tirava qualquer quantidade de XP de qualquer usuário.
   - A RLS de `user_xp` deixava o usuário fazer `UPDATE` direto no próprio `total_xp`.
   - O XP define o nível, que define a cota diária de orações (2 + nível ÷ 5).
6. **Campo sem consumidor.** `draw_daily_limit` existe em `app_settings`, mas nada o lê (o limite é por nível). Ele não volta ao painel.

## 3. Solução

**Banco** (`20261122040000_adm07_configuracoes_xp.sql`, **aplicada em produção em 22/11**; funciona com o app publicado, porque `add_xp` mantém a assinatura):

**XP seguro:**
- **Valor decidido pelo servidor.** Orar 10, enviar pedido 20, reagir 5, agradecer 10. O valor enviado pelo app é ignorado.
- **Destinatário.** Só a própria conta ganha. "Agradecer" vale só para quem **intercedeu por um pedido de quem agradece**, uma vez por dia para cada intercessor.
- **Tetos diários.** Orar até 20, reagir até 30, enviar até o número de pedidos enviados no dia. Ao atingir o teto, a função não dá erro: só deixa de somar.
- **Sem login, nada.** A escrita direta em `user_xp` saiu.
- **Histórico.** Cada ganho fica em `xp_events` (ação, base, multiplicador, quantidade, quem deu).

**Multiplicador e níveis:**
- `xp_effective_multiplier(usuário)` = global × individual. Um valor inválido no global vale 1, e o resultado fica sempre entre 0,1 e 10.
- `prayer_level_thresholds()` é a fonte única dos níveis no banco; `prayer_level_number` passou a usá-la.

**Funções do painel** (só admin):
- **`admin_get_settings()`:** devolve os valores, o padrão de cada um, quem alterou e quando, quantas pessoas têm multiplicador individual e os níveis com cota e pessoas.
- **`admin_set_setting(chave, valor, versão esperada)`:**
  - multiplicador de 0,1 a 10, com 1 casa decimal (aceita vírgula);
  - limite de 2 a 20 pessoas;
  - chave desconhecida é recusada;
  - `PT409` se outra pessoa salvou antes;
  - log `setting_update` com o valor anterior e o novo.

**Front** (`AdminSettings.tsx`):
- **Um cartão por parâmetro**, cada um com o próprio Salvar.
- **Validação antes de salvar:** botão desativado e motivo em vermelho.
- **Edição pendente:** aviso "Alteração não salva (salvo: X)", com "Desfazer".
- **Contexto:** quem alterou e quando; explicação do efeito e de quando entra em vigor.
- **Níveis só leitura**, com orações por dia e pessoas.
- **Erro de carregamento** com "Tentar novamente".

**Também:**
- `AdminUserDetail.tsx` (ADM02): o texto do multiplicador individual explica que ele se combina com o global.
- `AdminLogs.tsx`: alvo "Configuração" e ação "Configuração alterada".

## 4. Revisão de conteúdo

| Texto | Veredito |
|---|---|
| "Vale para os próximos ganhos; o XP já acumulado não muda. Exemplo: orar vale 10 XP, com 1,5 passa a valer 15 XP." | Novo: diz quando entra em vigor e mostra o efeito |
| "Com 3, quando 3 pessoas diferentes denunciarem o mesmo pedido ativo, ele fica "Em revisão" e o autor é avisado… O mínimo é 2: com 1, uma única pessoa tiraria qualquer pedido do ar." | **Ajustado.** O antigo dizia "número de reports abertos", mas desde a ADM04 conta pessoas diferentes |
| "Só leitura. Os níveis são fixos no app e no banco…" | Novo: substitui "Edite e salve para sobrescrever os valores padrão", que era falso |
| "Thresholds", "minXP", "Threshold de reports" | **Trocados** por "XP mínimo", "Pessoas diferentes" e "Revisão automática por denúncias" |
| "Alteração não salva (salvo: 1,0)." / "Alterado por X em dd/mm/aaaa às hh:mm." | Novos (U02) |
| "Outra pessoa mudou esta configuração enquanto você editava. O valor atual foi carregado: confira antes de salvar." | Novo (T03) |
| "Só a própria conta ganha pontos por esta ação." / "Só dá para agradecer a quem intercedeu por um pedido seu." | Novos. O app hoje só registra esses erros no console (agradecer) |

## 5. Artefatos

| Artefato | Destino |
|---|---|
| `supabase/migrations/20261122040000_adm07_configuracoes_xp.sql` | **Aplicada** em produção (22/11). É idempotente. Não precisa de migration pós-deploy: o painel antigo continua funcionando (ele grava em `app_settings`, que segue com a policy de admin) |
| `docs/admin/testes/bateria_adm07_configuracoes.sql` | Bateria (transação desfeita) |
| `docs/admin/testes/tela/fase7_configuracoes.cjs`, `limpa_adm07.sql` | Testes de tela |

## 6. Testes

### 6.1 Bateria em produção — 32/32 (22/11/2026)

Rodada junto com a migration e depois dela aplicada. As baterias da ADM04 (51/51) e da ADM06 (30/30) foram repetidas sem regressão.

| Grupo | Casos | Cobre |
|---|---|---|
| Níveis | N1 | Fonte única igual à lista do app |
| XP | X1–X10 | Sem login: recusado. Para outra pessoa: recusado. 9.999 pedidos viram 10; −500 vira +5. Ação inválida recusada. Orar para em 20 por dia. Enviar só vale com pedido real no dia, uma vez por pedido. Agradecer só a quem intercedeu, uma vez por dia, e nunca a si mesmo. `UPDATE`/`INSERT` direto em `user_xp` recusados. Ninguém lê o histórico de outra pessoa |
| Parâmetros | S1–S10 | Moderador sem acesso; 20 níveis com cota 2 a 6; valores inválidos (0, 11, 1,25, texto, vazio) recusados; "1,5" aceito com vírgula; limite 1 recusado; conflito `PT409`; chave desconhecida recusada; log com de/para |
| Efeito real | M1–M3 | Global 1,5 × individual 2: reagir dá 15 XP, com multiplicador 3,0 no histórico. Limite 2: a segunda pessoa diferente tira o pedido do ar |

### 6.2 Testes de tela com login (22/11/2026)

Feitos com `fase7_configuracoes.cjs` contra produção, com o app local (ADM00–ADM07 integradas).
- **Conta admin:** `adm-teste-admin`, com papel dado com autorização e **retirado ao final**.
- **Valores de produção:** restaurados (multiplicador 1,0 e limite 3).
- **XP de teste:** devolvido por `limpa_adm07.sql`.

| Caso | Observado | Estado |
|---|---|---|
| T01 · Parâmetros atuais | Salvar 1,5: o próximo "reagir" do usuário de teste deu **8 XP** (5 × 1,5). Níveis mostram cota e pessoas. O limite de denúncias tem o efeito comprovado na bateria (M2/M3) | **Aprovado** |
| T02 · Valor inválido | "0" e "1" barrados antes de salvar, com motivo; Salvar desativado; carregamento com erro e "Tentar novamente" | **Aprovado** |
| T03 · Papéis e concorrência | Moderador é levado para fora da tela e a função devolve 403. Outra sessão salvou 5 enquanto o campo tinha 4: erro claro, o 4 continua no campo, "salvo: 5" aparece, e a nova tentativa salva | **Aprovado** |
| Segurança XP | Sem login: 401. Para outra pessoa: 403 `not_self`. 9.999 em reagir: soma 5. `PATCH` no próprio XP: 403 | **Aprovado** |
| U01–U03 · Tamanhos | 1440, 390, 320 e 844 × 390 px nos temas atual e legado | **Aprovado** visualmente |

**Ajuste feito após o teste:** com um valor inválido no campo, a ajuda dizia "quando 1 pessoas diferentes…". Agora ela mostra o efeito do valor salvo.

## 7. Pendente e riscos

- [ ] Atualizar `context-app-features` (PR #24): contrato do XP (valor por ação decidido no servidor) e dos parâmetros.
- [ ] Revisão do colega.
- **Risco residual:** "orar" (terço) não tem um registro próprio no banco. O teto de 20 por dia limita o abuso, mas não prova que a pessoa rezou. Para isso, o XP teria de ser dado por um gatilho do registro real (APP03/APP04).
- **APP:** quando o agradecimento é recusado, o app só registra no console (`AngelicalNotificationOverlay`), e a notificação de agradecimento continua sendo enviada. Comportamento mantido.
