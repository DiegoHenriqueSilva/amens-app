# APP11 — Matriz de validação de amigos e convites para oração

**Status:** Planejamento e auditoria inicial
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
| APP11-T01 | Copiar código; testar código vazio, inválido, próprio e duplicado | Validações e feedback adequados sem falso positivo | Não executado |
| APP11-T02 | Conta A convida Conta B; B aceita ou recusa | Atualização imediata em ambas as contas sem reload | Não executado |
| APP11-T03 | Paginação com lista longa e filtro sem resultados | Amigos acessíveis; estado vazio diferenciado de erro | Não executado |
| APP11-T04 | Selecionar múltiplos amigos em FriendSelector e enviar | Destinatários corretos, estado resetado e sem duplicação | Não executado |
| APP11-T05 | Acessar `/friends` sem sessão | Aviso claro com ação de login; sem quebra de código | Não executado |
| APP11-T06 | Amigo com nome longo, insígnias e perfil público | Layout estável, textos legíveis e privacidade preservada | Não executado |

## Evidências exigidas

- Captura da tela para usuário desautenticado (aviso claro de login).
- Captura da tela `/friends` autenticada (código, busca, abas e atalho responsivo).
- Captura de solicitações pendentes e lista de amigos.
- Captura do modal `FriendSelector` em causas/pedidos.
- Teste em viewport de 390 px e 320 px sem overflow.
- Verificação de build (`npm run build`).
