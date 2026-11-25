# APP03 prayer flow

Implementation base: `0063610`. Work is linked to planning issue APP03; its private audit stays in the planning repository.

Receiving a cause or accepting a shared cause records one intercession immediately. Reading a public link, reopening history, reacting, sharing and requesting a suggestion do not spend another opportunity. When no eligible member request remains, the server returns a curated general intention through the same UUID cause contract. It spends one daily intercession, appears in history and exposes no origin label, special route or client-visible behavior. Limits are 2/3/4/5/6 at levels 1/5/10/15/20; administrators are unlimited. The day is America/Sao_Paulo.

The selected approach is a database command that selects and records the cause in one transaction. A client-generated operation identifier makes a retry return the same result. Keeping separate client selection, insertion and counter updates would require recovery across three independent operations and would expose author identifiers. Safe server projections serve links, history and the community feed. Reaction removal uses soft deletion.

The existing card design and available actions are retained. Failures leave the current cause and selections available for retry. Unavailable links do not silently receive another cause. Account changes invalidate pending page results. History includes unavailable placeholders rather than returning moderated content.

AI requests move to a server endpoint with authentication, server-side access checks, a daily attempt budget, timeout and cache. The provider receives a broad intention category, not the original cause, names, location or account identifiers. This reduces specificity in exchange for data minimization. Profile devotion is included only when it matches the application's known options. The Gospel consumer uses the same endpoint with a shared daily cache so removing the browser key preserves that existing feature. Provider configuration and deployment require environment validation before release.

## Content review before implementation

Self-review against the project's Catholic content guidelines: **ADJUSTED**. Remove the mandatory repeated opening and invented counts of people praying. Identify generated text as optional support; do not promise a grace, medical outcome or divine intervention. Explain consumption at receiving, the Sao Paulo reset, and actual persistence failures. Preserve the existing reaction vocabulary and respectful tone.

The 2026-11-17 copy/design revision uses **Intercessões diárias** throughout this flow instead of administrative quota language. `DailyIntercessions` shows the available count once as text, a single next-level line and a compact midnight/Sao Paulo clock at the lower right. The consumption explanation is available through the keyboard-accessible **Como funciona** popover. Loading uses a skeleton with a screen-reader announcement. The review verdict is **ADJUSTED**: direct, pastoral language with no spiritual reward claims.

`AppFrame` reserves a separate navigation row on `/pray`, and the prayer content scrolls in the area above it. It includes the navigation safe area, prevents the menu from drawing over long requests, and resets the reading area when the shared-link query changes. Other routes retain their existing wrapper and fixed navigation.

The light wallpaper overlay belongs to the reading viewport, so it reaches the menu even when the request page is shorter than the screen. The inner prayer page stays transparent to avoid applying the overlay twice.

## Verification and release

Use synthetic fixtures for SQL authorization, quota, restricted causes, retry behavior, reaction and invite atomicity, and AI limits. Browser fixtures must be labelled as simulated and must not contact production. Unit tests, build and local database results do not prove a hosted migration or provider configuration. The delivery report records checks actually executed and outstanding cross-feature validation. Apply the migration before releasing the frontend, then deploy `generate-prayer` and configure server-only `GEMINI_API_KEY` and `GEMINI_MODEL`. Remove and rotate any key previously shipped through `VITE_GEMINI_API_KEY`.

Migrations: `20261116050000_app03_prayer_commands.sql` and `20261116060000_prayer_ai_budget.sql`. Their timestamps avoid the fetched ADM00/01/02 migration identifiers. No hosted migration, function deployment, secret change or production notification has been performed as part of local validation.

The global XP API and browser-backed daily task rewards are maintained by APP16. These commands enforce allowance for the supplied server XP total; they do not make that XP source trustworthy. APP16 must close arbitrary XP mutation and confirm reward persistence before claiming that level-based entitlement is fully protected. Existing client reward messages are also subject to that integration review. Broad public-profile privacy is APP21's separate contract. Neither issue is hidden by the safe prayer projection.

The request budget limits provider attempts, not a currency amount. Current caps are 3 attempts per member per Sao Paulo day, 100 installation-wide and 3 for the shared Gospel; failed attempts count. Provider/account billing controls still need verification. The model is required server configuration rather than a hardcoded claim about current availability. See [Google API key guidance](https://aistudio.google.com/docs/api-key) and [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).

## Reproduce the local checks

Use Node 22 for tests importing TypeScript. Test tooling is kept in ignored `tmp/app03-tools`; it does not change application dependencies:

```powershell
npm install --prefix tmp/app03-tools --no-save --no-package-lock pg playwright-core axe-core
docker run --detach --name amens-app03-test-20261116 --publish 127.0.0.1:55483:5432 --env POSTGRES_PASSWORD=app03-local-fixture public.ecr.aws/supabase/postgres:17.6.1.084
node tests/prayer-flow-database.mjs
```

The password above is exclusively for this disposable local fixture. The scripts reject remote database hosts and ports other than 55483, create a separate test database, then remove that test database. The focused schema fixture is not a full Supabase reset. Only the midnight test injects clock reads into two installed functions and restores their original definitions immediately afterward. Concurrency tests use two actual PostgreSQL connections.

Start Vite on `127.0.0.1:4176` and run `node tests/prayer-flow-browser.mjs` for the browser fixture. Chrome must be installed at the path in that script, or the executable path must be adapted. It intercepts external HTTP requests, simulates the authentication/API boundary, uses the disposable database for prayer commands, and writes screenshots/accessibility results to ignored `tmp/sandbox/app03-implementation-2026-11-17`. It does not exercise hosted PostgREST, real authentication, provider generation, push delivery or external font loading.

Run the six existing `.test.mjs` files plus `prayer-flow.test.mjs` and `prayer-ai.test.mjs` with `node --test`. Run `tsc -p tsconfig.app.json --noEmit`, `npm run build` and `deno check supabase/functions/generate-prayer/index.ts`. The Supabase client remains globally typed as `any` in the pre-existing integration, so typecheck alone cannot validate the deployed schema. `tests/prayer-admin-compatibility.mjs` optionally checks fetched ADM00 policies and ADM02 account triggers in both integration orders; it does not merge or validate the entire sibling branches.
