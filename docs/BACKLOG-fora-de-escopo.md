# Backlog — erros fora do escopo das tarefas ADM

Encontrados durante as tarefas ADM e guardados para tratar **no final**, conforme combinado com o time em 2026-11-16.

| ID | Origem | Problema | Evidência |
|---|---|---|---|
| B01 | ADM00 | `Pray.tsx` chama o RPC `increment_prayer_count`, que **não existe** em produção. A chamada falha em silêncio | consulta a `pg_proc` em produção, 16/11 |
| B02 | ADM00 | `notifications.sender_id` **não existe** em produção, mas está em `types.ts`. Por isso `AngelicalNotificationOverlay` não encontra o intercessor | `information_schema.columns`, 16/11 |
| B03 | ADM00 | Notificações entre usuários aceitam texto e destinatário livres, mesmo depois da correção S2. Ideal: criar via RPC | `notifications_insert_user` |
| B04 | ADM00 | O histórico de migrations em produção está dessincronizado do repositório. **Nunca usar `supabase db push`** | `supabase migration list` |
| B05 | ADM00 | Os testes de interface T01–T05 da ADM00 exigem uma conta moderadora real (hoje não existe nenhuma) | `user_roles` |
| B06 | ADM01 | `src/integrations/supabase/types.ts` está desatualizado em relação ao banco: falta `moderation_logs`, sobra `sender_id`, não há tipos das RPCs. Por isso o código usa `as any`. Regenerar com `supabase gen types` | leitura do arquivo |
