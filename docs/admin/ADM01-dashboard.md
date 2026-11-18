# ADM01 — Dashboard e métricas

Branch: `erickyamanaka/fix/adm01-painel-metricas` (a partir de `origin/main` @ `0063610`).
Estado: **Em andamento**. A RPC foi aplicada em produção em 16/11/2026 e os testes T01–T03 passaram. Faltam T04 e os testes visuais, que são manuais e exigem login.

## 1. Decisões aprovadas (2026-11-16)

- **Períodos:** dias corridos no fuso **America/Sao_Paulo**, sempre incluindo hoje. Hoje = desde 00:00; Semana = hoje + 6 dias anteriores; Mês = hoje + 29 dias anteriores. Cards e gráfico usam exatamente os mesmos dias.
- **Taxa de aprovação:** aprovados (`active` + `completed`, não removidos) ÷ **todos** os pedidos criados no período, inclusive os removidos.
- **Princípio:** os totais mostram o **estado atual**; as métricas de período contam **eventos**. Um registro criado no período continua contado mesmo que depois seja removido, para os números do passado não mudarem.
- **Solução escolhida:** agregar as métricas de período no **servidor** (RPC `admin_dashboard_period`), conforme recomendado no pacote. A alternativa (recorte no cliente) foi descartada porque truncava e não comprova completude.

## 2. Definição de cada indicador (F01)

| Card | Tipo | Fórmula | Origem |
|---|---|---|---|
| Usuários cadastrados | total atual | `profiles` com `deleted_at` nulo (inclui suspensos; contas de login sem perfil não entram) | count exato no cliente |
| Pedidos ativos | total atual | `prayer_requests` com `status='active'` e `deleted_at` nulo | count exato no cliente |
| Reports abertos | total atual | `prayer_reports` com `status='open'` e `deleted_at` nulo | count exato no cliente |
| Revisão pendente | total atual | `prayer_requests` com `status='pending_review'` e `deleted_at` nulo | count exato no cliente |
| Igrejas ativas | total atual | `churches` com `status='active'` e `deleted_at` nulo | count exato no cliente |
| Novos usuários | período | `profiles.created_at` no período (inclui removidos depois) | RPC |
| Novos pedidos | período | `prayer_requests.created_at` no período, qualquer status, inclui removidos | RPC |
| Usuários ativos | período | `user_id` distintos que criaram pedido **ou** contribuíram na corrente (`prayer_contributions`) no período; anônimos não entram | RPC |
| Taxa de aprovação | período | aprovados ÷ novos pedidos × 100, com 1 casa decimal; exibe "X de Y"; sem pedidos = "—" | RPC |
| Novos reports | período | `prayer_reports.created_at` no período, qualquer status | RPC |
| Ações de moderação | período | `moderation_logs.created_at` no período | RPC |
| Gráfico | período | por dia de Brasília: pedidos criados (mesma base de "Novos pedidos") e ações de moderação | RPC |

## 3. O que mudou

| Problema encontrado | Correção | Item |
|---|---|---|
| "Ações de moderação" e o gráfico paravam em 1000 linhas; "Usuários ativos" parava em 500 + 500 | Agregação no servidor, sem limite de linhas | F02 |
| Erro de consulta aparecia como `0` (`count ?? 0`, erros ignorados) | Cada total tem erro próprio; o card mostra "Indisponível", nunca zero | F02, U03 |
| "Hoje" usava a meia-noite do navegador, enquanto "Semana" e "Mês" usavam 24h corridas; o 1º dia do gráfico ficava parcial | Fuso fixo de Brasília, dias completos, faixa de datas exibida | F01, F03 |
| O card de novos pedidos excluía removidos, mas o gráfico os incluía; o de novos usuários incluía removidos | Todas as métricas de período usam a mesma regra (eventos) | F03 |
| Taxa de aprovação contava `completed` como não aprovado e tirava os removidos da base | Nova fórmula aprovada | F01 |
| O tooltip dizia que `deleted_at` nulo significava "não banidos" | Textos reescritos com a regra real | F01 |
| ⓘ só abria com o mouse (ícone não focável) | Botão com `aria-label`, abre com teclado e toque (Popover) | U01 |
| Layout `p-6` fixo e cabeçalho do período sem quebra no celular | Espaçamento responsivo, quebra de linha, números `pt-BR`, eixo do gráfico com espaçamento mínimo | U02 |
| Falha no período derrubava tudo de forma silenciosa | Aviso com "Tentar novamente"; os totais continuam visíveis | U03 |
| Tipos `any` | Tipos explícitos | F03 |

O item "Dashboard recebeu signOut com limpeza de push", citado no pacote, **não está** em `AdminDashboard.tsx` @ 0063610. Nada foi alterado sobre isso.

## 4. Artefatos

- `supabase/migrations/20261116030000_adm01_admin_dashboard_period.sql`: RPC `admin_dashboard_period(p_period)`, `SECURITY DEFINER`, só admin (42501). **Aplicada em produção (`fszltwvhbdasqoznnors`) em 2026-11-16.**
- `docs/admin/sql/adm01_testes_dashboard.sql`: T01 (referência), T02 (acima dos limites), T03 (bordas de fuso) e negação para não-admin, tudo em transação desfeita.
- `src/components/admin/AdminDashboard.tsx`.

## 5. Testes

| Caso | Como | Estado |
|---|---|---|
| T01 Contagens conhecidas | Script: RPC × consulta de referência independente em produção (Semana e Mês) | ✅ Passou: Mês 18/10→16/11: moderação 48=48=48 (RPC/ref/gráfico), novos usuários 3=3, ativos 4=4, pedidos 1=1, taxa 100% (1 de 1); Semana: 8/8 itens iguais |
| T02 Acima dos limites | Script: +1200 logs e +1100 pedidos sintéticos (rollback). Usuários ativos > 500 é garantido pela construção (`count(distinct)` no servidor); produção tem só ~16 contas, então não dá para sintetizar 500 pessoas sem criar contas | ✅ Passou: +1200 logs → +1200; +1100 pedidos → +1100; gráfico de hoje = 1100 |
| T03 Períodos | Script: eventos às 00:00:00 do 1º dia (entra) e às 23:59:59 da véspera (não entra), para Semana e Hoje | ✅ Passou: Semana delta 1 e 1º dia do gráfico +1; Hoje delta 1 |
| Acesso | Não-admin chama a RPC | ✅ Negado com 42501 |
| T04 Falha parcial | Manual: com DevTools, bloquear `rpc/admin_dashboard_period` → os totais continuam; o período mostra o aviso e "Indisponível" (nunca 0). Bloquear `profiles` → só o card de usuários fica indisponível | Não executado |
| Visual (U01/U02) | Manual em 390 px, paisagem e desktop, nos dois temas; ⓘ com Tab/Enter e toque | Não executado |

## 6. Observações de produção (16/11/2026)

- Volumes em 30 dias: 48 ações de moderação, 1 pedido, 9 contribuições. O truncamento (limites de 500/1000) **ainda não acontecia na prática**; era um defeito latente que apareceria com o crescimento. O T02 comprova que agora não há limite.
- 16 contas de login, 16 perfis, nenhuma conta sem perfil; nenhuma contribuição anônima.
- Os testes de escrita (T02/T03) rodaram numa transação desfeita. Depois foi conferido que não ficou nenhum pedido nem log de teste.
