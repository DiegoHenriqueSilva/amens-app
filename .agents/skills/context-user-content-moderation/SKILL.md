# Antigravity Context Skill - User Content Moderation (Améns)

## 📌 Objetivo desta skill
Esta skill define as regras de negócio para a **moderação de textos criados pelos próprios usuários** do Améns (Conteúdo Gerado por Usuário - UGC). Isso se aplica a: pedidos de oração, comentários, perfis, etc.

A inteligência artificial que consome esta documentação (seja via feature interna do backend ou por um agente analisando o banco de dados) deve usá-la para proteger os usuários, a comunidade e o aplicativo.

---

## 🛡️ O que detectar (Tipos de Ameaça)

### 1. Dados Pessoais (PII) explícitos
- Nomes completos de terceiros sem consentimento.
- Telefones, endereços específicos, e-mails, documentos (CPF/RG), dados bancários ou chave PIX, placas de carro.

### 2. Dados Pessoais Disfarçados (Evasão de Filtro)
- Exemplos: `44 novenove um dois...`, `d4nilo`, `joao arroba gmail`, etc.

### 3. Conteúdo Inadequado / Proibido
- Ameaças de morte ou violência.
- Assédio ou Discurso de ódio.
- Exposição sexual (mesmo em texto) ou abuso de menores.
- Automutilação explícita.
- Ofensas graves à Igreja, a Deus ou à religião em geral.
- Pedidos de doação financeira (golpes).

### 4. Conteúdo Sensível Permitido (Atenção Pastoral)
A IA **NÃO PODE BLOQUEAR** conteúdos dolorosos se eles forem legítimos e não expuserem dados.
- Pedidos de oração por câncer, doenças raras, luto profundo, perda de emprego, ansiedade ou crises na família.
- **Como agir:** Nesses casos, o app deve acolher. Só aplicamos moderação se o pedido expuser a vida pessoal/localização exata da pessoa doente sem necessidade.

---

## 🚦 Estratégias de Resposta

- **Permitir (`approved`):** Texto seguro, sem dados expostos, sem agressividade.
- **Alertar (`warning`):** Texto permitido, mas com contexto delicado (ex: a IA sugere ao usuário pensar se ele quer mesmo publicar daquela forma).
- **Mascarar (`masked`):** O texto é bom, mas há um número de celular ou nome completo no meio. Exemplo: *"Orem pela Maria, tel: 11999999"* → *"Orem pela Maria, [telefone removido]"*
- **Bloquear (`blocked`):** Violência grave, ódio, automutilação direta, fraudes.

---

## 🕵️ Regra de Anonimato
Se a flag `is_anonymous` for verdadeira no pedido de oração, a moderação deve garantir que o texto inserido no corpo da oração não quebre acidentalmente esse anonimato (ex: *"Orem por mim, assinado João Pedro de Umuarama"*). Se houver identificação no texto, sugerir remoção (`masked`).
