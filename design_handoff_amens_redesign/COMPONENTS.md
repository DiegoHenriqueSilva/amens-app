# Component Specifications — Améns 2.0

Catálogo dos padrões reutilizáveis. Para cada um: estrutura, props, classes Tailwind, exemplo.

---

## 1. Botões

### `<PrimaryButton>` — botão primário
Tinta sólida. **Um por tela.**

```tsx
<button className="h-12 px-6 rounded-full bg-ink text-paper text-sm font-medium
                   flex items-center justify-center gap-2
                   transition-opacity hover:opacity-90 active:opacity-80
                   disabled:opacity-35 disabled:cursor-not-allowed">
  Rezar com Joana
</button>
```

### `<SecondaryButton>` — secundário
Contorno hairline.

```tsx
<button className="h-11 px-5 rounded-full bg-transparent text-ink text-[12.5px]
                   border border-hairline transition-colors hover:bg-vellum">
  Receber outra
</button>
```

### `<TextLink>` — link textual
Marian, sem caixa.

```tsx
<button className="text-marian text-sm font-medium hover:underline underline-offset-4">
  Ver tudo →
</button>
```

### `<Chip>` — chip de reação / categoria

```tsx
// inativo
<button className="px-3.5 py-2 rounded-full text-xs border border-hairline text-ink
                   transition-all hover:bg-vellum">
  Compaixão
</button>

// ativo
<button className="px-3.5 py-2 rounded-full text-xs bg-ink text-paper border border-ink">
  Compaixão
</button>
```

---

## 2. Cartões

### `<Card>` base
Velino + hairline. **Nenhuma sombra por padrão.**

```tsx
<div className="bg-vellum border border-hairline rounded-xl p-6">
  {children}
</div>
```

### `<HeroCauseCard>` — cartão da causa em destaque (Home)
Composto: corpo branco + faixa preta CTA na base.

```tsx
<button className="block w-full text-left bg-vellum border border-hairline rounded-xl
                   overflow-hidden shadow-card">
  <div className="px-6 pt-6 pb-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-gold text-[10px]">✦</span>
      <span className="text-[10px] uppercase tracking-[0.28em] text-ink-soft">
        Causa para interceder
      </span>
    </div>
    <p className="font-serif text-[22px] leading-[1.25] text-ink">
      "{causa.texto}"
    </p>
    <Avatar user={causa.autor} className="mt-5" />
  </div>
  <div className="px-6 py-4 bg-ink text-paper flex items-center justify-between">
    <span className="text-sm font-medium">Rezar com {causa.autor.firstName}</span>
    <ArrowRight size={18} />
  </div>
</button>
```

### `<RitualCard>` — cartão de ritual diário (carrossel mobile / coluna desktop)

Props:
```ts
type RitualCard = {
  kind: "Evangelho" | "Terço" | "Novena" | "Promessa";
  title: string;
  sub: string;
  duration: string;
  badge?: "hoje";
  progress?: number; // 0–1
  onClick: () => void;
};
```

**Mobile (carrossel):** largura fixa 180px, altura min 160px, shrink-0.
**Desktop (lista vertical):** largura cheia, altura auto, separação por `border-top: 1px solid hairline`.

```tsx
<button className="bg-vellum border border-hairline rounded-lg p-4 text-left
                   flex flex-col justify-between min-h-[160px] w-[180px] shrink-0">
  <div className="flex items-center justify-between">
    <span className="text-[9px] uppercase tracking-[0.24em] text-gold">{kind}</span>
    {badge && (
      <span className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm
                       bg-ink text-paper">{badge}</span>
    )}
  </div>
  <div className="mt-4">
    <p className="font-serif text-base leading-tight text-ink">{title}</p>
    <p className="text-xs mt-1 text-ink-soft">{sub}</p>
  </div>
  {typeof progress === "number" ? (
    <div className="mt-3">
      <div className="h-1 rounded-full bg-hairline">
        <div className="h-1 rounded-full bg-marian"
             style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="text-[10px] mt-1.5 text-ink-soft">{duration}</p>
    </div>
  ) : (
    <p className="text-[10px] mt-3 text-ink-soft">{duration}</p>
  )}
</button>
```

### `<FeedCard>` — cartão de intenção no feed da comunidade

Props:
```ts
type FeedCard = {
  name?: string;          // omit if anonymous
  city?: string;
  time: string;           // "há 12 min"
  tag: string;            // "Saúde", "Família"...
  text: string;
  praying: number;
  anonymous?: boolean;
  gratitude?: boolean;    // muda tag para gold, CTA para "Celebrar"
};
```

Ver `prototypes/screens.jsx` para implementação completa. Pontos-chave:
- Avatar 32px circular ou ícone abstrato se `anonymous`
- Tag direita: marian normal / **gold se gratitude**
- Citação em Cormorant 15.5px italic-friendly
- Divisor `border-top dashed hairline` separando texto do CTA
- CTA "Rezar comigo →" ou "Celebrar →" (gratidão) em marian

---

## 3. Navegação

### `<BottomNav>` (mobile) — 4 itens + FAB central

Estrutura: `flex` com 5 slots — 2 esquerda, FAB centralizado elevado, 2 direita.

```tsx
const items = [
  { id: "today",     label: "Hoje",       icon: HomeIcon },
  { id: "community", label: "Comunidade", icon: GlobeIcon },
  { id: "fab",       fab: true },
  { id: "chain",     label: "Corrente",   icon: ChainIcon },
  { id: "profile",   label: "Perfil",     icon: UserIcon },
];
```

Container:
```tsx
<nav className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl
                bg-vellum border border-hairline shadow-nav
                flex items-end justify-around px-2 py-2 relative">
  {items.map(item => item.fab ? (
    <Link to="/submit" className="-mt-7 w-14 h-14 rounded-full bg-ink text-paper
                                  flex items-center justify-center shadow-fab
                                  transition-transform active:scale-95">
      <Plus size={22} />
    </Link>
  ) : (
    <NavTab item={item} active={isActive} />
  ))}
</nav>
```

`NavTab`:
- Inativo: ícone 22px stroke 1.5, label 9.5px, cor `ink-soft`
- Ativo: stroke 1.9, cor `ink`, **dot dourado 4px** embaixo do label

**FAB sempre aponta para `/submit`** (Enviar Pedido) — o único ato de criação no app.

### Web — `<TopBar>` (desktop ≥ 1024px)
Header horizontal substitui a bottom nav.

```tsx
<header className="flex items-center justify-between px-12 py-5 border-b border-hairline">
  <Wordmark />
  <nav className="flex items-center gap-9">
    {items.map(it => <NavLink key={it.id} {...it} />)}
  </nav>
  <div className="flex items-center gap-3">
    <PrimaryButton size="sm" leftIcon={<Plus />}>Enviar intenção</PrimaryButton>
    <NotificationBell />
    <Avatar user={user} />
  </div>
</header>
```

Itens da TopBar: Hoje · Comunidade · Corrente · Pedidos · Perfil (idênticos ao mobile minus o FAB).

---

## 4. Cabeçalhos internos

### `<ScreenHeader>` — cabeçalho de página interna mobile

```tsx
<div className="flex items-center justify-between px-5 pt-3 pb-2">
  <button onClick={onBack} className="w-9 h-9 -ml-2 rounded-full
                                       flex items-center justify-center active:bg-black/5">
    <ArrowLeft size={18} />
  </button>
  <div className="font-serif text-[17px] tracking-tight text-ink">{title}</div>
  <div className="w-9 flex items-center justify-end">{rightSlot}</div>
</div>
```

Para páginas internas (Pray, Submit, Profile), use este header — **não** o bloco grande com `<h1 text-4xl>` da Index antiga. A função do cabeçalho é navegar de volta, não impressionar.

### `<HairlineDivider>` — divisor decorativo

```tsx
<div className="flex items-center gap-3">
  <div className="flex-1 h-px bg-hairline" />
  <span className="text-gold text-[10px]">✦</span>
  <div className="flex-1 h-px bg-hairline" />
</div>
```

---

## 5. Formulários

### `<TitleInput>` — input grande sem caixa
Para o campo "Em uma frase" do Enviar Pedido.

```tsx
<input className="w-full bg-transparent border-0 border-b border-hairline
                  font-serif text-xl py-2 outline-none
                  placeholder:text-ink-soft/60 focus:border-ink/40"
       placeholder="Pela saúde da minha mãe…" />
```

### `<BodyTextarea>` — caixa para descrição
```tsx
<textarea className="w-full rounded-md p-3.5 text-sm leading-relaxed bg-vellum
                     border border-hairline outline-none resize-none
                     focus:border-marian/60" rows={5} />
```

### `<AnonymityToggle>` — toggle de anonimato em destaque
Componente especial — cartão inteiro muda de cor quando ativo.

```tsx
<div className={cn(
  "rounded-lg px-4 py-3.5 flex items-center gap-3 transition-all border",
  active ? "bg-ink border-ink text-paper" : "bg-transparent border-hairline text-ink"
)}>
  <IconCircle active={active} />
  <div className="flex-1">
    <p className="text-sm font-medium">Enviar como anônimo</p>
    <p className={cn("text-xs mt-0.5", active ? "text-paper/65" : "text-ink-soft")}>
      Seu nome e foto ficam ocultos.
    </p>
  </div>
  <Switch checked={active} onCheckedChange={setActive} />
</div>
```

**Por que destacar tanto?** O guia `context-app-business.md` diz que anonimato é "sagrado". O componente reforça isso visualmente.

---

## 6. Elementos especiais

### `<JourneyDots>` — caminhada em traços
Substitui o `<JornadaFe>` antigo com cards. 14 traços horizontais, um por dia.

```tsx
<div className="flex gap-1">
  {Array.from({ length: 14 }).map((_, i) => (
    <div key={i} className="flex-1 h-2 rounded-full"
         style={{
           background: i < daysCompleted ? 'hsl(var(--marian))' : 'hsl(var(--hairline))',
           opacity: i < daysCompleted ? (0.35 + (i / 14) * 0.65) : 1,
         }} />
  ))}
</div>
```

### `<LivePulse>` — pulso de cadeia ao vivo
Ponto marian com `animate-ping` em volta.

```tsx
<div className="relative w-10 h-10 flex items-center justify-center">
  <div className="absolute inset-0 rounded-full animate-ping bg-marian opacity-10" />
  <div className="w-2.5 h-2.5 rounded-full bg-marian" />
</div>
```

### Wordmark "Améns"

```tsx
<div className="flex flex-col">
  <span className="font-serif italic text-[22px] leading-none text-ink">Améns</span>
  <span className="text-[9px] uppercase tracking-[0.32em] text-gold mt-1">
    Unidos pela fé
  </span>
</div>
```

**Não use `text-glow` nem `text-soft-outline` — remova essas classes do CSS.**
