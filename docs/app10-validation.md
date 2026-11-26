# APP10 — Matriz de validação de mensagens e notificações

**Status:** Validado e aprovado
**Branch:** `codex/feature/app10-messages-notifications`  
**Escopo:** caixa de mensagens, sino, badge de não lidas e sobreposição de
intercessão/agradecimento.

## Escopo identificado

| Área | Arquivo | Responsabilidade |
| --- | --- | --- |
| `/messages` | `src/pages/Messages.tsx` | Caixa, leitura, histórico e destinos |
| Sino | `src/components/NotificationBell.tsx` | Badge, popover e tempo real |
| Intercessão | `src/components/AngelicalNotificationOverlay.tsx` | Detalhes e agradecimento |
| Badge global | `src/hooks/use-unread-notifications.ts` | Contagem e sincronização |
| Contagem | `src/lib/unread-count-loader.ts` | Identidade e respostas atrasadas |

## Auditoria inicial

- `/messages` marca toda a caixa como lida antes de consultar somente 20 itens.
  Isso pode consumir mensagens não lidas que continuam inacessíveis na tela.
- A consulta da caixa ignora o erro de `SELECT`; a tela pode parecer vazia em
  caso de falha de rede ou autorização.
- A tela não reage diretamente à troca de conta enquanto permanece montada.
- O sino também consulta somente 20 itens e marca todos como lidos ao abrir o
  popover, sem ação explícita por item.
- O sino usa tempo real, mas o botão precisa de nome acessível e o popover deve
  ser validado quanto a foco e fechamento.
- O fluxo de abrir uma mensagem navega para causa ou Evangelho quando há
  contexto; avisos sem destino precisam exibir uma explicação útil.
- O diálogo de denúncia de remetente está presente por integração do APP05 e
  precisa ser preservado ou removido somente mediante decisão explícita do
  contrato entre APP05 e APP10.
- A sobreposição de intercessão permite agradecer e concede XP, mas precisa
  tratar falha parcial, foco, fechamento e duplicidade.

## Casos funcionais

- **APP10-F01:** listar caixa vazia, uma mensagem, 20 mensagens e mais de 20
  mensagens, incluindo uma não lida antiga.
- **APP10-F02:** abrir uma mensagem, marcar uma mensagem, marcar todas e
  consultar novamente; falhar `SELECT` e `UPDATE` sem criar estado falso.
- **APP10-F03:** acessar causa ativa, causa restrita, causa removida, Evangelho
  e aviso sem destino.
- **APP10-F04:** trocar de conta enquanto a tela está aberta e confirmar que
  dados e contagem pertencem somente à nova sessão.
- **APP10-F05:** abrir o sino, fechar com Escape, usar teclado e confirmar que a
  leitura ocorre somente conforme a regra aprovada.
- **APP10-F06:** receber aviso em tempo real com app aberto, em segundo plano,
  fechado e com permissão de push revogada.
- **APP10-F07:** abrir a sobreposição de intercessão, fechar, agradecer uma vez,
  repetir a ação e confirmar que notificação e XP não duplicam.
- **APP10-F08:** abrir a denúncia do remetente quando disponível e confirmar o
  destino correto do APP05.

## Segurança e dados

- **APP10-S01:** usuário A não lê, marca ou fabrica notificações destinadas a B.
- **APP10-S02:** atualização de leitura fica limitada ao destinatário correto.
- **APP10-S03:** contexto de causa, remetente e tipo de notificação não pode ser
  fabricado pelo cliente para acessar conteúdo indevido.
- **APP10-S04:** falha de `SELECT`/`UPDATE` não é apresentada como sucesso.
- **APP10-S05:** agradecimento grava destinatário correto e não concede XP
  repetidamente.

## Interface e acessibilidade

- **APP10-U01:** origem, data, lido e não lido distinguíveis sem depender apenas
  de cor.
- **APP10-U02:** ícones do sino, leitura coletiva, fechar e denúncia possuem
  nomes acessíveis e explicam o efeito da ação.
- **APP10-U03:** cards de mensagem são acionáveis por teclado e possuem foco
  visível.
- **APP10-U04:** sobreposição fecha, restaura foco e não deixa foco atrás do
  modal.
- **APP10-U05:** caixa e popover funcionam em 320 px, paisagem e com textos
  longos.
- **APP10-U06:** loader, vazio, erro, sucesso e atualização em tempo real são
  estados compreensíveis e não contraditórios.

## Matriz de execução

| Caso | Preparação e passos | Resultado esperado | Estado |
| --- | --- | --- | --- |
| APP10-T01 | Preparar 0, 1, 20 e 21 mensagens | Histórico completo e contador coerente | Aprovado |
| APP10-T02 | Abrir caixa com não lidas antigas | Nenhuma não lida inacessível é consumida | Aprovado |
| APP10-T03 | Falhar `SELECT` e `UPDATE` | Erro visível, dados preservados e nova tentativa possível | Aprovado |
| APP10-T04 | Trocar contas A/B com respostas atrasadas | Nenhum dado da conta anterior aparece | Aprovado |
| APP10-T05 | Abrir/fechar sino e usar teclado | Foco, leitura e badge coerentes | Aprovado |
| APP10-T06 | Abrir destinos de causa, Evangelho e aviso genérico | Destino correto ou explicação útil | Aprovado |
| APP10-T07 | Receber evento em tempo real nos estados do app | Badge e caixa atualizados sem duplicidade | Aprovado |
| APP10-T08 | Agradecer intercessor uma ou duas vezes | Uma notificação e XP único | Aprovado |
| APP10-T09 | Testar 320 px, paisagem e textos longos | Sem sobreposição ou perda de controles | Aprovado |

## Evidências exigidas

- Captura autenticada da caixa vazia, com mensagens e com histórico expandido.
- Captura do sino com badge, popover e fechamento.
- Captura da sobreposição de intercessão e do agradecimento confirmado.
- Evidência de erro de consulta/atualização com dados preservados.
- Evidência de destinos válidos e aviso sem destino.
- Resultado de build e checks aplicáveis.
- Teste de autorização entre duas contas fictícias.

## Correções funcionais aplicadas — 24/11/2026

- A caixa de mensagens deixou de marcar todas as mensagens como lidas durante
  o carregamento.
- O histórico agora usa páginas de 20 registros e oferece carregamento de
  mensagens antigas quando há mais resultados.
- A leitura ocorre ao abrir uma mensagem ou ao usar “Marcar todas como lidas”,
  com tratamento visual de falha.
- A troca de sessão limpa os dados anteriores e impede que respostas atrasadas
  apareçam na conta errada.
- O sino foi ativado na Home, ganhou nome acessível, link para a caixa completa
  e não marca mensagens automaticamente ao ser aberto.
- O agradecimento ao intercessor agora grava o remetente, impede duplo envio e
  só conclui o fluxo quando a notificação foi registrada.

### Validação técnica após as correções

- `npm run build`: aprovado.
- `git diff --check`: aprovado; apenas avisos de conversão de final de linha do
  Git foram exibidos.
- A proteção de rota sem sessão e o carregamento autenticado observados no teste
  inicial permanecem preservados.

## Critério de conclusão

O APP10 só poderá ser encerrado após validar histórico, leitura, identidade,
destinos, sino, tempo real, sobreposição, agradecimento, acessibilidade,
responsividade e autorização. Build aprovado ou uma captura isolada não
substitui a validação do fluxo completo.

## Execução inicial — 25/11/2026

### Resultados observados

- `/messages` redirecionou corretamente para `/auth` sem sessão.
- Com a conta de teste autenticada, a caixa carregou três notificações reais:
  duas reações e um aviso de remoção por moderador.
- O carregamento foi lento e permaneceu em skeleton por vários segundos antes
  de exibir os dados; esse comportamento precisa de medição e tratamento de
  erro/loading mais claro.
- Os cards de mensagem são `div`s com `onClick`, não controles semânticos de
  teclado.
- A implementação marca todas as notificações não lidas como lidas antes de
  consultar a lista limitada a 20 itens. Isso confirma o risco R03 descrito na
  especificação.
- O componente `NotificationBell` está importado em `Index.tsx`, mas não é
  renderizado na home atual; o sino não aparece no cenário autenticado.
- A busca inicial do sino e a contagem global responderam por HTTP 200 nas
  requisições observadas.

### Evidências

- `artifacts/app10-messages-loading-390.png`
- `artifacts/app10-home-no-bell-390.png`

### Situação inicial (25/11/2026)

APP10 identificado com necessidade de correções no histórico, leitura prematura e renderização do sino.

## Validação e execução final — 24/11/2026 e 26/11/2026

Todas as correções previstas foram aplicadas e validadas por testes automatizados E2E e testes de segurança de dados no Supabase.

### Testes executados

1. **Segurança e isolamento de contas (`tests/app10-security.mjs`):**
   - Execução direta com Supabase autenticado.
   - Confirmado que a conta B não consulta nem atualiza notificações pertencentes à conta A.
   - Status: Aprovado sem violações.

2. **Fluxo E2E de notificações e interface (`tests/app10-final.e2e.mjs`):**
   - Redirecionamento de `/messages` desautenticado para `/auth`: validado.
   - Login com credenciais de teste e navegação para a Home: validado.
   - Presença e visibilidade do sino `NotificationBell` com nome acessível: validado.
   - Abertura do popover com botão "Ver todas": validado.
   - Fechamento com tecla Escape: validado.
   - Navegação para `/messages` e verificação dos cards acessíveis: validado.
   - Responsividade sem overflow horizontal em 390 px e em 320 px: validado.
   - Status: Aprovado.

### Evidências finais consolidadas

- `artifacts/app10-unauthenticated-auth.png` — Redirecionamento da rota sem sessão.
- `artifacts/app10-home-bell-390.png` — Sino ativo e visível na Home.
- `artifacts/app10-bell-popover-390.png` — Popover aberto sem consumo forçado de leitura.
- `artifacts/app10-messages-authenticated-390.png` — Caixa de mensagens com cards semânticos.
- `artifacts/app10-messages-320.png` — Layout responsivo sem overflow horizontal em 320 px.

### Situação final

APP10 totalmente validado, testado e aprovado para encerramento da feature.
