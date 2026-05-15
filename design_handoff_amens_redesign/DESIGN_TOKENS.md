# Design Tokens — Améns "Papel & Tinta"

Todos os valores. Cole os snippets em `src/index.css` e `tailwind.config.ts`.

---

## 1. Paleta

| Token | Hex | Uso |
|---|---|---|
| `paper` | `#F5EFE3` | Fundo da página (papel litúrgico) |
| `vellum` | `#FBF8F1` | Fundo de cartões (velino, mais claro que o papel) |
| `ink` | `#1B1B2F` | Texto principal, botão primário, FAB |
| `ink-soft` | `#6B6679` | Texto secundário, ícones inativos |
| `marian` | `#2E4F8B` | Azul mariano — links, navegação ativa, acentos comunitários |
| `marian-soft` | `rgba(46,79,139,0.22)` | Borda de elementos secundários |
| `gold` | `#A37A2C` | **Ornamento apenas** — divisor `✦`, eyebrows, tag "Gratidão" |
| `hairline` | `#E6DDC8` | Borda de cartões e divisores (1px) |

**Regra de uso de ouro:** nunca como fill de botão. Apenas em:
- Pequenos `✦` decorativos (8–10px)
- Eyebrows / labels em uppercase
- Tag de etiqueta "Gratidão" no feed
- Indicador de "tab ativo" na bottom nav (ponto de 4px embaixo do label)

**Modo noturno ("Vigília"):**
| Token | Hex |
|---|---|
| `paper` | `#15131C` |
| `vellum` | `#1F1C28` |
| `ink` | `#F5EFE3` |
| `ink-soft` | `#9089A0` |
| `marian` | `#9BB4EC` |
| `gold` | `#D8B36A` |
| `hairline` | `#2C2836` |

---

## 2. Tipografia

| Família | Pesos | Uso |
|---|---|---|
| **Cormorant Garamond** | 400, 500, 600 + 500 italic | Display, títulos editoriais, citações de pedidos, wordmark |
| **Inter** | 400, 500, 600 | UI, botões, labels, copy curta |
| **JetBrains Mono** | 400, 500 | Números tabulares (timer, counters, "14/80") |

**Escala (mobile):**
| Token | Tamanho | Linha | Uso |
|---|---|---|---|
| `display-1` | 30px | 1.1 | Hero da Home ("Há uma intenção…") |
| `serif-xl` | 26px | 1.25 | Texto grande da causa em modo foco |
| `serif-lg` | 22px | 1.3 | Título de cartões grandes |
| `serif-md` | 18–19px | 1.3 | Subtítulos serif, citações inline |
| `serif-sm` | 15–16px | 1.45 | Citações dentro de cartões de feed |
| `body` | 13–14px | 1.5 | Texto UI padrão |
| `caption` | 12px | 1.4 | Metadados ("há 2 horas") |
| `small` | 11px | 1.4 | Helper text |
| `eyebrow` | 10px | 1, letter-spacing 0.28em uppercase | Labels acima de seções |
| `micro` | 9px | 1, letter-spacing 0.18em uppercase | Tags de categoria |

**Escala (desktop):** multiplicar headlines por 1.4x — display-1 vira 44px, serif-xl vira 40px no hero da Home.

**Wordmark "Améns":** Cormorant Garamond 500 itálico, sem text-stroke, sem glow. Embaixo: "UNIDOS PELA FÉ" em Inter 500, 10px, letter-spacing 0.32em, cor `gold`.

---

## 3. Espaçamento

Escala base de 4px. Use múltiplos de 4 sempre.

| Token | Valor |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-7` | 28px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

**Padding padrão de tela mobile:** 20px horizontal (px-5).
**Padding padrão de tela desktop:** 48px horizontal (px-12).

---

## 4. Border radius

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 4px | Tags / badges pequenos |
| `radius-md` | 14px | Inputs, chips |
| `radius-lg` | 18px | Cartões pequenos / médios |
| `radius-xl` | 22px | Cartões grandes / hero |
| `radius-2xl` | 28px | Bottom nav container |
| `radius-full` | 9999px | Botões pílula, FAB, swatches |

**Importante:** o app antigo usava `rounded-[2rem]` (32px) em tudo. **Reduza para 18–22px.** O 32px deixa tudo com cara de app infantil.

---

## 5. Sombras

| Token | Valor |
|---|---|
| `shadow-card` | `0 1px 0 rgba(0,0,0,0.02), 0 12px 28px -18px rgba(28,22,40,0.18)` |
| `shadow-nav` | `0 18px 36px -22px rgba(28,22,40,0.25)` |
| `shadow-fab` | `0 14px 28px -10px rgba(28,22,40,0.5)` |

Use sombra com parcimônia. A maior parte dos cartões usa **só hairline border**, sem sombra.

---

## 6. Implementação — `src/index.css`

Substitua o bloco `:root` atual por:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Améns 2.0 — Papel & Tinta */
    --paper:    45 50% 93%;     /* #F5EFE3 */
    --vellum:   40 50% 97%;     /* #FBF8F1 */
    --ink:      240 26% 14%;    /* #1B1B2F */
    --ink-soft: 252 8% 44%;     /* #6B6679 */
    --marian:   217 49% 36%;    /* #2E4F8B */
    --gold:     38 58% 40%;     /* #A37A2C */
    --hairline: 41 41% 85%;     /* #E6DDC8 */

    /* shadcn aliases */
    --background: var(--paper);
    --foreground: var(--ink);
    --card: var(--vellum);
    --card-foreground: var(--ink);
    --popover: var(--vellum);
    --popover-foreground: var(--ink);
    --primary: var(--ink);
    --primary-foreground: var(--paper);
    --secondary: var(--marian);
    --secondary-foreground: var(--paper);
    --muted: var(--vellum);
    --muted-foreground: var(--ink-soft);
    --accent: var(--gold);
    --accent-foreground: var(--paper);
    --border: var(--hairline);
    --input: var(--hairline);
    --ring: var(--marian);

    --radius: 1.125rem; /* 18px base */
  }

  .dark {
    --paper:    254 16% 9%;     /* #15131C */
    --vellum:   254 16% 14%;    /* #1F1C28 */
    --ink:      45 50% 93%;     /* #F5EFE3 */
    --ink-soft: 252 11% 60%;    /* #9089A0 */
    --marian:   221 65% 76%;    /* #9BB4EC */
    --gold:     39 56% 63%;     /* #D8B36A */
    --hairline: 254 11% 18%;    /* #2C2836 */
  }

  body {
    @apply text-foreground;
    background-color: hsl(var(--paper));
    background-image:
      radial-gradient(1200px 800px at 20% 0%, hsl(45 40% 88%) 0%, transparent 60%),
      radial-gradient(1000px 700px at 80% 100%, hsl(45 35% 86%) 0%, transparent 55%);
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
  }

  h1, h2, h3, .font-serif {
    font-family: 'Cormorant Garamond', 'Lora', serif;
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
}
```

**REMOVA** as classes `.text-glow` e `.text-soft-outline` — não são mais usadas.

---

## 7. Implementação — `tailwind.config.ts`

```ts
const config = {
  // ... resto do config existente
  theme: {
    extend: {
      colors: {
        paper: 'hsl(var(--paper))',
        vellum: 'hsl(var(--vellum))',
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
        },
        marian: 'hsl(var(--marian))',
        gold: 'hsl(var(--gold))',
        hairline: 'hsl(var(--hairline))',
        // manter shadcn aliases (background, foreground, etc.)
      },
      borderRadius: {
        sm: '4px',
        md: '14px',
        lg: '18px',
        xl: '22px',
        '2xl': '28px',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Lora', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(0,0,0,0.02), 0 12px 28px -18px rgba(28,22,40,0.18)',
        nav: '0 18px 36px -22px rgba(28,22,40,0.25)',
        fab: '0 14px 28px -10px rgba(28,22,40,0.5)',
      },
    },
  },
};
```

---

## 8. O que remover da paleta antiga

Buscar e remover do código:
- `from-[#d4a017] to-[#e8c547]` — gradiente dourado → vira `bg-ink text-paper`
- `text-[#3d2800]` — texto do botão dourado → não existe mais
- `bg-[#FAFAFA]` — cartões antigos → `bg-vellum`
- `rounded-[2rem]` — usar `rounded-xl` (22px)
- `.text-glow`, `.text-soft-outline` — deletar do CSS
- `text-primary` quando significava dourado → agora `text-ink` ou `text-marian`
