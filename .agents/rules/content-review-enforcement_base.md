---
trigger: always_on
---

# Rule - Content Review Enforcement

## Objetivo

Garantir que nenhum texto novo seja adicionado ao aplicativo sem revisão de conteúdo.

---

## Quando aplicar

Esta regra deve ser aplicada sempre que houver:

- Criação de novos textos no código
- Alteração de textos existentes
- Novos botões, labels, descrições
- Novas páginas
- Alterações em UX copy

---

## Regra obrigatória

Antes de qualquer implementação de texto:

1. O texto DEVE ser revisado por:
   @agent-content-review.md

2. O resultado da revisão deve ser:
   - Aprovado
   ou
   - Ajustado conforme sugestão

---

## Proibição

É proibido:

- Subir PR com texto não revisado
- Criar UI sem validação de conteúdo
- Usar frases não alinhadas com `context-content-guidelines.md`

---

## Fluxo correto

1. Criar texto
2. Rodar revisão com agent-content-review
3. Ajustar texto
4. Implementar no código
5. Subir PR

---

## Em caso de dúvida

Se não houver certeza sobre o texto:

- Usar @agent-content-review.md
- Ou discutir em @brainstorming-uiux.md

---

## Observação

Esta regra existe para:

- Proteger o posicionamento religioso do app
- Evitar interpretações erradas
- Garantir consistência de linguagem
- Manter qualidade UX