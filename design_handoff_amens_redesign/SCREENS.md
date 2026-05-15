# Screens — Améns 2.0

Especificação tela a tela. Cada uma descreve: propósito, layout, hierarquia e mudanças vs. versão atual.

---

## 1. `/` — Hoje (Home)

**Propósito:** o usuário descobre **uma** intenção para interceder agora.

### Layout mobile
```
┌──────────────────────────────────┐
│ Wordmark      [bell]             │ ← brand bar
│ Bom dia, Pedro.                  │ ← greeting (caption)
│ Há uma intenção esperando        │ ← H1 serif 30px
│ por você hoje.                   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ✦ CAUSA PARA INTERCEDER      │ │
│ │ "Que minha mãe encontre…"    │ │ ← HeroCauseCard
│ │ Joana, 34 · São Paulo        │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ ▮ Rezar com Joana       →    │ │
│ └──────────────────────────────┘ │
│ "2 de 3 restantes hoje" (fineprint)
│                                  │
│ ━ RITUAIS DE HOJE                │
│ [Evang] [Terço] [Novena] [Prom]  │ ← carrossel horizontal
│                                  │
│ ⚪ 342 pessoas rezando agora     │ ← pulso comunidade
│   Corrente ao vivo · 12 países  [Entrar]
│                                  │
│ ━ SUA CAMINHADA          14 dias │
│ ▰▰▰▰▰▰▰▰▰▰▰▰▱▱                   │ ← JourneyDots
│                                  │
└──────────────────────────────────┘
[bottom nav: Hoje · Comu · ⊕ · Corr · Perfil]
```

### Layout web (≥ 1024px)
- TopBar substitui brand bar
- Hero ocupa coluna esquerda (1.55fr), Rituais ocupam coluna direita (1fr)
- Hero tem **layout interno em 2 colunas** — texto à esquerda, sugestão de oração + stats à direita
- Faixa preta de Corrente vem abaixo do hero, largura cheia (ainda dentro da coluna esquerda)
- Feed da comunidade (3 cards) ocupa toda a largura abaixo, separado por divisor `✦`
- Caminhada vira widget pequeno no canto sup. direito do hero

### Mudanças vs. atual
| | Antes (`src/pages/Index.tsx`) | Depois |
|---|---|---|
| Tiles | 6 idênticos em grid 2×3, todos com botão dourado | 1 hero + carrossel horizontal de rituais |
| XP card | Cartão grande com avatar+pontos | Vira widget pequeno no canto + JourneyDots |
| Jornada da Fé | Componente separado | Apenas JourneyDots de 14 traços |
| Wordmark | text-stroke + glow | Itálico Cormorant simples |
| Greeting | Implícito no XP card | "Bom dia, Pedro." → "Há uma intenção…" |

---

## 2. `/pray` — Orar por uma Causa

**Propósito:** modo foco — o usuário lê e reza por uma intenção específica.

### Layout
```
┌──────────────────────────────────┐
│ [←]                       [⋯]    │ ← header minimal
│                                  │
│ ✦ CAUSA DE JOANA, 34             │
│ enviado há 2 horas · São Paulo   │
│                                  │
│ "Que minha mãe encontre paz      │ ← Cormorant 26px
│  após a cirurgia. Ela sempre     │
│  foi nossa força em casa…"       │
│                                  │
│ ─────── ✦ ───────                │ ← HairlineDivider
│                                  │
│ EM ORAÇÃO        ACOMPANHANDO    │
│ 02:34            14 irmãos       │ ← stats em serif
│                                  │
│ ENVIE UM SINAL A JOANA           │
│ [Compaixão] [Graça] [Força]…     │ ← chips
│                                  │
│ Sugestão de oração ⌄             │ ← collapsible
│                                  │
│ ▮ Concluí esta oração            │ ← primary
│ [Receber outra] [Enviar amigo]   │
│                                  │
│       Reportar conteúdo          │ ← tiny link
└──────────────────────────────────┘
```

### Mudanças vs. atual
- O texto da causa é **a estrela visual** — 26px Cormorant, ocupa o quadro
- Reações viram **chips de texto**, não emojis grandes coloridos
- Timer "em oração" começa no carregamento — feedback de presença
- Sugestão de IA fica recolhida (Hick's Law)

---

## 3. `/submit` — Enviar Pedido

**Propósito:** composer respeitoso e rápido. Anonimato em destaque.

### Layout
```
┌──────────────────────────────────┐
│ [←] Nova intenção                │
│ Sua intenção poderá ser orada…   │
│                                  │
│ ┌────────────────────────────┐   │
│ │ 👤 Enviar como anônimo  [○]│   │ ← AnonymityToggle (preto se ativo)
│ │ Seu nome e foto ficam…     │   │
│ └────────────────────────────┘   │
│                                  │
│ EM UMA FRASE                     │
│ ▁ Pela saúde da minha mãe… ▁     │ ← TitleInput sem caixa
│ mínimo 5 caracteres      0/80    │
│                                  │
│ CONTE MAIS (OPCIONAL)            │
│ ┌──────────────────────────────┐ │
│ │ Descreva o que está…         │ │ ← BodyTextarea
│ └──────────────────────────────┘ │
│                                  0/1000
│                                  │
│ TEMA (OPCIONAL)                  │
│ [Família][Saúde][Trabalho]…      │ ← chips
│                                  │
│ ✦ Pedidos passam por moderação…  │ ← moderation note
│                                  │
│ ▮ Compartilhar com a comunidade  │ ← primary
│   Você ganha 1 ponto na sua…     │
└──────────────────────────────────┘
```

### Mudanças vs. atual (`src/pages/Submit.tsx`)
- Toggle de anonimato vira o **primeiro elemento** após a meta line — cartão muda de cor quando ativo
- Título usa input inline serif, não caixa
- Tags de tema (Família, Saúde…) viram opção opcional
- CTA: "Enviar" → "Compartilhar com a comunidade"
- Microcopy "Você ganha 1 ponto…" — sem fanfarra, em fine print

---

## 4. `/community` — Comunidade

**Propósito:** sentir a comunidade pulsando + descobrir intenções para orar.

### Layout mobile
```
┌──────────────────────────────────┐
│ Comunidade           [Filtros]   │
│                                  │
│ ┌────────────────────────────┐   │
│ │ ● AO VIVO · começa em 14m  │   │
│ │ Corrente de oração das 19h │   │ ← banner preto
│ │ 342 irmãos confirmaram…    │   │
│ │ [Entrar agora]             │   │
│ └────────────────────────────┘   │
│                                  │
│ INTENÇÕES RECENTES               │
│ ┌────────────────────────────┐   │
│ │ M  Marcos, 41 · BH  [Trab] │   │
│ │ há 12 min                  │   │ ← FeedCard
│ │ "Que eu encontre coragem…" │   │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │   │
│ │ 28 pessoas rezaram  Rezar→│   │
│ └────────────────────────────┘   │
│ [... mais FeedCards ...]         │
└──────────────────────────────────┘
```

### Layout web
3 FeedCards lado a lado em grid `grid-cols-3 gap-6`. Banner ao vivo full-width acima. Barra de filtros como chips horizontais à direita do título "Intenções recentes".

### Mudanças vs. atual
- Banner de cadeia ao vivo ganha protagonismo (era item enterrado)
- Pedidos de **Gratidão** ganham etiqueta **dourada** e CTA "Celebrar →"
- Pedidos anônimos têm avatar abstrato (não inicial)

---

## 5. `/profile` — Perfil

**Propósito:** ver caminhada sem virar app de produtividade.

### Layout
```
┌──────────────────────────────────┐
│ [←]                      [⚙]     │
│                                  │
│       ⬤   Pedro Souza             │ ← avatar grande + nome serif
│           Caminhando há 14 dias  │
│                                  │
│ ┌────────────────────────────┐   │
│ │ ✦ SUA CAMINHADA            │   │
│ │ 247 pontos de fé           │   │ ← serif 42px
│ │ Aprendiz da escuta · nv 3  │   │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│ │ ────────▰▰▰▰▰▱▱▱▱▱         │   │
│ │ 53 pontos para o próximo   │   │
│ └────────────────────────────┘   │
│                                  │
│ [82]   [31]   [9]                │ ← stat tiles
│ inter  pedi   nove                │   (serif num + caption label)
│                                  │
│ INTERCESSÕES RECENTES            │
│ ─ Pela mãe após cirurgia         │
│   Joana · há 2h    [Rezar de novo]
│ ─ Pelo diagnóstico…              │
│ ─ ...                            │
│                                  │
│ [Sair]                           │ ← outline ghost
└──────────────────────────────────┘
```

### Mudanças vs. atual
- "Caminhando há 14 dias" como subtítulo emocional
- Nível tem **nome humano** ("Aprendiz da escuta") — não "Level 3"
- Stats 3-col como mosaico de números serif, não cards
- Intercessões recentes como lista sóbria, sem destaque visual exagerado
- "Sair" como botão ghost, não vermelho

---

## 6. Páginas internas restantes

**Não mocadas individualmente, mas seguem o mesmo padrão:**

| Página | Arquivo atual | Padrão |
|---|---|---|
| Evangelho do Dia | `src/pages/DailyGospel.tsx` | Header minimal + leitura em Cormorant 20px + reflexão + chips de tag |
| Novena (lista) | `src/pages/Novenas.tsx` | Grid 2-col de cards (RitualCard adaptado) |
| Novena (rezar) | `src/pages/NovenaPrayer.tsx` | Modo foco como Pray.tsx |
| Terço Selection | `src/pages/RosarySelection.tsx` | Lista vertical com badge "Mistérios gloriosos · Quinta" |
| Terço Prayer | `src/pages/RosaryPrayer.tsx` | Modo foco com indicador de contas (10 dots) |
| Divina Promessa | `src/pages/DivinePromise.tsx` | Single card vellum + Cormorant grande + "Receber outra" |
| Mensagens | `src/pages/Messages.tsx` | Pode ser absorvido em `/community` como tab — propor brainstorm |
| Amigos | `src/pages/Friends.tsx` | Absorver em `/profile` como seção, ou tab da Comunidade |

**Auth (`src/pages/Auth.tsx`):** manter o fluxo existente, só aplicar tokens novos.
