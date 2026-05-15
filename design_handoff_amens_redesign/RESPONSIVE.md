# Responsive Behavior — Web, iOS, Android

O Améns roda em três plataformas a partir de **um único codebase** (React + Vite + Capacitor). Este documento define como os layouts se adaptam.

---

## 1. Breakpoints

| Nome | Tailwind | Largura | Onde aparece |
|---|---|---|---|
| Mobile | (default) | < 768px | iOS, Android, navegador estreito |
| Tablet | `md:` | 768–1023px | iPad, tablets Android, navegadores médios |
| Desktop | `lg:` | ≥ 1024px | Web em monitor |

**Regra geral:** Mobile-first. Escreva os estilos no default e adicione overrides com `md:` / `lg:`.

---

## 2. Navegação por breakpoint

| Breakpoint | Nav | Onde |
|---|---|---|
| Mobile | `<BottomNav>` flutuante 4+FAB | fixed bottom |
| Tablet | `<BottomNav>` continua | mesma estrutura |
| Desktop | `<TopBar>` horizontal | substitui BottomNav |

Implementação em `App.tsx`:
```tsx
<>
  <TopBar className="hidden lg:flex" />
  <main className="pb-28 lg:pb-12">{children}</main>
  <BottomNav className="lg:hidden" />
</>
```

---

## 3. Adaptações por tela

### Hoje
- **Mobile:** stack vertical — hero, rituais (carrossel horizontal), pulso, caminhada
- **Tablet:** stack vertical mais largo, rituais como grid 2×2
- **Desktop:** grid `1.55fr 1fr` — hero+pulso à esquerda, rituais em coluna vertical à direita, feed 3-col abaixo

### Pray (modo foco)
- **Mobile:** padding lateral 28px
- **Tablet+:** centralizar conteúdo com `max-w-2xl mx-auto`, padding 48px
- Em todos os breakpoints, o texto da causa é Cormorant 26px (não escalar)

### Submit
- **Mobile:** stack vertical, padding 20px
- **Desktop:** mesmo layout, `max-w-xl mx-auto` para não esticar inputs

### Community
- **Mobile:** stack vertical de FeedCards
- **Tablet:** grid 2-col
- **Desktop:** grid 3-col, banner ao vivo full-width

### Profile
- **Mobile:** stack
- **Desktop:** hero centralizado + stats em row + intercessões em coluna lateral

---

## 4. Adaptações nativas (Capacitor)

### iOS
- **Safe area:** usar `env(safe-area-inset-top)` no header e `env(safe-area-inset-bottom)` no BottomNav
  ```css
  .ios-safe-top { padding-top: env(safe-area-inset-top, 0); }
  .ios-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
  ```
- **Status bar:** plugin `@capacitor/status-bar` — estilo `dark` em paper, `light` em vigília (dark mode)
- **Bounce scroll:** `overscroll-behavior-y: contain` no main para evitar overscroll branco

### Android
- **Status bar color:** usar `StatusBar.setBackgroundColor({ color: '#F5EFE3' })` no init
- **Navigation bar:** sistema gestual respeita safe area; usar mesmo `env(safe-area-inset-bottom)`
- **Material ripple:** evitar — manter feedback consistente com iOS (opacity transition em `active:`)

### Compartilhado
- **Haptics no FAB:** `@capacitor/haptics` → `Haptics.impact({ style: ImpactStyle.Light })` ao tocar
- **Reduced motion:** respeitar `prefers-reduced-motion` para o `animate-ping` do LivePulse

---

## 5. Tipografia responsiva

| Token | Mobile | Tablet | Desktop |
|---|---|---|---|
| H1 Home greeting | 30px | 36px | 44px |
| Causa em foco | 26px | 28px | 30px |
| Body | 14px | 14px | 15px |

Use clamp para fluidez:
```css
.h1-greeting { font-size: clamp(30px, 4vw, 44px); }
```

---

## 6. Imagens e densidade

- Avatares: 32px @ 1x, fornecer @2x e @3x para Retina/Android xhdpi
- Imagens de capa (Evangelho, Promessa): fornecer @1x até 2400px de largura, usar `srcset`
- Ícones: SVG inline (lucide-react já presente no projeto)

---

## 7. Checklist de QA por plataforma

**Web (Chrome/Safari/Firefox desktop)**
- [ ] TopBar renderiza, BottomNav escondido
- [ ] Hover states funcionam em links/botões
- [ ] Grid de 3 col no feed
- [ ] Texto não ultrapassa 75ch em nenhum lugar

**iOS Safari (mobile)**
- [ ] Status bar não cobre o wordmark
- [ ] BottomNav respeita home indicator
- [ ] Inputs não fazem zoom indesejado (font-size ≥ 16px no input)
- [ ] Smooth scroll funciona

**iOS App (Capacitor)**
- [ ] Safe area top/bottom respeitados
- [ ] Haptics no FAB
- [ ] Status bar muda de cor entre paper e vigília

**Android App (Capacitor)**
- [ ] Status bar com cor configurada
- [ ] Botão back do sistema funciona (push state)
- [ ] Gesture nav não conflita com swipe interno

---

## 8. Touch targets

Mobile-first quer dizer também acessibilidade tátil:
- Botões primários: altura **48px** mínimo
- Botões secundários: altura **44px** mínimo
- Tap targets de nav: **44×44px** mínimo
- Chips: **32px** altura, padding horizontal generoso

---

## 9. Dark mode (Vigília)

Tokens em `DESIGN_TOKENS.md` § 1 ("Modo noturno").

Ativação:
```tsx
// usar prefers-color-scheme ou toggle manual
<html className={isDark ? 'dark' : ''}>
```

Detalhes:
- Inverter ink ↔ paper, mas manter marian e gold com **tons mais claros** (não inverter)
- `animate-ping` do LivePulse: usar opacity 0.24 em vez de 0.12 para visibilidade no escuro
- Shadows: substituir por **glow sutil** (`box-shadow: 0 0 24px rgba(255,255,255,0.04)`)
