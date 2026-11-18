# Backlog fora de escopo — encontrados na ADM03

Continuação de `docs/BACKLOG-fora-de-escopo.md` (B01–B07) e `docs/backlog/ADM02.md` (B08–B12). Ficam para tratar **no final**, conforme combinado.

| ID | Problema | Evidência (produção, 17/11/2026) | Afeta |
|---|---|---|---|
| B13 | **Reports novos nascem com status `pending`**, mas a escalada automática, a tela de Reports e o card "Reports abertos" do dashboard contam só `open`. Resultado: o report nunca aparece como aberto, não pode ser tratado pelos botões da tela e **nunca dispara a escalada** | `prayer_reports.status` default `'pending'`; o único report existente está `pending`; `auto_escalate_prayer_reports` filtra `status = 'open'` | ADM04, ADM01 (card "Reports abertos" mostra 0), APP05 |
| B14 | Há **dois triggers** de escalada em `prayer_reports` (`trg_auto_escalate_prayer_reports` e `auto_escalate_prayer_reports_trigger`), e a função usa o status `'rejected'`, que não existe no CHECK de `prayer_requests` | `pg_trigger`, `pg_get_functiondef` | ADM04 |
| B15 | Os avisos de remoção e violação vêm de triggers antigos com textos não revisados ("…removido por um moderador.") | `notify_moderation_action`, `notify_prayer_policy_violation` | APP10 |
| B16 | A reabertura de reports ao aprovar depende do texto da nota de resolução (`ilike '%editado%'`…) | preservado de `0063610` em `admin_moderate_prayers` | ADM04 |
| B17 | Ao enviar pedido, qualquer erro aparece com o prefixo **"Erro técnico:"**, inclusive a mensagem acolhedora de conta suspensa ("Erro técnico: Sua conta está com as interações pausadas…") | Teste de tela 18/11, `src/pages/Submit.tsx` (toast de erro do envio) | APP04 |
| B18 | O sino de notificações (`NotificationBell`) é um botão só com ícone, **sem `aria-label`**; hoje não aparece na tela inicial atual (os avisos ficam em Mensagens) | `src/components/NotificationBell.tsx` | APP10 |
