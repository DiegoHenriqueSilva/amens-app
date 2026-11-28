# APP16 implementation plan — Faith journey, points and levels

## Audit findings

- `add_xp` currently accepts `p_user_id`, `p_xp_amount`, and `p_action` from the client without deriving the account or reward from the authenticated server context.
- Daily task completion is stored in `localStorage`, so a second device can repeat a reward and a failed RPC can still leave the task marked complete.
- The fifth-task bonus announces `+100` but calls the default `pray` reward, which currently adds `+10`.
- `useFaithPoints` fetches only on mount and does not react to account changes.
- The UI already exposes level, progress, missions, and explanatory details, so the safest implementation is to preserve the existing components and harden their contracts.

## Chosen approach

1. Add a server-authoritative daily-task completion RPC with an allowlist of task rewards.
2. Make task completion idempotent with a unique `(user_id, task_date, task_id)` record.
3. Award the fifth-task bonus through a separate unique bonus key and the announced amount.
4. Make the client update local state only after the server confirms the task and reward.
5. Keep `add_xp` for legacy event callers only after constraining it to the authenticated user and fixed action amounts.
6. Subscribe `useFaithPoints` to auth state changes and keep cache entries account-scoped and visual-only.
7. Preserve the current journey and level UI while adding accessible status text and non-blocking error feedback.

## Data and security changes

- New migration: daily task completion records, unique idempotency constraint, server RPC, and restricted execution grants.
- The migration will be created locally first. Remote application requires explicit project confirmation and the chosen Supabase access path.
- No client-provided XP amount will determine a mission reward.

## Test matrix

- APP16-T01: each mission awards its configured amount once.
- APP16-T02: fifth mission awards exactly the configured `+100` bonus once.
- APP16-T03: RPC failure leaves the mission available and awards no success toast.
- APP16-T04: repeated click, reload, second device, and retry remain idempotent.
- APP16-T05: another account cannot award points to the target account.
- APP16-T06: cache and journey reset correctly when the authenticated account changes.
- APP16-T07: level/progress/cota use the persisted server value.
- APP16-T08: keyboard, readable status, tooltip/details, 320px, desktop, and both themes.

## Evidence required for closure

- Build output and targeted automated tests.
- Database/RPC test results in an identified environment.
- Authenticated screenshots of the journey and level card.
- Manual confirmation of two accounts and a repeated-event scenario.
