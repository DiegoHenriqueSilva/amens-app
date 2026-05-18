# User Content Moderation Context - Améns

## Objetivo

Esta skill define regras para moderação de textos criados pelos usuários do Améns.

Exemplos:

- Pedidos de oração
- Comentários
- Mensagens
- Descrições de perfil
- Nomes de exibição
- Textos enviados em formulários

---

## Objetivo da moderação

Proteger:

- Usuários vulneráveis
- Dados pessoais
- Pessoas citadas nos pedidos
- A comunidade
- O contexto religioso do aplicativo
- A segurança jurídica do projeto

---

## Tipos de conteúdo a detectar

### Dados pessoais

Detectar e, quando necessário, bloquear ou mascarar:

- Nome completo
- Telefone
- Endereço
- E-mail
- CPF
- RG
- CNPJ
- Placa de veículo
- Nome de escola
- Local de trabalho
- Dados bancários
- Links pessoais
- Redes sociais
- Localização muito específica

---

### Dados pessoais disfarçados

Detectar tentativas de burlar filtros, como:

- d@nilo
- d4nilo
- dan1lo
- d a n i l o
- da.ni.lo
- telefone separado por espaços
- telefone escrito por extenso
- e-mail com "arroba" e "ponto"

---

### Conteúdo inadequado

Detectar:

- Ameaças
- Assédio
- Discurso de ódio
- Exposição de terceiros
- Conteúdo sexual explícito
- Conteúdo violento
- Conteúdo de automutilação
- Ataques religiosos
- Ofensas contra a Igreja Católica
- Fraudes ou pedidos financeiros suspeitos

---

### Conteúdo sensível permitido com cuidado

Nem todo conteúdo triste ou sensível deve ser bloqueado.

Pedidos de oração podem envolver:

- Doença
- Luto
- Ansiedade
- Dificuldades familiares
- Desemprego
- Crises pessoais
- Medo
- Solidão

Nesses casos, o app deve acolher, não punir.

A moderação deve focar em segurança, privacidade e exposição indevida.

---

## Estratégias de resposta

### Permitir

Quando o texto é seguro.

### Alertar

Quando o texto é permitido, mas contém algo delicado.

Exemplo:

"Seu pedido menciona uma situação muito pessoal. Considere remover nomes ou detalhes específicos antes de publicar."

### Mascarar

Quando há dado pessoal removível.

Exemplo:

"Meu telefone é 44999999999"

Virar:

"Meu telefone é [telefone removido]"

### Bloquear

Quando o texto contém risco alto.

Exemplo:

- Ameaça direta
- Exposição grave de terceiros
- Dados pessoais sensíveis
- Conteúdo sexual envolvendo menor
- Pedido de dinheiro suspeito
- Discurso de ódio

---

## Regra sobre anonimato

Quando o usuário solicitar anonimato:

- Não exibir nome
- Não exibir foto
- Não exibir perfil
- Não exibir localização
- Não exibir dados que permitam identificação indireta

---

## Saída esperada da moderação

Toda análise deve retornar:

- status: approved / warning / masked / blocked
- reasons
- detected_sensitive_data
- suggested_text
- user_message

---

## Exemplo

Texto original:

"Peço oração pelo João da Silva, que mora na Rua X, número 123, em Umuarama."

Resultado esperado:

- status: masked
- reasons:
  - Contém nome completo
  - Contém endereço específico
- suggested_text:
  "Peço oração por uma pessoa próxima que está passando por um momento difícil."
- user_message:
  "Removemos alguns dados pessoais para proteger a privacidade das pessoas envolvidas."