# APP16 — Faith journey, points and levels

**Status:** Implementation in progress; local validation passed  
**Branch:** `codex/feature/app16-faith-journey`

## Findings addressed

- Daily missions no longer use `localStorage` as the authority for completion or rewards.
- Mission rewards are allowlisted and calculated by the server.
- A unique account/date/task key prevents duplicate rewards across reloads and devices.
- The fifth-mission bonus is persisted separately and awards the announced `+100` exactly once.
- Legacy fixed event rewards are constrained to the authenticated account and fixed action amounts.
- Faith-points cache is account-scoped and refreshes on authentication changes.
- Mission controls are keyboard-operable buttons with readable status labels.

## Validation performed

- `npm run build` passed.
- `git diff --check` passed after cleanup.
- The migration and client contracts were reviewed together for task ids and reward values.

## Database deployment status

The migration exists locally at:

`supabase/migrations/20261128000000_app16_server_authoritative_faith_journey.sql`

It has not been applied to the remote Supabase project yet. Remote application
must be performed and verified before the new journey flow can be considered
available in a deployed build.

## Required verification after migration

- Execute each mission once and verify the configured reward.
- Complete five missions and verify one `+100` bonus.
- Repeat a mission from another tab/device and verify no additional reward.
- Force an RPC failure and verify the mission remains available.
- Attempt a reward for another account or an arbitrary amount and verify rejection.
- Switch accounts and verify points and missions do not leak across sessions.
- Capture authenticated screenshots of the home/profile journey and level details.
