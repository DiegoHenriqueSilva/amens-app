# Handoff: Améns — Redesign "Papel & Tinta"

## Visão geral

Este pacote contém a **proposta de redesign** do app Améns (mobile + web). Foi produzido seguindo as regras de `.agents/` do próprio repositório:

- Tom respeitoso, católico, sem promessas transacionais (`context-content-guidelines.md`)
- Princípio de "respiro" e anti cognitive-overload (`uiux-rules.md`)
- Política English-only para código (`general-rules.md`) — UX copy em português
- Mobile-first com adaptação web elegante (`context-app-technical.md`)

## ⚠️ Sobre os arquivos deste bundle

Os arquivos `.html` em `prototypes/` são **referências de design**, **não** código de produção para copiar/colar. A tarefa é **recriar esses designs no codebase real** (React + Vite + Tailwind + shadcn/ui + Capacitor) usando os padrões já estabelecidos.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e radii estão definidos com valores exatos em `DESIGN_TOKENS.md`. As medidas devem ser reproduzidas pixel-a-pixel quando possível, ajustando apenas para usar os componentes shadcn/ui já presentes no projeto (`@/components/ui/*`).

## Stack alvo

O codebase é:
- React + TypeScript + Vite
- TailwindCSS (`tailwind.config.ts` na raiz)
- shadcn/ui (`components.json`)
- Supabase para dados/auth
- **Capacitor** (`capacitor.config.ts`) → mesmo código roda em web, iOS e Android

A consequência prática: **basta um esforço de implementação** — tokens CSS + classes Tailwind + componentes React. O Capacitor empacota os builds nativos. Não há código duplicado.

## Estrutura do pacote

```
design_handoff_amens_redesign/
├── README.md                  ← este arquivo
├── DESIGN_TOKENS.md           ← cores, tipo, espaçamento, radii (com CSS pronto)
├── COMPONENTS.md              ← especificação de cada padrão de componente
├── SCREENS.md                 ← spec de cada tela (mobile + web)
├── MIGRATION.md               ← guia arquivo-por-arquivo do src/ existente
├── RESPONSIVE.md              ← regras web / iOS / Android
├── CLAUDE_CODE_PROMPT.md      ← prompt pronto para colar no Claude Code
└── prototypes/
    ├── Améns Redesign.html    ← protótipo mobile (5 telas, iOS frame)
    ├── Améns Web.html         ← protótipo desktop (Home)
    ├── Relatório de Redesign.html
    ├── app.jsx                ← root + nav + tweaks
    ├── screens.jsx            ← 5 telas mobile
    ├── ios-frame.jsx          ← (starter, ignorar)
    ├── browser-window.jsx     ← (starter, ignorar)
    └── tweaks-panel.jsx       ← (starter, ignorar)
```

## Como abrir os protótipos

Os `.html` em `prototypes/` são standalone — abra direto no navegador. Não há build step.

## Fluxo recomendado para o Claude Code

1. Ler `DESIGN_TOKENS.md` → atualizar `tailwind.config.ts` e `src/index.css`
2. Ler `COMPONENTS.md` → criar/atualizar os componentes base (Button, Card, BottomNav, FAB, RitualCard, FeedCard, etc.) em `src/components/ui/`
3. Ler `SCREENS.md` + `MIGRATION.md` → refatorar as páginas existentes em `src/pages/` na ordem: Index → Submit → Pray → Profile → Community/PrayerChain
4. Ler `RESPONSIVE.md` → garantir que cada tela funciona em 3 breakpoints (mobile / tablet / desktop)
5. Validar visualmente abrindo os `.html` em `prototypes/` lado-a-lado com o app rodando

## Escopo desta entrega

**Especificado em hi-fi:**
- Tela Hoje (Home) — mobile + web
- Tela Orar por uma Causa — mobile
- Tela Enviar Pedido — mobile
- Tela Comunidade — mobile (+ feed cards reaproveitáveis no web)
- Tela Perfil — mobile

**Espec sistêmico, sem mock dedicado:**
- Tela Comunidade em desktop (usar mesma grade 3-col do feed da Home web)
- Tela Perfil em desktop (idem)
- Tela Corrente / Oração ao vivo (banner já mockado, página interna não)
- Tela Evangelho, Novena, Terço, Divina Promessa (seguir o padrão "página interna" descrito em `COMPONENTS.md`)
- Tela Auth (manter atual; aplicar só tokens novos)

## Princípio guia (uma frase)

> Améns não é um app de produtividade espiritual. É uma página de oração.
> Tudo o que não for página, sai do caminho.

— a paleta dourada vira **ornamento**, não fill de botão; a hierarquia editorial guia a leitura; a comunidade vem antes da gamificação.
