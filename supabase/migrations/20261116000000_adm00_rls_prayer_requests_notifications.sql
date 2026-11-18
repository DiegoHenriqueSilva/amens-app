-- ADM00: corrige S1 (UPDATE aberto em prayer_requests) e S2 (INSERT aberto em notifications).
-- APLICADA MANUALMENTE em produção (fszltwvhbdasqoznnors) em 2026-11-16 via 'supabase db query --linked'.
-- Idempotente. Rollback: docs/admin/sql/04_rollback.sql

begin;

-- ───────────── S1 · prayer_requests ─────────────
-- Remove o UPDATE aberto a qualquer usuário logado.
drop policy if exists "Authenticated users can update prayer_count" on public.prayer_requests;

-- Moderação (telas Pedidos de Oração e Reports) passa a ter policy própria.
drop policy if exists "prayer_requests_update_mod" on public.prayer_requests;
create policy "prayer_requests_update_mod"
  on public.prayer_requests for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- Mantida como está: "Owners can update feedback" (dono edita o próprio pedido).
-- Contador de orações: via increment_prayer_count (SECURITY DEFINER).

-- ───────────── S2 · notifications ─────────────
drop policy if exists "Authenticated can insert notifications" on public.notifications;

-- Usuário comum: pode notificar outra pessoa (convite, reação, testemunho),
-- mas só com type NULL: os tipos oficiais ficam para mod/admin e para as
-- funções SECURITY DEFINER (moderação, doação, evangelho do dia).
-- Obs.: a coluna sender_id NÃO existe em produção (types.ts está desatualizado).
-- Tipos oficiais vistos em produção (16/11/2026): system, prayer_moderated,
-- prayer_policy_violation, donation_confirmed, daily_gospel; e prayer_edit_mod no código.
drop policy if exists "notifications_insert_user" on public.notifications;
create policy "notifications_insert_user"
  on public.notifications for insert
  to authenticated
  with check (type is null);

-- Moderador/admin: qualquer tipo (avisos de moderação e respostas de feedback).
drop policy if exists "notifications_insert_mod" on public.notifications;
create policy "notifications_insert_mod"
  on public.notifications for insert
  to authenticated
  with check (public.is_moderator_or_admin());

commit;
