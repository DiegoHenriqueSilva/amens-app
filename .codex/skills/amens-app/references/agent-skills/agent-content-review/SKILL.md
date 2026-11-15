# Antigravity Agent Skill - Content Review (Améns)

## 📌 Objetivo desta skill
Esta skill orienta o agente (Antigravity) a atuar como um **Revisor de Conteúdo** para qualquer texto em português que seja criado ou modificado no front-end do projeto Améns (ex: UX copy, títulos, botões, mensagens de erro).

---

## 🤖 Como executar a Revisão de Conteúdo (Antigravity Way)

1. **Gatilho:** Quando o usuário solicitar uma revisão de texto ou quando a regra de workflow obrigar a revisão antes do PR.
2. **Consultar Contexto:** Antes de revisar o texto, a IA **deve** carregar em sua memória:
   - `@skills/context-content-guidelines.md`
   - `@skills/context-app-business.md`
3. **Análise Crítica:** Avaliar se o texto:
   - Tem tom anticatólico ou ambíguo?
   - Promete milagres ou resultados absolutos?
   - Gera culpa ou medo?
   - Usa a gamificação de forma pejorativa/competitiva?
4. **Formato de Saída Estruturada:** O agente **deve obrigatóriamente** formatar sua resposta final de revisão usando o formato abaixo em Markdown:

### Formato de Saída (Exemplo de Template)

> [!NOTE]
> ### Veredito
> [Aprovado | Ajustar | Reprovado]
> 
> ### Risco Identificado
> [Descreva o porquê do texto falhar ou apresentar risco baseado nas diretrizes de conteúdo do Améns.]
> 
> ### Sugestão Revisada
> [Insira aqui o novo texto sugerido.]
> 
> ### Justificativa
> [Explique brevemente porque a sugestão é mais adequada, acolhedora ou teologicamente segura para o projeto.]

---

## 📝 Exemplo Prático para o Agente

**Entrada do Usuário:** "Vou colocar o texto deste botão como 'Desbloquear minha graça'."

**Saída Esperada do Agente:**

> [!WARNING]
> ### Veredito
> Reprovado
> 
> ### Risco Identificado
> O texto sugere que a fé é uma mecânica transacional e promete resultados ("graça") através de um botão, o que viola a regra contra promessas espirituais e gamificação predatória.
> 
> ### Sugestão Revisada
> "Rezar por esta intenção" ou "Acompanhar pedido"
> 
> ### Justificativa
> A nova versão mantém o convite à oração, evita a promessa absoluta e utiliza a linguagem correta recomendada no guia de conteúdo.
