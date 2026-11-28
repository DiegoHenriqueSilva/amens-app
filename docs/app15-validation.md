# APP15 — Prayer flow and network visualization

**Status:** Completed and approved after manual validation  
**Branch:** `codex/feature/app15-prayer-network`

## Product decisions

- `/tree` is public.
- The network shows the name selected by each user only when the profile allows public display.
- Anonymous prayer requests and profiles without public-name consent are rendered as `Intercessor`.
- The official aggregate remains `Pontos de Fé Coletivos`.
- The existing Remotion visualization is preserved with a textual equivalent and a reduced-motion path.

## Changes in this branch

- Added explicit loading, empty, and Supabase error states.
- Added retry action when network data cannot be loaded.
- Added a plain-language explanation of the network and its names.
- Added a recent-prayers text list as an equivalent to the animated names.
- Applied prayer-request status/deletion filters before displaying activity.
- Enforced the profile privacy choice when resolving displayed names.
- Kept the `Orar por uma causa` CTA available independently of animation state.
- Added reduced-motion behavior and removed random sparkle positioning from the page.
- Added a deterministic Playwright smoke test and a current screenshot.

## Validation matrix

| Case | Result |
| --- | --- |
| APP15-T01 — direct route, back, and `/pray` CTA | Approved |
| APP15-T02 — loading, populated, empty, and error states | Smoke passed for populated state; controlled empty state and 503 failure state passed |
| APP15-T03 — privacy fallback | Approved with real test accounts |
| APP15-T04 — reduced motion, keyboard, enlarged text | Approved |
| APP15-T05 — 320px, desktop, low height | Approved; landscape removed from scope and Android locked to portrait |
| APP15-T06 — themes | Approved |
| APP15-T07 — build and deterministic smoke | `npm run build` and smoke passed |

## Evidence

- `npm run build` passed.
- `node tests/app15-tree-smoke.e2e.mjs` passed against the local Vite server.
- The smoke test verified public access, explanatory text, reduced motion, no horizontal overflow at 320px, and navigation to `/pray`.
- A controlled empty response showed the empty-network state without synthetic activity.
- A controlled 503 response showed the error state and retry action.
- The product owner completed all remaining manual checks and confirmed that the flows worked correctly.

![APP15 tree at 320px](../artifacts/app15-tree-320.png)

## Conclusion

APP15 is complete and approved for pull request review. All automated and manual
validation cases passed. Landscape is intentionally disabled in the Android app
and is not part of the supported APP15 experience.
