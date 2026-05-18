# Antigravity Brainstorming UI/UX Skill - Améns Project

## Objetivo
Esta skill instrui o agente (Antigravity) a conduzir sessões de brainstorming estruturadas, focadas em ideação de funcionalidades, arquitetura e design de UI/UX para o projeto **Améns**. Ela foi criada seguindo as melhores práticas do Antigravity para garantir alinhamento com o escopo do projeto, o sistema de design e o fluxo de trabalho agentico.

---

## 🚀 Boas Práticas de Brainstorming UI/UX (Antigravity Way)

### 1. Entendimento Profundo do Domínio (Project Scoped)
- **Foco no Propósito:** O Améns é voltado para intercessões, orações e comunidade católica. As ideias devem refletir empatia, respeito e acolhimento.
- **Contexto é Rei:** Antes de sugerir soluções, verifique **sempre** o `DESIGN_SYSTEM.md`, as regras de negócio já estabelecidas (ex: *access gate* para não-autenticados, *prayer queue limits*) e os Knowledge Items (KIs) do projeto.

### 2. Uso do "Planning Mode" (Modo de Planejamento)
Brainstorming não é gerar código imediato. É planejar e divergir antes de convergir:
1. **Divergência:** Apresente diferentes ângulos ou abordagens para a solução solicitada.
2. **Plano Estruturado:** Utilize o artefato `implementation_plan.md` para documentar as opções de forma clara, listando prós e contras de cada uma.
3. **Validação:** Pare e solicite o feedback do usuário (`request_feedback = true`). **Nenhuma alteração no código fonte deve ser feita até a definição da ideia.**

### 3. Foco Implacável em Design e UX (Aesthetics)
- **Efeito "WOW":** O brainstorming de UI não pode ser básico. Sugira e conceitue interfaces modernas, utilizando paletas de cores harmônicas do Tailwind, dark modes refinados, *glassmorphism* quando apropriado e tipografia de alta qualidade.
- **Interações Dinâmicas:** Pense sempre em micro-animações, estados de *hover*, feedback visual (ex: animação ao interagir com o botão de oração) e na hierarquia de informações.

### 4. Estruturação da Apresentação das Ideias
Para garantir que o usuário compreenda e consiga avaliar as ideias do brainstorming, você deve **obrigatoriamente** formatar as respostas de forma rica usando Markdown:
- **Tabelas Markdown:** Úteis para comparações rápidas entre opções de layout, componentes de UI ou fluxos.
- **Alertas do GitHub:** 
  - `> [!TIP]` para sugestões de UX ou best practices de frontend.
  - `> [!WARNING]` para alertar sobre quebra de padrões do *Design System* ou aumento de complexidade visual.
- **Diagramas Mermaid:** Utilize para desenhar fluxos lógicos de navegação propostos.

### 5. Perguntas Direcionais Focadas (Open Questions)
O brainstorming deve ajudar a refinar requisitos incertos. Inclua no seu plano de implementação (seção "Open Questions") perguntas diretas para o usuário, como:
- *"Essa nova funcionalidade ficará visível para usuários anônimos ou será bloqueada pelo Access Gate?"*
- *"Como essa ideia afeta a performance e acessibilidade em dispositivos móveis menores?"*

---

## 🛠️ Como Iniciar uma Sessão de Brainstorming
Sempre que o usuário solicitar uma ideia de UI, arquitetura de front-end ou acionar esta skill (ex: *"Vamos pensar na tela de perfil"*):
1. **PARE. Não escreva código ainda.**
2. Revise os arquivos `context-app-features/SKILL.md` e o `DESIGN_SYSTEM.md`.
3. Crie um `implementation_plan.md` em formato de rascunho criativo, contendo 2 a 3 opções conceituais claras.
4. Peça o feedback do usuário.
5. Somente após a aprovação de uma das abordagens, crie as `tasks.md` e inicie as alterações no código.
