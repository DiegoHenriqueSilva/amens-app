# Antigravity Brainstorming UI/UX Skill - Améns Project

## Objetivo
Esta skill instrui o agente (Antigravity) a conduzir sessões de brainstorming estruturadas, focadas em ideação de funcionalidades, arquitetura e design de UI/UX para o projeto **Améns**. Ela foi criada seguindo as melhores práticas do Antigravity para garantir alinhamento com o escopo do projeto, o sistema de design e o fluxo de trabalho agentico.

---

## 🚀 Boas Práticas de Brainstorming UI/UX (Antigravity Way)

### 1. Entendimento Profundo do Domínio (Project Scoped)
- **Foco no Propósito:** O Améns é voltado para intercessões, orações e comunidade católica. As ideias devem refletir empatia, respeito e acolhimento.
- **Contexto é Rei:** Antes de sugerir soluções, sempre verifique o `DESIGN_SYSTEM.md`, KIs (Knowledge Items) locais e regras de negócio já estabelecidas (ex: *access gate* para não-autenticados, *prayer queue limits*).

### 2. Uso do "Planning Mode" (Modo de Planejamento)
Brainstorming não é gerar código imediato. É planejar e divergir antes de convergir:
1. **Divergência:** Apresente diferentes ângulos ou abordagens para a solução solicitada.
2. **Plano Estruturado:** Utilize o artefato `implementation_plan.md` para documentar as opções de forma clara, listando prós e contras de cada uma.
3. **Validação:** Pare e solicite o feedback do usuário (`request_feedback = true`). Nenhuma alteração no código fonte deve ser feita até a definição da ideia.

### 3. Foco Implacável em Design e UX (Aesthetics)
- **Efeito "WOW":** O brainstorming de UI não pode ser básico. Sugira e conceitue interfaces modernas, utilizando paletas de cores harmônicas, *glassmorphism*, dark modes refinados e tipografia de alta qualidade.
- **Interações Dinâmicas:** Pense sempre em micro-animações, estados de *hover* e feedback visual (ex: animação ao clicar no botão de intercessão).
- **Prototipagem Visual:** Durante o brainstorming, utilize ativamente a tool `generate_image` para criar *mockups* das ideias e facilitar a visualização por parte do usuário.

### 4. Estruturação da Apresentação das Ideias
Para garantir que o usuário compreenda e consiga avaliar as ideias do brainstorming, utilize formatação rica:
- **Tabelas Markdown:** Excelentes para comparações rápidas entre opções de bibliotecas, layouts ou arquiteturas.
- **Alertas do GitHub:** 
  - `> [!TIP]` para sugestões de performance ou UX.
  - `> [!WARNING]` para alertar sobre quebra de padrões do *Design System* ou complexidade excessiva.
- **Diagramas Mermaid:** Utilize para desenhar fluxos lógicos propostos (ex: "Como será o fluxo do novo botão de curtir a oração").

### 5. Perguntas Direcionais Focadas (Open Questions)
O brainstorming deve ajudar a refinar requisitos incertos. Inclua no seu plano de implementação perguntas diretas para o usuário, como:
- *“Essa nova funcionalidade ficará visível para usuários anônimos ou atrás do Access Gate?”*
- *“Qual prioridade de carregamento isso deve ter na fila de orações?”*
- *“Como essa ideia afeta a performance em dispositivos móveis?”*

---

## 🛠️ Como Iniciar uma Sessão
Sempre que o usuário acionar esta skill (ex: *"Vamos fazer um brainstorming sobre a tela X"*):
1. **NÃO escreva código imediatamente.**
2. Leia os arquivos de contexto e o Design System.
3. Crie um `implementation_plan.md` com 2 a 3 propostas conceituais.
4. Peça aprovação e só avance para o `task.md` e código após a decisão do usuário.
