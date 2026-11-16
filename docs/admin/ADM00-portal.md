# ADM00 — Portal administrativo: acesso, sessão e navegação

Branch: `fix/adm00-portal-access` (a partir de `origin/main` @ `0063610`).
Estado: **Em andamento**. Os testes manuais T01–T05 ainda não foram executados e o servidor de produção não foi verificado.

## 1. Matriz de acesso (interface)

| Rota | Visitante | Usuário comum | Moderador | Admin |
|---|---|---|---|---|
| `/admin` (Dashboard) | → `/auth?redirect=` | → `/` | → `/admin/prayers` | ✅ |
| `/admin/users` | → login | → `/` | → `/admin/prayers` | ✅ |
| `/admin/donations` | → login | → `/` | → `/admin/prayers` | ✅ |
| `/admin/prayers` | → login | → `/` | ✅ | ✅ |
| `/admin/reports` | → login | → `/` | ✅ | ✅ |
| `/admin/churches` | → login | → `/` | → `/admin/prayers` | ✅ |
| `/admin/feedback` | → login | → `/` | ✅ | ✅ |
| `/admin/settings` | → login | → `/` | → `/admin/prayers` | ✅ |
| `/admin/logs` | → login | → `/` | → `/admin/prayers` | ✅ |
| `/admin/<inexistente>` | → login | → `/` | → `/admin/prayers` | → `/admin` |

Fonte: `src/pages/Admin.tsx` (`requireAdmin`) e `ADMIN_NAV_ITEMS` em `src/components/admin/AdminSidebar.tsx` (`adminOnly`). **As duas listas precisam continuar iguais.**

Componente sem rota: `AdminPrayerChain.tsx` existe, mas não aparece no menu nem tem rota. Ele foi mantido como está até que alguém decida explicitamente o que fazer com ele.

## 2. Matriz de acesso (servidor) — conforme as migrations do repositório

> ⚠️ O repositório **não contém** todos os objetos do banco. Faltam, por exemplo, a criação de `profiles` e de `prayer_reports`, a tabela `user_xp_overrides` e o RPC `increment_prayer_count`. Por isso, esta tabela precisa ser confirmada em produção com a consulta da seção 2.2.

| Recurso usado pelo painel | Leitura | Escrita | Coerente com a UI? |
|---|---|---|---|
| `get_users_admin()` | admin (RAISE caso contrário) | — | ⚠️ ver S6 |
| `admin_supporter()` (Doações) | admin | admin | ✅ |
| `user_roles` | próprio ou mod/admin | INSERT/DELETE admin | ✅ |
| `moderation_logs` | mod/admin | INSERT mod/admin (próprio id) | ✅ |
| `user_feedback` | mod/admin | UPDATE mod/admin | ✅ |
| `prayer_reports` | autor ou mod/admin | UPDATE/DELETE mod/admin | ✅ |
| `prayer_contributions` | público (removidas só mod/admin) | UPDATE mod/admin | ✅ |
| `app_settings` | mod/admin | UPDATE admin | ⚠️ S5 |
| `churches` | ativas: público; todas: mod/admin | UPDATE **mod/admin** | ⚠️ S3 |
| `profiles` | público (removidos só admin) | UPDATE **mod/admin em qualquer perfil** | ⚠️ S4 |
| `notifications` | próprias | INSERT **qualquer autenticado, para qualquer usuário** | ❌ S2 |
| `prayer_requests` | regras de status | UPDATE **qualquer autenticado, qualquer linha** | ❌ S1 |
| `user_xp_overrides` | sem migration no repo | sem migration no repo | ❓ S9 |

### 2.1 Achados do servidor (não corrigidos nesta branch: precisam de decisão e verificação em produção)

- **S1 — Crítico.** A policy `"Authenticated users can update prayer_count"` em `prayer_requests` usa `USING (true) WITH CHECK (true)`. Com isso, qualquer usuário logado consegue, direto pela API, alterar `status`, `deleted_at` ou o texto de qualquer pedido, passando por cima da moderação. Correção proposta: remover a policy e manter só `"Owners can update feedback"` mais as policies de mod/admin. Antes disso, é preciso confirmar que `increment_prayer_count` é `SECURITY DEFINER`, senão o botão de orar deixa de funcionar.
  Atenção: hoje as telas Pedidos de Oração e Reports **dependem** dessa policy aberta, porque não existe uma policy de UPDATE própria para mod/admin. A correção cria `prayer_requests_update_mod` (ver `sql/03_correcao.sql`).
- **S2 — Alto.** `"Authenticated can insert notifications"` usa `WITH CHECK (true)`. Qualquer usuário pode criar uma notificação para qualquer pessoa, inclusive imitando avisos da moderação. O app cria notificações legítimas para outras pessoas em convite, reação, testemunho e agradecimento ao intercessor, sempre sem `type`. Correção proposta: usuário comum não pode usar os tipos oficiais (`system`, `prayer_edit_mod`, `donation_confirmed`) nem um `sender_id` alheio; mod/admin podem tudo. Risco que continua: o texto da mensagem é livre. A solução definitiva é criar as notificações por RPC.
- **S7 — Médio.** A policy `"Owners can update feedback"` não restringe colunas. O dono de um pedido banido ou em revisão consegue voltá-lo para `active` pela API; o próprio `Submit.tsx` faz isso ao "reabrir" um pedido. Correção sugerida: um trigger que impeça quem não é mod/admin de alterar o `status` quando o status anterior for `banned`, `policy_violation` ou `pending_review`.
- **S3 — Médio.** No banco, o moderador pode fazer UPDATE em `churches`, mas a interface considera Igrejas uma tela só de admin. É preciso decidir qual matriz vale e alinhar os dois lados.
- **S4 — Médio.** O moderador pode fazer UPDATE em qualquer coluna de qualquer `profiles`. Isso é necessário para suspender um usuário a partir de Reports, mas é amplo demais. Sugestão: um RPC `suspend_user` com checagem de papel.
- **S5 — Baixo.** O moderador consegue ler `app_settings`, enquanto a interface é só de admin. É apenas leitura; decidir se é aceitável.
- **S6 — Funcional.** Feedback é uma tela de moderador, mas chama `get_users_admin()`, que exige admin. O erro é ignorado e o moderador vê a tela sem e-mails. É preciso decidir se o moderador deve ver os e-mails.
- **S9 — Indeterminado.** `user_xp_overrides` não tem migration no repositório.

### 2.2 Scripts

`docs/admin/sql/`: `01_verificacao.sql` (somente leitura) → `02_teste_falha.sql` (prova a falha, com rollback) → `03_correcao.sql` → `04_rollback.sql` (só em emergência). Depois de validado em produção, o conteúdo de `03` vira uma migration em `supabase/migrations/`.

Consulta resumida:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('prayer_requests','notifications','profiles','churches','app_settings',
                    'user_feedback','prayer_reports','prayer_contributions','moderation_logs',
                    'user_roles','user_xp','user_xp_overrides','supporter_recognitions')
order by tablename, cmd;

select p.proname, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('increment_prayer_count','get_users_admin','admin_supporter',
                    'get_church_cities','get_duplicate_churches');
```

## 3. O que mudou nesta branch

| Item | Mudança | Arquivo |
|---|---|---|
| F01 sessão | Cache do React Query limpo no logout, na expiração e na troca de conta na mesma aba | `src/components/AuthCacheReset.tsx`, `src/App.tsx` |
| F01 sessão | Visitante ou sessão expirada vai para `/auth?redirect=<rota>` e volta para a mesma tela após o login | `src/components/AdminGuard.tsx` |
| F01/F02 erro | Falha ao consultar o papel mostra o erro e "Tentar novamente", em vez de expulsar para `/` | `AdminGuard.tsx`, `src/hooks/use-user-role.ts` |
| F01 cache | Contador de feedback não lido com `queryKey` por usuário e erro propagado | `AdminSidebar.tsx` |
| Segurança | O `redirect` do login completo aceita só caminhos internos (`/…`, não `//…`) | `src/pages/Auth.tsx` |
| U01 | Abaixo de 768 px: barra superior com o título da seção e menu em gaveta com os 9 itens; a partir de 768 px: sidebar fixa (sticky) | `AdminSidebar.tsx`, `src/pages/Admin.tsx` |
| U02 | Item ativo marcado com barra lateral, negrito e `aria-current="page"` (não depende só da cor); foco visível com teclado | `AdminSidebar.tsx` |
| T04 | Sub-rota inexistente redireciona em vez de mostrar tela vazia | `src/pages/Admin.tsx` |

Validação feita: `tsc --noEmit` sem erros e `vite build` concluído. O projeto não tem framework de testes automatizados.

Pendentes do pacote: F03/U03 (contrato comum com as outras tarefas ADM: carregamento, foco e largura dos diálogos) e títulos/breadcrumbs padronizados dentro de cada tela, que dependem das tarefas ADM01–ADM10.

## 4. Roteiro de testes (preencher com evidências)

Use contas fictícias: **A** (admin), **M** (moderador), **U** (comum) e uma aba anônima (visitante).

| Caso | Passos | Esperado | Estado | Evidência |
|---|---|---|---|---|
| T01 Papéis | Abrir as 10 linhas da tabela 1 com cada perfil | Igual à matriz 1 | Não executado | |
| T01 API | Como U, no console do navegador: `await supabase.rpc('get_users_admin')` e `await supabase.from('user_feedback').select('*')` | Erro / lista vazia | Não executado | |
| T02 Troca | Como A, abrir `/admin/users` → sair → entrar como U na mesma aba → voltar com o botão do navegador | Nenhum dado de A aparece; U vai para `/` | Não executado | |
| T02 Expiração | Como A no portal, apagar a chave `sb-*-auth-token` no localStorage (ou esperar o token expirar) e navegar | Vai para o login e, depois de entrar, volta para a mesma tela | Não executado | |
| T02 Erro | Como A, ficar offline (DevTools) e recarregar `/admin` | Mensagem "Não foi possível verificar…" com botão para tentar de novo | Não executado | |
| T03 Responsivo | Em 390 px retrato, paisagem e desktop, percorrer os 9 itens só com Tab/Enter | Todos alcançáveis; gaveta fecha ao navegar; Esc fecha | Não executado | |
| T04 Integração | Abrir cada `/admin/*` por link direto, recarregar (F5), usar "Voltar ao App"; abrir `/admin/xyz` | Sem tela vazia; volta para `/` | Não executado | |
| T05 Doações | `/admin/donations` como A, M e U; como M: `await supabase.rpc('admin_supporter',{p_user:'<id>',p_active:true})` | Só A opera; M/U recebem erro 42501 | Não executado | |
