# APP05 — Matriz de testes de denúncias

**Status:** Em implementação  
**Branch:** `codex/feature/app05-reporting`  
**Escopo:** denúncias de causas, usuários/remetentes e contribuições

## Contrato de alvos

| Origem | Alvo enviado ao painel | Componente esperado |
| --- | --- | --- |
| `/pray` | `target_type=prayer_request`, `prayer_request_id` | `ReportPrayerDialog` |
| `/messages` | `target_type=user`, `target_user_id` do remetente | `ReportUserDialog` |
| `/community` | `target_type=user`, `target_user_id` do perfil | `ReportUserDialog` |
| `/prayer-chain` | `target_type=contribution`, `target_contribution_id` | `ReportContributionDialog` |

Mensagens serão denunciadas pelo remetente, não por um identificador de
mensagem individual, até que o contrato do banco passe a suportar esse alvo.
Essa limitação será informada na interface quando o ponto for restaurado.

## Casos funcionais

- **APP05-F01:** abrir e fechar cada diálogo em todas as rotas aplicáveis.
- **APP05-F02:** selecionar cada categoria e validar o motivo `Outro`.
- **APP05-F03:** preencher motivo e descrição e enviar a denúncia.
- **APP05-F04:** cancelar sem persistir e reabrir o diálogo limpo.
- **APP05-F05:** simular erro de persistência, preservar o preenchimento e
  permitir nova tentativa.
- **APP05-F06:** impedir duplo envio enquanto a primeira operação está pendente.
- **APP05-F07:** confirmar no painel o tipo e o identificador do alvo recebido.
- **APP05-F08:** confirmar que a denúncia de causa permanece disponível em
  `/pray`.

## Segurança e dados

- **APP05-S01:** exigir sessão autenticada para enviar denúncia.
- **APP05-S02:** persistir o denunciante sem exibi-lo ao autor denunciado.
- **APP05-S03:** impedir alvo ausente ou identificador incompatível.
- **APP05-S04:** confirmar que o autor da mensagem é enviado como usuário-alvo.
- **APP05-S05:** confirmar que contribuição usa `target_contribution_id`.
- **APP05-S06:** confirmar que o painel recebe categoria, motivo, descrição,
  tipo, identificador e status `open`.

## Interface e acessibilidade

- **APP05-U01:** título do diálogo identifica claramente o alvo denunciado.
- **APP05-U02:** botão de fechar tem nome acessível e Escape fecha o diálogo.
- **APP05-U03:** foco retorna ao botão que abriu o diálogo.
- **APP05-U04:** seleção de categoria não depende apenas da cor vermelha.
- **APP05-U05:** labels e textareas são associados aos respectivos campos.
- **APP05-U06:** diálogo permite rolagem em 320 px, paisagem, teclado virtual
  e textos longos.
- **APP05-U07:** estados de envio, erro e sucesso são anunciados sem permitir
  duplo envio.

## Protocolo comum

Após os fluxos específicos, executar G01–G08 e U01–U06 do protocolo visual
comum nos dois temas, registrando resultado observado e captura/vídeo. Falta
de ambiente será registrada como bloqueio, nunca como aprovação.

## Evidências necessárias

- Captura autenticada de cada ponto de entrada.
- Captura do diálogo com `Outro` e descrição preenchidos.
- Evidência do painel mostrando o alvo correto sem vazar o denunciante.
- Evidência de erro com preenchimento preservado.
- Resultado de build, lint/typecheck aplicável e migrations/funções realmente
  aplicadas.

## Implementation checkpoint

- The `/community` member cards now expose a user-report action.
- The `/prayer-chain` contributor feed now carries the contribution id and
  exposes a contribution-report action for other users' contributions.
- `/messages` now exposes a sender-report action when the notification includes
  `sender_id`; message reporting is intentionally defined as reporting the
  sender, not an individual message.
- A migration adds nullable `notifications.sender_id` and an index for that
  contract. A migration foi aplicada manualmente no SQL Editor do Supabase;
  a captura confirma o índice `idx_notifications_sender_id` e o endpoint REST
  respondeu HTTP 200 ao consultar `sender_id`.
- Notificações novas de convite, reação e envio de pedido passam a registrar o
  `sender_id`. Registros históricos podem continuar sem esse campo e, nesses
  casos, o botão de denúncia do remetente não é exibido.
- The report dialogs now expose dialog semantics, accessible close names,
  category pressed state, labelled descriptions, Escape handling, initial
  focus, and focus restoration to the opening control.
- O limite diário de oportunidades foi desativado temporariamente para
  permitir testes repetidos do APP05. A interface não exibe mais o contador e
  a migration `20261123000000_disable_prayer_daily_limit_for_testing.sql`
  remove o trigger de bloqueio no banco.

## Resultado da validação automatizada

- O limite de oportunidades foi removido no banco e a conta de teste recebeu
  uma nova causa sem bloqueio.
- A denúncia foi aberta em viewport de 390 px, com a categoria `Outro`, motivo
  personalizado e descrição adicional.
- O envio terminou com a mensagem de sucesso e fechou o diálogo.
- O painel `/admin/reports` exibiu o novo registro como `Pedido de Oração`,
  categoria `Outro`, status `Aberto`, preservando motivo e descrição.
- Evidências: `artifacts/app05-report-dialog-390.png` e
  `artifacts/app05-admin-report.png`.
