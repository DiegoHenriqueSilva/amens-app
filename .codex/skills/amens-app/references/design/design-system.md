# Amens App - Design System & UI Guidelines

This document defines the visual standards, color psychology, and UI hierarchy for the `amens-app`. All developers and AI agents must follow these guidelines when creating or modifying components.

## 1. Color Palette (Religious Psychology)
- **Divine Gold (Primary Action / Holy):** Gradient `from-[#d4a017] to-[#e8c547]`. Represents the glory of God and the sacred.
- **Deep Brown (High Contrast Text on Gold):** `#3d2800`. Used for text inside gold buttons to provide a premium, readable contrast.
- **Marian Blue (Secondary Actions / Serenity):** `#1D4ED8`. Represents peace and the mantle of Mary.
- **Pearl White (Card Backgrounds / Purity):** `#FAFAFA`. Represents purity and the Holy Spirit, providing a clean reading area.

## 2. Button Hierarchy & Rules
When creating or modifying buttons, ALWAYS respect the visual hierarchy so users know what the main action is.

### Primary Call to Action (CTA)
Used for the main action of a screen (e.g., "Receber uma Causa", "Começar", "Enviar Pedido").
- **Style:** Filled with Divine Gold gradient.
- **Tailwind Classes:** `bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] border-0 shadow-md hover:opacity-90 transition-opacity font-bold`
- **Rule:** There should generally be only ONE primary button per section. Must include a `lucide-react` icon on the left.

### Secondary Actions
Used for alternative actions placed right next to a primary CTA (e.g., "Histórico").
- **Style:** Outline button using the Divine Gold color to harmonize, but without the solid fill. Changes to a stronger gold fill/text on hover to avoid disappearing on bright monitors.
- **Tailwind Classes:** `border-[#d4a017] text-[#d4a017] bg-transparent hover:bg-[#d4a017]/20 hover:text-[#b07d0b] transition-all shadow-sm font-bold`

### Tertiary Actions / Contextual
Used for minor interactions (e.g., "Enviar a um amigo", "Compartilhar").
- **Style:** Outline with Marian Blue or specific contextual colors (like Green for WhatsApp).
- **Tailwind Classes (Marian Blue):** `border-[#1D4ED8]/20 text-[#1D4ED8] hover:bg-[#1D4ED8]/10 shadow-sm transition-colors`

## 3. Tile & Card Interactions (Index Page)
Any `<Card>` component that acts as a clickable Tile on the home/index page MUST follow this exact structure to ensure visual consistency:
- **Card Wrapper:** `p-6 h-full text-center flex flex-col items-center justify-between border-primary/5 soft-shadow bg-[#FAFAFA] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 rounded-[2rem]`
- **Image/Icon Container:** A circular image at the top (`w-14 h-14 bg-transparent rounded-full flex items-center justify-center mb-4 overflow-hidden`) with the `img` using `w-full h-full object-cover rounded-full drop-shadow-md`.
- **Text Area:** Title (`text-lg font-bold mb-2`) and a concise subtitle (`text-xs text-muted-foreground leading-tight mb-4 font-medium`).
- **Action Button:** A primary CTA button at the bottom using `w-full rounded-full text-xs py-5 font-bold shadow-md bg-gradient-to-br from-[#d4a017] to-[#e8c547] text-[#3d2800] hover:opacity-90 transition-opacity border-0`.

## 4. Internal Pages (Opened from Tiles)
When creating or modifying an internal page (like "Orar por uma Causa", "Enviar Pedido", etc.), you MUST follow this structure to maintain the artistic aesthetic over the global background:
- **Background & Wrapper:** The main `div` MUST have `min-h-screen bg-background/70 backdrop-blur-sm relative overflow-hidden`.
- **Ambient Blurs (Optional but recommended):** Add subtle background blobs like `<div className="absolute top-[-6rem] left-[-4rem] w-80 h-80 bg-primary/5 rounded-full blur-3xl" />`.
- **Header Structure:** 
- A **Back Button** at the top left using `<Button variant="ghost" size="icon">` with `<ArrowLeft />`.
  - A **Centered Title Block** with the following structure:
    - Small golden detail: `<p className="text-sm uppercase tracking-[0.25em] text-primary mb-2">✦</p>`
    - Main Title: `<h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">Page Title</h1>`
    - Golden Divider: `<div className="divider-gold max-w-[10rem] mx-auto mb-3" />`
    - Subtitle: `<p className="text-muted-foreground">Page Subtitle</p>`

## 5. Unauthenticated States
When a user accesses a page that requires authentication (or where actions require authentication):
- The main action buttons (like "Receber uma Causa") should retain their original text but be visually blocked or disabled (e.g., using `opacity-60 pointer-events-none`).
- The UI must visually reflect the restricted state. Consider adding a locked overlay, dimming the content, or using a pop-up (like `InviteGatePopup`) so the user understands they cannot perform actions in the current state until they authenticate.
