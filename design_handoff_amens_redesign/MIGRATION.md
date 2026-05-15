# Migration Guide — arquivo por arquivo

Plano de execução em ordem. Cada etapa pode virar um commit/PR isolado, respeitando a regra de `git checkout -b <user>/feature/...` do `WORKFLOW_RULES.md`.

---

## Branch sugerida

```bash
git checkout main
git pull origin main
git checkout -b <user>/refactor/amens-design-paper-and-ink
```

## Etapa 1 — Tokens base

**Arquivos:** `src/index.css`, `tailwind.config.ts`

Trocar as variáveis CSS por `DESIGN_TOKENS.md` § 6. Estender o Tailwind conforme § 7.

**Remover do `index.css`:**
- `.text-glow` (linhas ~7–14)
- `.text-soft-outline` (linhas ~16–20)
- O `body::before` com `background-image` watercolor (linhas ~67–80) — substituído pelo gradient radial em `body { background: ... }`
- Variável `--gradient-divine`, `--gradient-sacred`

**Validação:** rodar `npm run dev`, abrir `/` — fundo deve estar creme `#F5EFE3`, sem watercolor azul/dourada.

---

## Etapa 2 — Componentes base

**Criar:**
- `src/components/ui/hero-cause-card.tsx`
- `src/components/ui/ritual-card.tsx`
- `src/components/ui/feed-card.tsx`
- `src/components/ui/journey-dots.tsx`
- `src/components/ui/live-pulse.tsx`
- `src/components/ui/hairline-divider.tsx`
- `src/components/ui/wordmark.tsx`
- `src/components/ui/anonymity-toggle.tsx`

Specs em `COMPONENTS.md`.

**Atualizar:**
- `src/components/ui/button.tsx` (shadcn) — adicionar variants `"ink"` (primário novo) e `"ghost-bordered"` (secundário com hairline)
- `src/components/ui/card.tsx` (shadcn) — default vira `bg-vellum border-hairline rounded-xl`, sem sombra
- `src/components/ui/input.tsx`, `textarea.tsx` — usar `bg-vellum border-hairline focus:border-marian/60`

---

## Etapa 3 — Bottom nav + FAB

**Arquivo:** `src/components/BottomNav.tsx`

Reduzir de 6 → 4 itens + FAB central. Spec em `COMPONENTS.md` § 3.

**Mapeamento:**
| Antes | Depois |
|---|---|
| Início | Hoje (mantém `/`) |
| Mensagens | **Absorvido** em /profile → notifications |
| Oração ao vivo | Corrente (mantém `/prayer-chain`, novo rótulo "Corrente") |
| Amigos | **Absorvido** em /profile → tab "Amigos" |
| Comunidade | Comunidade (mantém `/community`) |
| Perfil | Perfil (mantém `/profile`) |
| — | **NOVO FAB central → `/submit`** |

**Importante:** rotas `/messages` e `/friends` continuam funcionando — só não estão mais na bottom nav. Decisões de absorção podem ir para brainstorm pastoral (ver `agent-brainstorming-uiux/SKILL.md`).

**Mobile-only:** a BottomNav só aparece em `md:hidden`. Acima de `md`, renderizar `<TopBar>` (criar novo componente).

---

## Etapa 4 — TopBar (web)

**Criar:** `src/components/TopBar.tsx`

Spec em `COMPONENTS.md` § 3. Renderizar com `hidden md:flex` em `App.tsx`.

---

## Etapa 5 — Página Hoje

**Arquivo:** `src/pages/Index.tsx`

Reescrever conforme `SCREENS.md` § 1. Em ordem:
1. Remover `JornadaFe`, `XpBadge` em destaque — apenas `JourneyDots` no rodapé
2. Substituir o grid 2×3 por `<HeroCauseCard>` + carrossel horizontal de `<RitualCard>`
3. Adicionar `<LivePulse>` + texto da Corrente como banner
4. Wordmark sem text-stroke
5. **Versão web (≥ md):** layout em 2 colunas conforme `Améns Web.html`

**Manter:**
- Lógica do Supabase / `useXp`
- Realtime presence channel (vira `onlineCount` exibido no LivePulse)
- `AngelicalNotificationOverlay`, `CompleteProfileDialog`

**Backup recomendado:** o atual `IndexOld.tsx` já existe — renomear o atual `Index.tsx` para `IndexClassic.tsx` antes de reescrever, para A/B se necessário.

---

## Etapa 6 — Página Submit

**Arquivo:** `src/pages/Submit.tsx`

Refazer com `<AnonymityToggle>` em destaque + chips de tema. Spec em `SCREENS.md` § 3.

**Atenção `content-review`:**
- "Enviar" → "Compartilhar com a comunidade"
- "Pedido enviado!" → "Seu pedido foi enviado. A comunidade poderá rezar por essa intenção." (já alinhado com o guia)

---

## Etapa 7 — Página Pray

**Arquivo:** `src/pages/Pray.tsx`

Adotar modo foco. Spec em `SCREENS.md` § 2.

- Texto da causa em Cormorant 26px
- Timer "Em oração" via `useEffect` setInterval
- Reações antigas (Compaixão, Graça, etc.) viram chips de texto, não emojis grandes
- Sugestão de IA colapsa por padrão

**Manter:** `useDrawLimit`, lógica de filtro de causas próprias, reportar.

---

## Etapa 8 — Página Profile

**Arquivo:** `src/pages/Profile.tsx`

Spec em `SCREENS.md` § 5.

- Nome dos níveis precisa de brainstorm pastoral antes de hardcodear. Sugestões iniciais:
  - Nível 1: "Primeira oração"
  - Nível 2: "Companhia em fé"
  - Nível 3: "Aprendiz da escuta"
  - Nível 4: "Intercessor diário"
  - Nível 5: "Cireneu" (carrega cruzes)
- A nomenclatura **precisa passar** pela skill `agent-content-review` antes do PR

---

## Etapa 9 — Página Community

**Arquivo:** `src/pages/Community.tsx`

Spec em `SCREENS.md` § 4. Reaproveitar `<FeedCard>` criado na Etapa 2.

---

## Etapa 10 — Páginas internas restantes

`SCREENS.md` § 6 lista cada uma e o padrão a seguir. Não precisam de mock individual — aplicam o sistema.

---

## Etapa 11 — Limpeza

```bash
grep -r "from-\[#d4a017\]" src/ # → 0 resultados
grep -r "rounded-\[2rem\]" src/  # → 0 resultados
grep -r "text-glow"     src/     # → 0 resultados
grep -r "text-soft-outline" src/ # → 0 resultados
```

Se algum match restar, ou é uma página não migrada (registrar no `context-app-features`) ou é um leftover (deletar).

---

## Validação final

1. Abrir `/`, `/pray`, `/submit`, `/community`, `/profile` em modo mobile (DevTools, 402×874)
2. Confirmar que cada tela bate visualmente com o protótipo correspondente em `prototypes/`
3. Testar em desktop ≥ 1024px — confirmar TopBar substitui BottomNav, layouts em colunas funcionam
4. `npm run build` deve passar sem warnings novos
5. Capacitor: `npx cap sync ios` e `npx cap sync android` — testar em simulador para confirmar safe-area
