# Antigravity Context Skill - App Features (Améns)

## 📌 Objetivo desta skill
Esta skill centraliza o contexto funcional das páginas e features existentes ou planejadas no aplicativo **Améns**. 

### 🤖 Diretrizes para o Agente (Antigravity):
1. **Obrigatoriedade de Consulta:** Antes de sugerir, modificar ou implementar qualquer código que envolva regras de negócio, fluxos de tela ou nova UI, **leia este documento**.
2. **Feature Não Encontrada?** Se o usuário solicitar a alteração ou criação de uma feature que NÃO esteja documentada aqui, o agente DEVE parar e sugerir: *"Antes de iniciarmos a implementação, vamos atualizar a skill `@skills/context/app-features.md` com as regras de negócio dessa nova feature."*
3. **Manutenção Constante:** Toda vez que implementar uma nova funcionalidade que altera o comportamento do app, lembre-se de propor a atualização deste arquivo no seu plano de implementação.

---

## 🏠 Página Inicial

### Rota
- **Produção**: `https://www.amens.com.br/`
- **Código**: `src/pages/Index.tsx`
- **Rota interna**: `/`

### Descrição
A página inicial é o hub principal do Améns, apresentando as funções centrais do aplicativo. Muitas funções são públicas, mas ações interativas exigem autenticação.

### Elementos principais
- Identidade: Améns - Unidos pela Fé
- Contador de conexões em tempo real.
- Status do Usuário: Avatar, Nome, Nível Espiritual, Pontos de fé (XP), Jornada da Fé e Missões diárias.

### Funções em Destaque
- Orar por uma Causa
- Enviar Pedido
- Evangelho do Dia
- Divina Promessa
- Atalhos Secundários: Minhas Preces, Minhas Intercessões, Amigos da Fé, Terço Guiado.

### Navegação (BottomNav)
- Início, Mensagens, Oração ao vivo, Amigos, Comunidade, Perfil. (Renderizado globalmente em `App.tsx`).

---

## 🙏 Orar por uma Causa

### Rota
- **Produção**: `https://www.amens.com.br/pray`
- **Código**: `src/pages/Pray.tsx`
- **Rota interna**: `/pray`

### Descrição
Permite ao usuário receber uma causa enviada pela comunidade e interceder, tornando-se uma rede de apoio espiritual.

### Regras de Negócio
- Limite diário: O usuário sorteia até 3 causas por dia. A regra é interna (usando hooks como `useDrawLimit`) e a lógica de fallback exibe orações padrão quando a fila está vazia.
- Filtros: Não exibe causas do próprio usuário, causas já intercedidas e causas com restrições/banimento.
- Permite ver histórico de intercessões anteriores para re-orar.
- Sorteio Inteligente: Prioriza causas sem feedback, recentes, etc. (Regra de peso invisível para o usuário).

### Interações
- Reações emocionais (Compaixão, Graça, Paciência, Força, Empatia).
- Sugestão de oração por IA.
- Compartilhamento (interno para amigos ou externo via link WhatsApp).
- Reportar causa inadequada.

---

## 📤 Enviar Pedido

### Rota
- **Produção**: `https://www.amens.com.br/submit`
- **Código**: `src/pages/Submit.tsx`
- **Rota interna**: `/submit`

### Descrição
O usuário compartilha sua necessidade espiritual com a comunidade.

### Regras de Negócio
- Título obrigatório (mínimo 5 caracteres) e descrição (limite 1000 caracteres).
- Salvo na tabela `prayer_requests`.
- O autor ganha pontos de XP (uma vez ao dia).
- O usuário pode dar feedback depois para os intercessores (ex: "Deu certo", "Não foi dessa vez, mas confio").
- **Anonimato por Pedido:** Pedidos podem ser marcados como anônimos no envio. Ao sortear um pedido anônimo, NÃO exibir dados do autor (nome, foto) para a comunidade. O `user_id` continua preservado para auditoria interna.
- **Moderação Local de Conteúdo:** O envio passa por uma Edge Function com regras locais para detectar PII, contatos, documentos, endereços, links, pedidos financeiros, ofensas, ódio, ameaças, conteúdo sexual explícito e automutilação explícita.
- **Revisão:** Pedidos suspeitos podem ser enviados como `pending_review`; pedidos confirmados como violação usam `policy_violation`. Ambos ficam fora da fila de novos sorteios e têm interações bloqueadas. Históricos exibem aviso e ocultam o conteúdo quando o status é restrito.

---

## 📖 Evangelho e Liturgia Diária Completa (APP06)

### Rota
- **Produção**: `https://www.amens.com.br/daily-gospel`
- **Código**: `src/pages/DailyGospel.tsx`
- **Rota interna**: `/daily-gospel`

### Descrição
Apresenta a liturgia diária completa da Igreja Católica com suporte a navegação por datas (calendário), abas para todas as leituras existentes (Primeira Leitura, Salmo Responsorial, Segunda Leitura quando houver e Evangelho), além de reflexão em vídeo, reflexão por IA ("Curiosidade da época") e compartilhamento.

### Regras de Negócio e Confiabilidade
- **Navegação por Calendário e Datas:** Permite avançar, retroceder ou selecionar qualquer data via seletor/calendário. Possui cancelamento de requisições anteriores (`AbortController`) para evitar race conditions em trocas rápidas de data.
- **Abas de Liturgia Completa:** Exibe dinamicamente as abas:
  - *1ª Leitura*
  - *Salmo Responsorial*
  - *2ª Leitura* (renderizada apenas em domingos e solenidades litúrgicas onde ela existe; omitida sem abas vazias nos demais dias)
  - *Evangelho*
- **Tratamento Honesto de Indisponibilidade & Fallbacks:**
  - Caso a API externa de liturgia falhe (500, timeout, erro de rede), o sistema exibe aviso explícito de indisponibilidade com opção de nova tentativa (*retry*).
  - Textos devocionais ou perenes de contingência são claramente identificados como apoio espiritual e nunca rotulados enganosamente como a liturgia oficial do dia.
- **Resiliência Independente:** A falha no vídeo do YouTube ou na Edge Function de IA (resumo / curiosidade) não bloqueia ou corrompe a leitura textual das leituras bíblicas. Cada bloco explica seu próprio estado.
- **Vínculo Fiel com o Altar e Métricas:**
  - O evento `gospel_read` é disparado e persistido no altar **somente quando uma liturgia oficial válida for carregada com sucesso** (nunca em caso de erro de rede ou exibição de fallback).
  - O evento `gospel_share` é disparado **apenas após a confirmação real do compartilhamento** (seja via `navigator.share` bem-sucedido ou cópia confirmada no clipboard), nunca em cancelamentos ou recusas de permissão.
- **Compatibilidade e Acessibilidade:**
  - Suporta temas *refresh* e *legacy*.
  - Viewports mobile estreitos (390 px e 320 px) com espaçamento seguro (*safe-area-inset-bottom* e *bottom navigation* fixa).
  - Controles navegáveis por teclado e compatíveis com leitores de tela.

---

## 🔁 Regras do Agente para Atualização de Features
Sempre que o Antigravity implementar algo novo, atualize esta skill com os campos: Nome, Rota, Arquivo, Descrição, Regras de Negócio e Dependências. Mantenha os dados fáceis de ler para que a IA consuma rapidamente em sessões futuras.
