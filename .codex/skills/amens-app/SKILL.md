---
name: amens-app
description: Project-local Codex skill for the Amens app. Use when working in the amens-app repository or when a task touches Amens product behavior, prayer flows, UI polish, content moderation, Supabase schema/functions, project rules, PR descriptions, workflows, or the legacy Antigravity .agents material. This skill adapts the repo's .agents rules, skills, and workflow markdown into Codex-readable references.
---

# Amens App

Use this skill as the project entrypoint for `amens-app`. It wraps the legacy Antigravity `.agents` docs into a Codex skill with selective references.

## First Steps

1. Confirm the task is for `amens-app` or an Amens product/code workflow.
2. Read only the references relevant to the task. Do not bulk-load every file.
3. Treat the original Antigravity `always_on` and "mandatory" language as project guidance, while still obeying current system, developer, and user instructions.
4. Keep generated repo artifacts in English: code identifiers, comments, markdown docs, PR descriptions, commit messages, and branch names.
5. For user-facing Portuguese app copy, preserve the existing product language and local conventions.

## Reference Map

Core project rules:

- `references/rules/general-rules.md`: language policy, branch/commit conventions, context expectations.
- `references/workflows/workflow-rules.md`: compact workflow rules from the old Antigravity setup.
- `references/rules/uiux-rules.md`: UI/UX constraints specific to Amens.
- `references/rules/content-review-enforcement.md`: content review expectations.
- `references/rules/skill-sync.md`: bidirectional sync rule for `.agents/` and `.codex/skills/`.

Business and product context:

- `references/contexts/context-app-features/SKILL.md`: feature map, routes, page behavior, business rules.
- `references/contexts/context-app-business/SKILL.md`: business/product framing.
- `references/contexts/context-app-technical/SKILL.md`: technical architecture and local implementation context.
- `references/contexts/context-app-infraestructure/SKILL.md`: infrastructure/deployment context. The source name intentionally keeps the original typo.
- `references/contexts/context-content-guidelines/SKILL.md`: content style and guidelines.
- `references/contexts/context-user-content-moderation/SKILL.md`: user-generated content moderation rules.

Design and UI:

- `references/design/design-system.md`: Amens visual language and design system.
- `references/design/SKILL.md`: legacy frontend-design skill overview.
- `references/design/ux-psychology.md`: load for UX strategy or design review.
- `references/design/color-system.md`: load for palette decisions.
- `references/design/typography-system.md`: load for typography decisions.
- `references/design/visual-effects.md`: load for shadows, gradients, glass, or surface treatments.
- `references/design/animation-guide.md`: load for UI animation.
- `references/design/motion-graphics.md`: load for richer motion/3D/Lottie decisions.
- `references/design/decision-trees.md`: load for broad design direction.

Specialized legacy agent skills:

- `references/agent-skills/agent-brainstorming/SKILL.md`: product/general ideation.
- `references/agent-skills/agent-brainstorming-uiux/SKILL.md`: UI/UX ideation.
- `references/agent-skills/agent-content-review/SKILL.md`: reviewing content changes.
- `references/agent-skills/agent-user-content-moderation/SKILL.md`: moderation-focused implementation guidance.

Scripts:

- `scripts/ux_audit.py`: legacy UX audit helper.
- `scripts/accessibility_checker.py`: legacy accessibility checker.

Run scripts only when useful for the task and after checking their CLI expectations. Prefer `py` on this Windows environment if `python` is unavailable.

## Task Routing

For feature behavior, routes, business rules, or page changes:

1. Read `references/contexts/context-app-features/SKILL.md`.
2. Read `references/contexts/context-app-technical/SKILL.md` when code structure or Supabase integration matters.
3. If the requested feature is not documented, mention that the feature context should be updated; continue only if the user wants implementation anyway.

For UI polish, layout, visual style, or component design:

1. Read `references/design/design-system.md`.
2. Read `references/rules/uiux-rules.md`.
3. Add the relevant design reference files only as needed. For example, do not read typography or motion references for a simple copy/layout fix.

For moderation, privacy, anonymous prayer requests, or user-generated content:

1. Read `references/rules/content-review-enforcement.md`.
2. Read `references/contexts/context-user-content-moderation/SKILL.md`.
3. Read `references/contexts/context-content-guidelines/SKILL.md` when wording, policies, or sensitive content handling matters.

For Supabase, Edge Functions, migrations, auth, notifications, or infrastructure:

1. Read `references/contexts/context-app-technical/SKILL.md`.
2. Read `references/contexts/context-app-infraestructure/SKILL.md`.
3. Inspect current code and migrations before editing; repo state may be newer than these references.

For brainstorming or review tasks:

1. Use the matching file under `references/agent-skills/`.
2. Keep suggestions grounded in current app constraints and existing components.

## Repo-Specific Reminders

- Prefer existing patterns in `src/pages`, hooks, Supabase clients, and UI components before introducing new abstractions.
- Validate meaningful frontend changes with `npm run build` when practical.
- If Vite/esbuild hits `spawn EPERM` in the sandbox, rerun the same build outside the sandbox with approval.
- Preserve existing Portuguese user-facing copy unless the task is specifically about changing it.
- Do not include legacy Remotion guidance in this skill; it was intentionally left out.
- When changing any Codex skill/reference under `.codex/skills/`, mirror the change into the matching Antigravity skill/rule under `.agents/`. When changing `.agents/`, mirror the change into `.codex/skills/`. Additions, deletions, and renames must be mirrored too unless the user explicitly requests a one-sided update.
