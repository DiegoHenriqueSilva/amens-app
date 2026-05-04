---
trigger: always_on
---

# Améns App - General AI & Developer Rules

Estas regras se aplicam a todos os desenvolvedores e assistentes de IA (como Antigravity) operando no repositório `amens-app`.

## 1. Language Policy: ENGLISH ONLY
- **Code:** Todas as variáveis, funções, classes, métodos e IDs DEVEM ser em inglês.
- **Comments:** Todos os comentários de código e *docstrings* DEVEM ser em inglês.
- **Commits:** Mensagens de commit do git DEVEM ser em inglês.
- **Branches:** O nome das branches DEVE ser em inglês.
- **Documentation:** Qualquer arquivo markdown que explique código, Pull Requests e issues devem ser em inglês. (Exceção apenas para os artefatos locais de planejamento do chat, caso o usuário interaja em português).
- *Nota:* Embora a interação no chat com a IA possa ser em português, o output gerado que será salvo dentro do repositório `.ts`, `.tsx` DEVE estritamente seguir a política English-Only.

## 2. Git Workflow & Branching Strategy
Antes de iniciar qualquer nova funcionalidade, desenvolvedores e IA DEVEM seguir o fluxo:
1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b <username>/<type>/<task-name>`

### Branch Naming Convention
- **Formato:** `<username>/<type>/<kebab-case-task-name>`
- **Tipos Permitidos:** `feature`, `fix`, `chore`, `refactor`
- **Diretriz para a IA:** Se o usuário solicitar uma alteração e você estiver criando um script de execução, pergunte ou sugira a criação de uma branch no padrão inglês antes de aplicar mudanças complexas.

---

## 3. Context Awareness & Decision Making

- Nunca assuma informações arquiteturais ou de negócio que estejam ausentes no seu prompt imediato. **Sempre prefira consultar os contextos definidos nas skills**.
- Se faltar informação para concluir uma tarefa, **pare e peça esclarecimentos**, sugerindo a atualização da skill correspondente.
- Mantenha a consistência arquitetural: se o projeto usa um padrão específico para um hook ou componente, não introduza um padrão externo conflitante.

---

## 4. 🚨 Regra de Ouro - Feature Context
**Sempre que você for questionado sobre uma funcionalidade, fluxo de tela, comportamento de UI ou regra de negócio do Améns:**
1. Leia OBRIGATORIAMENTE o arquivo `@skills/context-app-features/SKILL.md`.
2. Se a funcionalidade pedida pelo usuário NÃO existir nesse arquivo de skill, **PARE a implementação imediatamente**.
3. **Sugira ao usuário:** *"Vejo que essa funcionalidade não está mapeada no contexto oficial de features. Vamos atualizar a skill `context-app-features` primeiro antes de iniciar a escrita de código?"*
