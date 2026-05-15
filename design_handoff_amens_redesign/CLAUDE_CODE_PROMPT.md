# Prompt pronto para o Claude Code

Cole o bloco abaixo no Claude Code, dentro do seu repositório `amens-app` aberto.

---

## 📋 Prompt (copie a partir daqui)

> Estou aplicando um redesign visual no `amens-app` chamado **"Papel & Tinta"**. Toda a especificação está dentro da pasta `design_handoff_amens_redesign/` na raiz do repositório.
>
> **Antes de começar a editar qualquer arquivo:**
>
> 1. Leia **na ordem**: `README.md`, `DESIGN_TOKENS.md`, `COMPONENTS.md`, `SCREENS.md`, `MIGRATION.md`, `RESPONSIVE.md`.
> 2. Leia também as regras do meu projeto: `.agents/WORKFLOW_RULES.md`, `.agents/rules/uiux-rules.md`, `.agents/rules/general-rules.md`, `.agents/rules/content-review-enforcement.md` e `.agents/design-system.md` (este último vai ser **substituído** por DESIGN_TOKENS.md ao final).
> 3. Abra `design_handoff_amens_redesign/prototypes/Améns Redesign.html` e `Améns Web.html` no navegador para ter referência visual.
>
> **Regras inegociáveis** (vêm do `.agents/`):
>
> - **English-only no código.** Variáveis, comentários, commit messages — tudo em inglês. UX copy em português.
> - **Brainstorm antes de inventar.** Se eu pedir uma tela ou componente que **não** está em `SCREENS.md` nem em `context-app-features/SKILL.md`, **pare** e me peça para atualizar a skill primeiro.
> - **Content review obrigatório.** Qualquer texto novo na UI precisa passar pelo critério da skill `agent-content-review` (sem promessas transacionais, sem gamificação predatória, tom acolhedor). Mostre a verificação no plan antes de codar.
> - **Git workflow.** Crie a branch `claudecode/refactor/amens-design-paper-and-ink` (ou nome equivalente em inglês) antes de tocar em qualquer arquivo. Confirme comigo antes de fazer push.
>
> **Plano de execução** (em `MIGRATION.md`, etapas 1–11). Faça **uma etapa por commit**, descritiva em inglês:
>
> 1. Tokens base (`src/index.css`, `tailwind.config.ts`)
> 2. Componentes base (`src/components/ui/*`)
> 3. BottomNav (4 itens + FAB)
> 4. TopBar (desktop)
> 5. Página Hoje (`src/pages/Index.tsx`)
> 6. Página Submit
> 7. Página Pray
> 8. Página Profile
> 9. Página Community
> 10. Páginas internas restantes
> 11. Limpeza
>
> **Para cada etapa, antes de implementar:**
>
> - Liste os arquivos que você vai mudar
> - Mostre o `diff` resumido pro maior arquivo
> - Aponte qualquer texto novo e mostre a auto-revisão de conteúdo
> - Aguarde meu OK
>
> **Validação visual:** ao terminar cada página, rode `npm run dev` e abra a página correspondente. Compare lado a lado com o `.html` em `prototypes/` e me mostre uma captura.
>
> **Capacitor:** ao final, rode `npx cap sync ios && npx cap sync android` e me sinalize se aparecer warning.
>
> Pode começar pela **Etapa 1 — Tokens base**. Apresente o plano e me espere confirmar.

---

## Antes de colar o prompt

Faça duas coisas:

1. **Mova `design_handoff_amens_redesign/` para a raiz do seu repositório `amens-app`** (no mesmo nível de `src/`, `.agents/`, etc.). O Claude Code precisa enxergar a pasta.
2. Confirme que o repo está limpo: `git status` deve estar sem alterações pendentes.

```bash
# dentro do amens-app já clonado
unzip design_handoff_amens_redesign.zip
git status
# deve mostrar: "Untracked files: design_handoff_amens_redesign/"
git add design_handoff_amens_redesign/
git commit -m "docs: add Paper & Ink redesign handoff"
git push
```

A partir daí o Claude Code pode trabalhar — ele vai criar a branch de refactor por cima.

---

## Como ajustar antes de aplicar

Se algo da proposta não te agrada (nome de nível, cor de acento, posição do FAB, etc.), edite os `.md` correspondentes **antes** de colar o prompt. O Claude Code segue cegamente o que está escrito ali.

Mudanças comuns:
- **Trocar cor de acento:** editar `DESIGN_TOKENS.md` § 1 (paleta) — alterar o hex de `marian` ou `gold`
- **Outro nome para "Corrente":** editar `COMPONENTS.md` § 3 — trocar label do BottomNav
- **Manter um tile específico da Home antiga:** editar `SCREENS.md` § 1
- **Aplicar só em 1 tela primeiro:** editar `MIGRATION.md` — remover as etapas que não quer agora

---

## Se o Claude Code travar

Os pontos de bloqueio mais prováveis:

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Preciso entender melhor X" | Skill `context-app-features` desatualizada | Atualizar essa skill com a feature antes |
| "O texto Y precisa de revisão" | content-review enforcement | Aprovar/ajustar conforme `agent-content-review` |
| "Não encontrei o arquivo Z" | Pasta de handoff fora da raiz do repo | Mover `design_handoff_amens_redesign/` para a raiz |
| Build quebra após Etapa 1 | shadcn aliases não atualizados | Revisar `DESIGN_TOKENS.md` § 6 — confirmar que `--background`, `--card`, etc. apontam para tokens novos |
