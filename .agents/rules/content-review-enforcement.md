---
trigger: always_on
---

# Rule - Content Review Enforcement

## Objetivo
Garantir que absolutamente NENHUM texto novo (labels, avisos, modais, etc.) seja adicionado à interface visual do aplicativo sem uma rigorosa avaliação de conteúdo e tom de voz.

---

## Quando aplicar
Esta regra entra em ação sempre que a IA (Antigravity) ou desenvolvedor propor:
- Criação de novos textos hardcoded ou via variáveis no front-end.
- Alteração de textos de botões (`UX copy`).
- Novas páginas e títulos.
- Descrições promocionais ou avisos de fluxo (onboarding).

---

## 🛑 Regra OBRIGATÓRIA

**Antes de gerar o código `.tsx` contendo o texto novo:**

1. O texto a ser implementado **DEVE** passar pela verificação simulada do Agente de Revisão.
2. A IA **DEVE** ler: `@skills/agent-content-review/SKILL.md`.
3. A IA **DEVE** emitir (em seu `implementation_plan` ou resposta de planejamento) o resultado dessa revisão, categorizando-o como:
   - APROVADO
   - AJUSTADO (com a sugestão alterada)

### Proibições Absolutas
- **É proibido** criar e fechar a implementação de código visual (`.tsx`/HTML) com textos que ignorem o guia de conteúdo (`context-content-guidelines.md`).
- **É proibido** sugerir textos de botões com tom mágico, absolutista ou comercial no contexto religioso do app.

---

## Fluxo Correto de Ação da IA
1. A IA elabora a feature ou a página que o usuário pediu.
2. A IA identifica quais são os textos que irão na tela.
3. A IA roda a skill `@agent-content-review.md` mentalmente ou abertamente no plano de implementação.
4. O texto aprovado/ajustado é inserido no código.
5. Fim da tarefa.
