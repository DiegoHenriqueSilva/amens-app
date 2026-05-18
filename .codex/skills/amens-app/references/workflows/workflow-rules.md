# Amens App - AI & Developer Rules

These rules apply to all developers and AI coding assistants working on the `amens-app` repository.

## 1. Language Policy: ENGLISH ONLY
- **Code:** All variable names, function names, classes, etc., MUST be in English.
- **Comments:** All code comments and docstrings MUST be in English.
- **Commits:** All git commit messages MUST be in English.
- **Branches:** All branch names MUST be in English.
- **Documentation:** All `.md` files, pull request descriptions, and issue tracking MUST be in English.
- *Note:* The chat interaction with AI assistants (like Antigravity) can be in Portuguese or any other language, but the generated output applied to the repository MUST strictly follow the English-only rule.

## 2. Git Workflow & Branching Strategy
Before starting any new task, developers and AI agents MUST follow this exact sequence:
1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b <username>/feature/<task-name>`

### Branch Naming Convention
- Format: `<username>/<type>/<kebab-case-task-name>`
- Types: `feature`, `fix`, `chore`, `refactor`
- *AI Assistants:* When asked to start a task, the AI MUST ask the user for the task context and suggest a branch name in English before proceeding.
