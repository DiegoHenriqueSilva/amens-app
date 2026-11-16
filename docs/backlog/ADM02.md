# Backlog fora de escopo — encontrados na ADM02

Continuação de `docs/BACKLOG-fora-de-escopo.md` (B01–B07, na branch da ADM01). Ficam para tratar **no final**, conforme combinado com o time.

| ID | Problema | Evidência (produção, 16/11/2026) |
|---|---|---|
| B08 | **Qualquer usuário pode alterar o próprio XP** (`user_xp`: INSERT/UPDATE do próprio registro). Com isso, a pessoa sobe de nível e aumenta a própria cota diária de intercessões | `pg_policies`: "Users can insert own xp" / "Users can update own xp" |
| B09 | `prayer_state` e `prayer_votes` têm policy "Permitir tudo para todos" (`ALL … true`) | `pg_policies` |
| B10 | `prayer_chain_sessions`: INSERT e UPDATE com `true` para qualquer usuário | `pg_policies` |
| B11 | `referrals`: INSERT com `true` (qualquer pessoa cria indicação em nome de outra) | `pg_policies` |
| B12 | Para ler o XP de outro usuário a consulta depende do RLS de `user_xp`; o admin consegue pelo comando, mas a leitura direta pode falhar. Revisar junto com B08 | bateria ADM02 (T04d) |
