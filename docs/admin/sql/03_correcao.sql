-- ADM00 · Passo 3 — CORREÇÃO de S1 e S2
-- Só rode depois que o passo 1 confirmar:
--   * 1B: increment_prayer_count com security_definer = true
--   * 1C: nenhuma função relevante sem SECURITY DEFINER alterando prayer_requests
--   * 1D/1E: tipos oficiais conhecidos e column_default de "type" = NULL
-- Para desfazer: 04_rollback.sql
-- Depois de validado em produção, este conteúdo vira uma migration em
-- supabase/migrations/ para o repositório refletir o banco.

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
-- mas não pode usar tipos oficiais nem se passar por outro remetente.
-- Ajuste a lista de tipos oficiais conforme o resultado do passo 1D.
drop policy if exists "notifications_insert_user" on public.notifications;
create policy "notifications_insert_user"
  on public.notifications for insert
  to authenticated
  with check (
    coalesce(type, '') not in ('system', 'prayer_edit_mod', 'donation_confirmed')
    and (sender_id is null or sender_id = auth.uid())
  );

-- Moderador/admin: qualquer tipo (avisos de moderação e respostas de feedback).
drop policy if exists "notifications_insert_mod" on public.notifications;
create policy "notifications_insert_mod"
  on public.notifications for insert
  to authenticated
  with check (public.is_moderator_or_admin());

commit;
