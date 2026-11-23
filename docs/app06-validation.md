# APP06 — Daily Gospel & Full Liturgy Restoration Validation Record

**Package:** APP06 — Daily Gospel & Full Liturgy Restoration
**Branch:** `codex/feature/app06-daily-gospel-liturgy`
**Route:** `/daily-gospel`
**Status:** Approved & Verified (All 7 Test Scenarios Passed)

---

## 1. Scope & Acceptance Criteria

The objective of APP06 is to restore the complete daily Catholic liturgy experience, date selection, calendar navigation, dynamic reading tabs (1st Reading, Responsorial Psalm, 2nd Reading when applicable, and Gospel), independent video and AI reflections, honest unavailability fallbacks, and exact integration with the Altar companion metrics.

### Acceptance Criteria Matrix

| Case | Category | Description | Status | Evidence / Notes |
|---|---|---|---|---|
| **APP06-T01** | Functional / Concurrency | Fast date switching across dates without obsolete response overrides (*race condition protection*). | **PASSED** | AbortController & request counter pattern ensures only the latest user selection is displayed. |
| **APP06-T02** | Resiliency / Fallback | Simulated 500 HTTP errors or network cuts on the liturgy API. | **PASSED** | Displays explicit "Liturgia Oficial Indisponível" alert, "Texto de Apoio Espiritual (Contingência)" badge, and Retry action. **Zero** false `gospel_read` events sent to Altar. |
| **APP06-T03** | Readings / Layout | Dynamic tabs: weekdays with 3 tabs vs Sundays/Solemnities with 4 tabs. | **PASSED** | Weekday renders 1st Reading, Psalm, Gospel; Sunday dynamically adds 2nd Reading. No empty tabs. |
| **APP06-T04** | Sharing / Integrity | Native share cancellation (`AbortError`) vs successful clipboard/native share. | **PASSED** | Abort does not trigger false success toast or altar events. Successful share records `gospel_share` RPC. |
| **APP06-T05** | Service Isolation | Independent failure of YouTube API or Gemini AI summaries. | **PASSED** | Scripture remains fully readable and navigable; fallback video notice is displayed clearly. |
| **APP06-T06** | Navigation / Calendar | Popover calendar picker, previous/next day buttons, and "Ir para Hoje" quick reset. | **PASSED** | Full bidirectional navigation with synchronized liturgical metadata, liturgical color, and quick reset. |
| **APP06-T07** | Altar Integration | Verification of `altar_record_event` RPC calls and local queue safety. | **PASSED** | `gospel_read` dispatched only on valid official liturgy for today; `gospel_share` dispatched upon confirmed sharing. |

---

## 2. Visual & Viewport Verification

- **Mobile Viewport (390 x 844):** Verified layout ergonomics, font legibility on cards, contrast against background, and safe-area spacing `pb-[calc(7rem+env(safe-area-inset-bottom))]` preventing collision with fixed bottom navigation.
- **Narrow Mobile Viewport (320 x 568):** Validated on small screen size; calendar navigation and tab bar scale without wrapping anomalies or clipped text.

### Visual Evidence Artifacts

1. `artifacts/app06/app06-liturgy-mobile-390.png` — Mobile baseline of full liturgy card.
2. `artifacts/app06/app06-liturgy-tabs-psalm.png` — Responsorial Psalm tab with highlighted antiphon and verses.
3. `artifacts/app06/app06-liturgy-sunday-4tabs.png` — Sunday liturgy with 4 dynamic tabs including Second Reading.
4. `artifacts/app06/app06-fallback-unavailability.png` — Honest unavailability banner with retry action and devotional contingency badge.
5. `artifacts/app06/app06-calendar-popover.png` — Interactive calendar popover for date navigation.
6. `artifacts/app06/app06-narrow-320.png` — Mobile 320 px viewport verification.

---

## 3. Automated Test Suite Execution

All test cases were executed automatically via Playwright against the local production build preview (`http://127.0.0.1:4180/daily-gospel`):

```text
=== RESUMO FINAL DOS TESTES APP06 ===
┌─────────┬─────────────┬───────────────────────────────────────┬────────┐
│ (index) │ id          │ name                                  │ passed │
├─────────┼─────────────┼───────────────────────────────────────┼────────┤
│ 0       │ 'APP06-T02' │ 'Falha de origem e Fallback honesto'  │ true   │
│ 1       │ 'APP06-T03' │ 'Leituras opcionais e abas dinâmicas' │ true   │
│ 2       │ 'APP06-T01' │ 'Datas e concorrência'                │ true   │
│ 3       │ 'APP06-T06' │ 'Navegação e Calendário'              │ true   │
│ 4       │ 'APP06-T04' │ 'Compartilhamento e cancelamento'     │ true   │
│ 5       │ 'APP06-T05' │ 'Resiliência de IA e Vídeo'           │ true   │
│ 6       │ 'APP06-T07' │ 'Eventos do Altar e Missões'          │ true   │
└─────────┴─────────────┴───────────────────────────────────────┴────────┘
TODOS OS TESTES APROVADOS COM SUCESSO! 🎉
```
