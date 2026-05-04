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
- **Anonimato (Feature Planejada/Regra de Produto):** Pedidos podem ser anônimos. Ao sortear um pedido anônimo, NÃO exibir dados do autor (nome, foto).

---

## 📖 Evangelho do Dia

### Rota
- **Produção**: `https://www.amens.com.br/daily-gospel`
- **Código**: `src/pages/DailyGospel.tsx`
- **Rota interna**: `/daily-gospel`

### Descrição
Apresenta a liturgia diária, reflexão e curiosidade contextual usando IA.

### Regras de Negócio
- Busca liturgia via API.
- IA (Gemini) gera resumo e "Curiosidade da época" (contexto histórico, arqueológico, cultural da época de Jesus).
- Reflexão em vídeo do Youtube (selecionada automaticamente, ex: vídeo do dia anterior antes das 6h da manhã).
- Compartilhamento de imagem nativo se suportado, senão fallback para cópia de texto.
- Possíveis evoluções: 1ª Leitura, Salmo, busca por calendário.

---

## 🔁 Regras do Agente para Atualização de Features
Sempre que o Antigravity implementar algo novo, atualize esta skill com os campos: Nome, Rota, Arquivo, Descrição, Regras de Negócio e Dependências. Mantenha os dados fáceis de ler para que a IA consuma rapidamente em sessões futuras.
