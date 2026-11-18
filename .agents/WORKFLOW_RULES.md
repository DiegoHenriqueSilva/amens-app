# Amens App - Regras para IA e Desenvolvedores

Estas regras valem para todos os desenvolvedores e assistentes de IA que trabalham no repositório `amens-app`.

## 1. Política de idioma: PORTUGUÊS DO BRASIL
- **Comentários:** Todos os comentários de código e *docstrings* DEVEM ser em português do Brasil.
- **Commits:** Todas as mensagens de commit DEVEM ser em português do Brasil.
- **Branches:** Todos os nomes de branch DEVEM ser em português do Brasil (kebab-case, sem acentos).
- **Documentação:** Todos os arquivos `.md`, descrições de Pull Request e issues DEVEM ser em português do Brasil.
- **Identificadores de código:** variáveis, funções, classes, tabelas e colunas seguem o padrão já existente no código (em inglês), para manter a consistência com o banco, as bibliotecas e o código atual.
- *Nota:* A conversa com assistentes de IA também deve ser em português do Brasil.

## 2. Fluxo de Git e branches
Antes de iniciar qualquer tarefa nova, desenvolvedores e agentes de IA DEVEM seguir esta sequência:
1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b <usuario>/<tipo>/<nome-da-tarefa>`

### Padrão de nome de branch
- Formato: `<usuario>/<tipo>/<nome-da-tarefa-em-kebab-case>`
- Tipos: `feature`, `fix`, `chore`, `refactor`
- *Assistentes de IA:* Ao iniciar uma tarefa, a IA DEVE pedir o contexto ao usuário e sugerir um nome de branch em português do Brasil antes de prosseguir.
