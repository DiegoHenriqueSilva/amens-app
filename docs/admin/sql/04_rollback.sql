-- ADM00 · Passo 4 — ROLLBACK (só se algo quebrar depois do passo 3)
-- Restaura exatamente as policies antigas (inclusive as falhas S1 e S2).

begin;

drop policy if exists "prayer_requests_update_mod" on public.prayer_requests;
drop policy if exists "Authenticated users can update prayer_count" on public.prayer_requests;
create policy "Authenticated users can update prayer_count"
  on public.prayer_requests for update
  to authenticated
  using (true) with check (true);

drop policy if exists "notifications_insert_user" on public.notifications;
drop policy if exists "notifications_insert_mod" on public.notifications;
drop policy if exists "Authenticated can insert notifications" on public.notifications;
create policy "Authenticated can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

commit;
