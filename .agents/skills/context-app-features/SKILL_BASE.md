# Context App Features - Améns

## Objetivo desta skill

Esta skill centraliza o contexto funcional das páginas e features existentes ou planejadas no aplicativo Améns.

Sempre que uma nova feature for criada, alterada ou removida, este arquivo deve ser atualizado.

Antes de responder sobre funcionalidades do app, fluxos de usuário, comportamento esperado, regras de negócio ou experiência do usuário, consulte esta skill.

---

# Página Inicial

## Rota

- Produção: https://www.amens.com.br/
- Código: `src/pages/Index.tsx`
- Rota interna: `/`

## Descrição

A página inicial é o hub principal do Améns. Ela apresenta as principais funções do aplicativo e deve refletir todas as funcionalidades relevantes disponíveis para o usuário.

Muitas funções podem ser visualizadas publicamente, mas algumas ações exigem autenticação.

## Elementos principais

A página inicial contém:

- Identidade do aplicativo: Améns
- Mensagem principal: Unidos pela Fé
- Contador de pessoas conectadas em tempo real, quando aplicável
- Informações do usuário logado
- Avatar/foto
- Nome
- Nível espiritual
- Pontos de fé acumulados
- Ícone do nível atual
- Próximo nível
- Jornada da Fé
- Missões diárias
- Pontos de fé adicionais por missão cumprida

## Funções principais exibidas

As funções principais da home são:

- Orar por uma Causa
- Enviar Pedido
- Evangelho do Dia
- Novenas
- Sagrado Terço
- Divina Promessa

No código atual, a home já possui cards para:
- Orar por uma Causa
- Enviar Pedido
- Evangelho do Dia
- Divina Promessa

Cada card possui título, descrição e chamada para ação. :contentReference[oaicite:1]{index=1}

## Funções secundárias exibidas

Abaixo das funções principais aparecem:

- Terço Guiado
- Minhas Preces
- Minhas Intercessões
- Amigos da Fé

No código atual, a página já mostra atalhos para:
- Minhas Preces
- Minhas Intercessões
- Amigos da Fé :contentReference[oaicite:2]{index=2}

## Barra inferior

A navegação inferior deve conter:

- Início
- Mensagens
- Oração ao vivo
- Amigos
- Comunidade
- Perfil

A aplicação já usa o componente global `BottomNav`, renderizado em `App.tsx`, fora das rotas principais. :contentReference[oaicite:3]{index=3}

---

# Orar por uma Causa

## Rota

- Produção: https://www.amens.com.br/pray
- Código: `src/pages/Pray.tsx`
- Rota interna: `/pray`

## Descrição

A função "Orar por uma Causa" permite que o usuário receba uma causa de oração enviada por outro membro da comunidade.

O objetivo é transformar o usuário em um intercessor, permitindo que ele ore, reaja, conforte e compartilhe uma causa.

## Regras principais

- O usuário pode sortear até 3 causas por dia.
- O limite diário não deve ser apresentado como lógica técnica, apenas como uma restrição simples de uso.
- A regra interna de sorteio não deve ser exposta ao usuário.
- A causa sorteada deve permanecer disponível se o usuário sair e voltar para a página no mesmo dia.
- O usuário pode ver causas pelas quais já intercedeu anteriormente.
- O usuário pode escolher uma causa anterior para orar novamente.
- Causas com status banido/removido não devem ser exibidas normalmente.

O código atual utiliza `useDrawLimit`, `PRAY_SETTINGS.dailyDrawLimit`, histórico em `prayer_intercessions`, filtro de causas ativas, exclusão das causas do próprio usuário, sistema de pesos de sorteio e fallback para orações padrão quando não há causas disponíveis. :contentReference[oaicite:4]{index=4}

## Sorteio de causa

O sorteio considera uma estratégia interna baseada em critérios como:

- Causas ativas
- Causas sem feedback
- Causas que não pertencem ao usuário atual
- Causas ainda não vistas na sessão
- Número de orações já recebidas
- Relação de amizade
- Idade da causa
- Variação aleatória controlada

Esta lógica deve ser tratada como regra interna do aplicativo.

## Interações disponíveis

Ao receber uma causa, o usuário pode:

- Ver título da causa
- Ver descrição do pedido
- Ver autor ou anonimato
- Ver localização, quando disponível
- Ver quando a causa foi postada
- Reagir com sentimentos de apoio
- Gerar sugestão de oração com IA
- Compartilhar a causa
- Enviar a causa para amigos dentro do Améns
- Compartilhar fora do Améns
- Reportar uma causa para administração

O código atual possui reações como:
- Compaixão
- Graça
- Paciência
- Força
- Empatia :contentReference[oaicite:5]{index=5}

## Compartilhamento

A causa pode ser compartilhada:

- Dentro do Améns, com amigos conectados
- Fora do Améns, por link compartilhável
- WhatsApp
- Futuramente Instagram e Facebook

Hoje o código gera um link para `/pray?id=<id_da_causa>` e abre compartilhamento via WhatsApp. :contentReference[oaicite:6]{index=6}

## Histórico

O usuário pode acessar:

- Causas pelas quais já intercedeu
- Reação enviada anteriormente
- Autor da causa
- Status da causa
- Data da intercessão
- Data da postagem

---

# Enviar Pedido

## Rota

- Produção: https://www.amens.com.br/submit
- Código: `src/pages/Submit.tsx`
- Rota interna: `/submit`

## Descrição

A função "Enviar Pedido" permite que o usuário compartilhe com a comunidade uma causa pela qual deseja receber oração, acolhimento e suporte espiritual.

A causa enviada entra no conjunto de pedidos que poderão ser sorteados por outros usuários.

## Campos principais

O usuário informa:

- Título do pedido
- Descrição da causa / pedido de oração
- Localização, quando disponível

No código atual, o pedido exige descrição e valida o título com pelo menos 5 caracteres. A descrição possui limite de 1000 caracteres. :contentReference[oaicite:7]{index=7}

## Comportamento ao enviar

Ao enviar um pedido:

- O pedido é salvo em `prayer_requests`
- O autor é associado ao usuário logado
- O primeiro nome pode ser salvo como `author_name`
- Amigos do usuário podem ser notificados
- O usuário pode ganhar pontos de fé
- O app pode solicitar permissão de notificação para avisar quando alguém orar pelo pedido

O código atual também adiciona XP apenas uma vez ao dia para envio de pedido. :contentReference[oaicite:8]{index=8}

## Histórico de pedidos

O usuário pode ver pedidos enviados anteriormente.

No histórico, ele pode visualizar:

- Título
- Conteúdo
- Tempo desde a criação
- Quantas pessoas oraram
- Quantas reações foram recebidas
- Lista de intercessores, quando disponível
- Feedback enviado sobre a causa

## Feedback da causa

O usuário pode dar retorno aos intercessores com opções como:

- Deu certo, obrigado pelas orações
- Não foi desta vez, mas obrigado pelas preces
- Não deu certo, mas vou continuar tentando
- Não deu certo, mas Deus sabe o que faz
- Consegui a graça solicitada, obrigado

Ao enviar feedback, os intercessores podem ser notificados. :contentReference[oaicite:9]{index=9}

## Feature planejada: anonimato

Ainda que possa não estar totalmente implementada na tela atual, a skill deve considerar como regra de produto:

- O usuário poderá solicitar anonimato ao enviar um pedido de oração.
- Quando uma causa anônima for sorteada, informações pessoais e dados do perfil do solicitante não devem ser exibidos.
- Em modo anônimo, não exibir nome, avatar, perfil ou identificadores pessoais.
- A causa deve continuar válida para oração e interação, mas sem exposição da identidade do solicitante.

---

# Evangelho do Dia

## Rota

- Produção: https://www.amens.com.br/daily-gospel
- Código: `src/pages/DailyGospel.tsx`
- Rota interna: `/daily-gospel`

## Descrição

A função "Evangelho do Dia" apresenta ao usuário a liturgia diária, com foco no Evangelho, reflexão espiritual, curiosidade contextual e possibilidade de compartilhamento.

## Conteúdo atual

A página exibe:

- Evangelho do dia
- Texto completo do evangelho
- Referência bíblica
- Dia litúrgico
- Imagem associada ao evangelho
- Curiosidade da época
- Opção de compartilhamento
- Reflexão em vídeo

O código atual busca a liturgia do dia via API externa, usa Gemini para gerar resumo e curiosidade, possui cache local diário e fallback caso a busca falhe. :contentReference[oaicite:10]{index=10}

## Curiosidade da época

A curiosidade da época é um texto curto, gerado por IA, que contextualiza o Evangelho, a primeira leitura ou o salmo.

Ela deve trazer informações como:

- Contexto histórico
- Cultura da época de Jesus
- Elementos arqueológicos
- Costumes religiosos
- Contexto social da passagem

O tom deve ser educativo, simples, espiritual e compartilhável.

## Compartilhamento

O usuário pode compartilhar:

- Texto completo do Evangelho
- Resumo/reflexão
- Curiosidade da época
- Link de convite/referral
- Imagem do Evangelho, quando suportado pelo navegador

O código atual tenta compartilhar com imagem usando `navigator.share`; se não for possível, compartilha texto ou copia para a área de transferência. :contentReference[oaicite:11]{index=11}

## Reflexão em vídeo

A página possui bloco de Reflexão em Vídeo.

Hoje o código busca vídeo no YouTube em um canal específico, considerando o Evangelho do dia e horário local. Antes das 6h, oferece a opção de assistir ao vídeo do dia anterior. :contentReference[oaicite:12]{index=12}

## Conteúdo de vídeo planejado

A skill deve considerar evolução futura para:

- Adicionar mais canais de reflexão
- Permitir curadoria de vídeos
- Incluir vídeos de pessoas da comunidade
- Incluir referências como Padre Reginaldo Manzotti e outros canais católicos confiáveis

## Features planejadas

Ainda que possam não estar totalmente implementadas, devem ser consideradas no contexto futuro:

- Primeira leitura do dia
- Salmo do dia
- Busca por datas diferentes usando calendário
- Histórico de evangelhos anteriores
- Mais canais para Reflexão em Vídeo
- Compartilhamento específico do salmo
- Compartilhamento específico da primeira leitura
- Imagem gerada por IA para cada data/liturgia

---

# Regras gerais para manutenção de funcionalidades

## Ao criar nova função

Toda nova função criada no app deve ser adicionada nesta skill contendo:

- Nome da função
- Rota
- Arquivo principal
- Descrição
- Regras de negócio
- Quem pode acessar
- Se exige login
- Dados usados
- Integrações
- Comportamento esperado
- Features planejadas

## Ao alterar função existente

Sempre atualizar:

- Descrição funcional
- Regras de negócio
- Fluxos de usuário
- Campos visíveis
- Dependências técnicas
- Regras de autenticação
- Pontos de fé / XP, quando aplicável

## Ao responder perguntas sobre o app

Sempre consultar:

- `app-business.md` para contexto de negócio
- `app-infrastructure.md` para infraestrutura
- `app-technical.md` para tecnologia e banco
- `app-features.md` para funções e comportamento de produto
- `DESIGN-SYSTEM.md` para qualquer decisão visual
- `brainstorming-uiux.md` antes de propor nova UI
- `agent-frontend-design.md` antes de implementar UI