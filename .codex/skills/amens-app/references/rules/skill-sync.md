---
trigger: always_on
---

# Skill Sync Rule

Keep the Antigravity and Codex skill systems synchronized.

## Required Mapping

- Antigravity skills and rules live under `.agents/`.
- Codex project skills live under `.codex/skills/`.
- The main Codex project skill is `.codex/skills/amens-app/SKILL.md`.
- Codex references adapted from Antigravity docs live under `.codex/skills/amens-app/references/`.

## Bidirectional Sync Requirement

Whenever a skill, rule, workflow, or reference is changed in one system, apply the corresponding change in the other system in the same task.

This includes:

- Editing an existing Antigravity skill or rule under `.agents/`.
- Editing an existing Codex skill or reference under `.codex/skills/`.
- Adding a new Antigravity skill, rule, workflow, or reference.
- Adding a new Codex skill, rule reference, workflow reference, or project context reference.
- Deleting or renaming a skill, rule, workflow, or reference in either system.

## Expected Agent Behavior

Before finishing any task that touches `.agents/` or `.codex/skills/`:

1. Identify whether the change has a counterpart in the other system.
2. Add, update, rename, or delete the counterpart as needed.
3. If a one-to-one counterpart does not exist, update the nearest project entrypoint or reference map so future agents can discover the change.
4. Mention any intentional divergence clearly in the final response or PR description.

Do not leave Codex-only or Antigravity-only skill changes unless the user explicitly asks for a one-sided update.
