---
trigger: always_on
---

# UI/UX Rules - Améns

## 🎨 1. Design System Enforcement
A IA **NUNCA** deve inventar layouts soltos, cores hexadecimais aleatórias ou espaçamentos que fujam do Tailwind configurado.
- **Antes de qualquer mudança visual (botões, layout, cores, tipografia, novas páginas)**: Você **DEVE** checar o arquivo `DESIGN-SYSTEM.md`. 
- Todo novo componente construído precisa herdar os estilos definidos nesse documento base.

---

## 💡 2. Brainstorm First
Toda implementação de interface visual inédita, página, fluxo ou botão central **DEVE obrigatoriamente** começar com uma sessão de ideação.
- Não gere código imediatamente.
- Chame a skill de ideação: `@skills/agent-brainstorming-uiux/SKILL.md`
- Apresente planos (implementation_plan.md) estruturados com prós, contras e considerações antes de tocar em `.tsx`.

---

## 🧩 3. Agent Frontend Design
Após o Brainstorming ser aprovado, toda implementação final de código de UI deve seguir estritamente as regras de frontend da IA, acessando:
`@skills/agent-frontend-design/SKILL.md` (se e quando existente) para aplicar padrões de React/Vite/Tailwind limpos e modulares.

---

## 📱 4. UX Principles
- **Clareza Emocional:** Devido ao contexto religioso (orações e lutos), a UI precisa respirar. Cuidado com *cognitive overload* (excesso de botões vibrantes e modais pipocando).
- **Sem Ruído:** Evite poluição visual.
- **Chamadas de Ação Claras:** CTAs (`Call to Actions`) devem guiar o usuário sem serem imperativos comerciais ("Compre", "Assine já").

---

## ✝️ 5. Tone & Content Visual
- Respeitoso e empático.
- Não use ilustrações de IA que criem visuais desrespeitosos ou caricatos em relação à liturgia católica.
- Mantenha o alinhamento visual com temas espirituais e pacíficos (cores de confiança, luzes suaves, dark modes reflexivos).
