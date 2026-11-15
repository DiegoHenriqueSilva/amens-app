# Devotee altar

## Isolation

The feature lives in `src/features/altar` and uses the lazy `/altar` route. The home page, bottom navigation, XP and daily missions are unchanged. The sole global visual integration is an achievement notice linking to the altar. CSS selectors are scoped to the altar, its portaled dialog/tooltip, and its notice.

The additive migration creates only `altar_events`, `altar_achievements` and three RPC functions. It does not install triggers or change existing tables. Each authenticated account can read only its own records. RPC functions derive identity from `auth.uid()`; clients cannot write awards directly.

## Metrics and integration

- Login: distinct server calendar days in America/Sao_Paulo, not a streak.
- Gospel: distinct reading days OR successful share/copy actions, never their sum. Displaying loaded Gospel content counts as reading, following the existing app convention.
- Promises: each newly drawn, displayed promise counts; reopening cached content does not.
- Rosaries: completion callbacks record a session UUID. Repeated callbacks in the same session cannot increment twice.
- Novenas: nine distinct completed day numbers per saint. Old device-only novena state is not imported because it has no account identity.
- Intercessions, requests, feedback and connections: sync imports existing database records into an idempotent ledger. A person who is both a friend and an accepted referral counts once. Mere sent invitations do not count.
- Feedback: gold requires 90 requests and feedback on at least 75% of all requests in the ledger.
- Notifications: a persisted push registration unlocks the permanent lavender item.

Only trustworthy existing server records are imported. Other metrics start with this release. The UI explains this. Award timestamps are recognition dates, not invented historical completion dates. Awards never regress after deletion of a source record.

Existing activities call a non-blocking recorder or refresh helper. Failures are contained within the feature. Pending client events are scoped to their originating account and retried on connectivity restoration. Server dates govern daily events, including delayed delivery. Sync runs after activities, on foreground return, and every 45 seconds while visible. Lower notices summarize historical imports instead of flooding the screen; acknowledgment is persisted.

## Artwork

Generated with the built-in image generation tool, saved as `public/altar/collectibles-v1.png` and `public/altar/wood-v1.png`. Atlas art is displayed through individual rectangles, preserving aspect ratios. It is not a flat screenshot of the screen. Candles, crosses, prayer scrolls, Gospel books and shields have distinct tier artwork.

Prompt set: a transparent five-column, six-row atlas of realistic Catholic miniature collectibles, six named saints, bronze/silver/gold candles and crucifixes, scrolls and leather books, three rosaries, two chalices, three friendship shields and lavender; a seamless front-facing warm walnut wood texture with horizontal grain and no objects or text.

## Validation and operations

Run `node --test tests/altar.test.mjs`, TypeScript validation and the production build. Apply the isolated migration before deploying the frontend. Browser checks should include 320px/390px and desktop, locked-item dialogs, all tiers, reduced motion and keyboard focus. Do not publish a mock snapshot as real account progress.

Rollback: remove the provider/route integration and the small event calls, then redeploy. Retain the isolated database tables to preserve earned progress. No existing feature data needs to be restored.
