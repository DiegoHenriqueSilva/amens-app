---
trigger: always_on
---

# Améns App - General AI & Developer Rules

Estas regras se aplicam a todos os desenvolvedores e assistentes de IA (como Antigravity) operando no repositório `amens-app`.

## 1. Política de idioma: PORTUGUÊS DO BRASIL
- **Comentários:** Todos os comentários de código e *docstrings* DEVEM ser em português do Brasil.
- **Commits:** Mensagens de commit do git DEVEM ser em português do Brasil.
- **Branches:** O nome das branches DEVE ser em português do Brasil (kebab-case, sem acentos).
- **Documentação:** Arquivos markdown, Pull Requests e issues DEVEM ser em português do Brasil.
- **Identificadores de código:** variáveis, funções, classes, métodos, IDs, tabelas e colunas seguem o padrão já existente no código (em inglês), para manter a consistência com o banco, as bibliotecas e o código atual.
- *Nota:* A interação no chat com a IA também deve ser em português do Brasil.

## 2. Git Workflow & Branching Strategy
Antes de iniciar qualquer nova funcionalidade, desenvolvedores e IA DEVEM seguir o fluxo:
1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b <username>/<type>/<task-name>`

### Branch Naming Convention
- **Formato:** `<username>/<type>/<kebab-case-task-name>`
- **Tipos Permitidos:** `feature`, `fix`, `chore`, `refactor`
- **Diretriz para a IA:** Se o usuário solicitar uma alteração e você estiver criando um script de execução, pergunte ou sugira a criação de uma branch no padrão em português do Brasil antes de aplicar mudanças complexas. 
- Pergunte ao usuário se ele confirma o nome da branch criada, descrição e mensagens de commit
- Caso o usuário confirme faça o push para atualizar a branch e as alterações no github

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