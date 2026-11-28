# APP15 implementation plan — Prayer flow and network visualization

## Current audit

- `/tree` is registered as a direct route and is reachable from the application shell.
- `Tree.tsx` reads aggregate `user_xp` data and recent `prayer_requests` directly from Supabase.
- The page currently has no explicit distinction between an empty network, a loading state, and a query failure.
- Recent names are derived from profiles, but the query does not document or enforce the privacy fallback in a single server-side contract.
- The Remotion visualization is the primary visual surface; the meaning of the network is not explained in equivalent text.
- The CTA already routes to `/pray`, but the discovery path and return behavior need evidence.
- The page uses `Math.random()` during render for sparkle positions, which can produce unstable visual output and complicate deterministic tests.

## Options

### Option A — Preserve the visual tree and add an accessible data layer (recommended)

Keep the current Remotion tree and its visual identity. Add:

- explicit loading, empty, and error states;
- a short explanation of what points, names, and flow represent;
- a text summary/list equivalent to the animation;
- a reduced-motion path that keeps the tree static and keeps the CTA available;
- a deterministic sparkle layout;
- a clear back action and an explicit `Orar por uma causa` CTA to `/pray`.

Pros: lowest product risk, preserves the existing feature, satisfies accessibility without removing the visual network.

Tradeoff: the page remains dependent on the existing Remotion player and needs careful mobile testing.

### Option B — Replace the Remotion surface with a CSS/SVG network

Represent the same data with a lightweight responsive SVG/CSS tree and semantic labels.

Pros: easier sizing and accessibility control, smaller runtime surface.

Tradeoff: changes the established visual language and risks losing the intended animation; requires a larger visual review.

### Option C — Data-first network card with optional animation

Make the points, activity summary, and recent public names the primary content. Keep the animation as a secondary enhancement when motion is allowed.

Pros: strongest resilience and clearest meaning when data is empty or unavailable.

Tradeoff: less immediate visual impact and a broader information hierarchy change.

## Proposed test matrix

- APP15-T01: direct `/tree` access, back navigation, and CTA to `/pray`.
- APP15-T02: loading, populated network, empty network, and Supabase failure; no fake metrics in any state.
- APP15-T03: privacy fallback for anonymous or hidden names; no author data leakage.
- APP15-T04: reduced motion, keyboard navigation, enlarged text, and screen-reader-equivalent summary.
- APP15-T05: 320 px portrait, landscape, desktop, and low-height viewport.
- APP15-T06: light/legacy theme and current theme where both remain available.
- APP15-T07: build and targeted smoke test with deterministic output.

## Open questions

1. Should `/tree` be public to anonymous visitors, with only the `Orar` action requiring authentication, or should the entire network be gated?
2. May the network show public display names, or should APP15 use only anonymous labels such as “Intercessor” until an explicit privacy contract is confirmed?
3. Should the aggregate metric remain “Pontos de Fé Coletivos”, or should it represent prayer activity instead of XP?

## Decision

The product owner selected Option A and confirmed:

- `/tree` is public; the prayer action can continue to enforce its own authentication rules.
- User-selected public names may be shown; anonymous profiles and anonymous prayer requests must remain `Intercessor`.
- `Pontos de Fé Coletivos` remains the official aggregate metric.

Implementation may proceed with these decisions as the approved contract.
