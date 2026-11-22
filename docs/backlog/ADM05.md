# Backlog fora de escopo — encontrados na ADM05

Continuação de `docs/backlog/ADM03.md` (B13–B18). Fica para tratar **no final**, conforme combinado.

| ID | Problema | Evidência (produção, 21/11/2026) | Afeta |
|---|---|---|---|
| B19 | **O app não usa o cadastro de igrejas.** Cadastro, perfil e complemento de perfil gravam a paróquia como texto livre (`profiles.parish`), com sugestões tiradas de outros perfis. O que o painel aprova ou inativa não chega ao usuário. O contrato já existe: `search_churches(estado, cidade, busca)` e `get_church_cities(estado)`, só com ativas, e o INSERT de sugestão entra em revisão | `src/pages/Auth.tsx`, `src/pages/Profile.tsx`, `src/components/CompleteProfileDialog.tsx` (`select('parish')` em `profiles`); 21 perfis com paróquia em texto, 10 com `church_id` | APP12, APP13 |
| B20 | `parish_stats` (diretório) agrupa por paróquia **digitada**: grafias diferentes da mesma igreja viram paróquias diferentes | `pg_get_viewdef('parish_stats')` agrupa `state, city, parish` de `profiles` | APP12 |
| B21 | Não há limite de sugestões de igreja por usuário. Hoje não há risco, porque o app não sugere; vale definir quando o B19 for feito | `churches_insert_user` só exige `status = 'pending_review'` | APP12, APP13 |
