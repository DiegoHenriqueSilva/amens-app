-- ADM04 · Privacidade das denúncias (T05)
--
-- ⚠️ APLICAR SÓ DEPOIS DO DEPLOY DO FRONT DA ADM04. O painel antigo de Reports
-- lê resolution_notes e moderator_id direto da tabela e quebraria com esta mudança.
-- NÃO aplicada em produção em 18/11/2026 (ver docs/admin/ADM04-reports-denuncias.md).
--
-- O denunciante lê as próprias denúncias (policy "Users can read their own
-- reports"), mas não deve ver a nota da moderação, a decisão nem quem decidiu:
-- isso expunha o motivo da sanção de outra pessoa. O painel novo usa
-- admin_list_reports (SECURITY DEFINER) e não depende dessas colunas.

revoke select on public.prayer_reports from anon, authenticated;
grant select (id, prayer_request_id, reporter_user_id, category, description, status, created_at,
              deleted_at, target_type, target_user_id, target_contribution_id, custom_reason)
  on public.prayer_reports to authenticated;
