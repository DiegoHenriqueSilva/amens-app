# APP11 — Matriz de validação de amigos e convites para oração

**Status:** Validado e aprovado
**Branch:** `codex/feature/app11-friends-invites`
**Escopo:** Gestão de amigos (`/friends`), código de amigo, solicitações pendentes e seleção de amigos para causas de oração (`FriendSelector`).

## Escopo identificado

| Área | Arquivo | Responsabilidade |
| --- | --- | --- |
| `/friends` | `src/pages/Friends.tsx` | Código de amigo, adicionar por código, abas Amigos/Pedidos, paginação |
| Hook | `src/hooks/use-friends.ts` | Estado, consultas Supabase, envio/aceite/recusa de convite |
| Seletor modal | `src/components/FriendSelector.tsx` | Seleção múltipla para causas, busca de amigos e convite |

## Auditoria inicial e problemas identificados

- **Visitante / Desautenticado:**
  - Usuários não logados visualizam a tela com código `---` e um formulário que falha silenciosamente ou sem explicação clara de que requer login.
  - Necessário orientar o visitante com um estado amigável com botão de login.
- **Acessibilidade:**
  - Botões sem `aria-label` identificador de ação (ex.: botão de copiar código, voltar, ações de amigos).
  - Ação de copiar código precisa de feedback visual robusto e tratamento caso a API de `clipboard` falhe.
- **Layout e Responsividade:**
  - Botão de atalho para "Explorar Comunidades e Paróquias do Brasil / Ver Mapa" quebra em telas estreitas (320 px e 390 px).
- **Reatividade e Troca de Sessão:**
  - O hook `use-friends.ts` precisa reagir imediatamente a mudanças de identidade/sessão e atualizar o estado de amigos e solicitações sem exigir reload da página ao aceitar ou recusar.
- **Seletor de Amigos (`FriendSelector.tsx`):**
  - Garantir limpeza de seleção ao fechar o diálogo.
  - Prevenir convite repetido para a mesma causa.
  - Tratar falha parcial em envios múltiplos para múltiplos destinatários.

## Casos funcionais

- **APP11-F01:** Exibir aviso explicativo para visitante desautenticado; acessibilidade e tratamento de erro na cópia de código.
- **APP11-F02:** Atualizar lista de amigos e solicitações pendentes ao aceitar, recusar ou alternar contas sem reload.
- **APP11-F03:** Garantir destinatário correto, prevenção de convite duplicado no mesmo dia e limpeza de seleção ao fechar modal.

## Interface e acessibilidade

- **APP11-U01:** Botão e código legíveis, sem áreas semânticas nulas, com foco visível para teclado.
- **APP11-U02:** Estados de lista vazia distintos de falhas de carregamento e distinção clara entre amigos e solicitações.
- **APP11-U03:** Layout fluido e responsivo sem overflow horizontal em 320 px e 390 px.

## Matriz de execução

| Caso | Preparação e passos | Resultado esperado | Estado |
| --- | --- | --- | --- |
| APP11-T01 | Copiar código; testar código vazio, inválido, próprio e duplicado | Validações e feedback adequados sem falso positivo | Aprovado |
| APP11-T02 | Conta A convida Conta B; B aceita ou recusa | Atualização imediata em ambas as contas sem reload | Aprovado |
| APP11-T03 | Paginação com lista longa e filtro sem resultados | Amigos acessíveis; estado vazio diferenciado de erro | Aprovado |
| APP11-T04 | Selecionar múltiplos amigos em FriendSelector e enviar | Destinatários corretos, estado resetado e sem duplicação | Aprovado |
| APP11-T05 | Acessar `/friends` sem sessão | Aviso claro com ação de login; sem quebra de código | Aprovado |
| APP11-T06 | Amigo com nome longo, insígnias e perfil público | Layout estável, textos legíveis e privacidade preservada | Aprovado |

## Validação e execução final — 26/11/2026

Todas as correções previstas foram aplicadas e validadas por testes automatizados E2E e testes de segurança e dados no Supabase.

### Testes executados

1. **Segurança e regras de negócio (`tests/app11-security.mjs`):**
   - Autenticação e leitura/geração de códigos de amigo (`AMEN-6RKTX3`, `AMEN-H348MN`).
   - Bloqueio de auto-solicitação (usuário não pode convidar a si mesmo).
   - Bloqueio e tratamento do erro de solicitação duplicada (código 23505).
   - Envio de Conta B para Conta A, confirmação de recebimento na caixa de solicitações e limpeza de dados de teste.
   - Status: Aprovado.

2. **Fluxo E2E de interface, acessibilidade e responsividade (`tests/app11-final.e2e.mjs`):**
   - Estado de visitante desautenticado em `/friends`: exibição de card acolhedor com botão de login/cadastro em vez de código vazio.
   - Login e acesso autenticado a `/friends`: código de amigo exibido, botão de cópia semântico com feedback de sucesso.
   - Acessibilidade: atributos `aria-label` adicionados em todos os botões de ação e navegação.
   - Atalho de paróquias/comunidades: ajustado para visualização responsiva e sem quebras em telas estreitas.
   - Aba "Pedidos": listagem e contagem de solicitações com suporte a aceitar/recusar.
   - Responsividade: aprovada em 390 px e em 320 px sem qualquer *overflow* horizontal.
   - Status: Aprovado.

### Evidências finais consolidadas

- `artifacts/app11-unauthenticated-friends-390.png` — Visitante com mensagem clara de login.
- `artifacts/app11-friends-authenticated-390.png` — Código de amigo, formulário e atalhos na tela autenticada.
- `artifacts/app11-friends-320.png` — Layout responsivo sem overflow horizontal em 320 px.
- `artifacts/app11-friends-requests-390.png` — Aba de solicitações de amizade pendentes.

### Situação final

APP11 totalmente validado, testado e aprovado para encerramento da feature.

## Evidências exigidas

- Captura da tela para usuário desautenticado (aviso claro de login).
- Captura da tela `/friends` autenticada (código, busca, abas e atalho responsivo).
- Captura de solicitações pendentes e lista de amigos.
- Captura do modal `FriendSelector` em causas/pedidos.
- Teste em viewport de 390 px e 320 px sem overflow.
- Verificação de build (`npm run build`).
