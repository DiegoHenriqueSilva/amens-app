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

## Prayer causes (`/pray`)

### Purpose and implementation
- Let a member receive a community request, assume intercession, react, request optional prayer support, invite friends and revisit their history.
- Entry points: `/pray`, `/pray?id=<uuid>` and `/pray?intention=default-001` through `default-008`.
- `src/pages/Pray.tsx` observes authentication; `PraySession.tsx` resets account-scoped state. `PrayerCauseCard` retains the devotional presentation.

- UI copy uses **Intercessões diárias**. The compact summary shows available intercessions once, without a separate circled number, a next-level line and a midnight/Sao Paulo clock at the lower right; consumption details are in **Como funciona**. Loading uses a skeleton and a short accessible announcement.
- On `/pray`, `AppFrame` reserves a separate menu row and scrolls the reading area above it, including safe areas. Other routes retain their existing layout.

### Approved consumption rule (2026-11-16)
- Receiving or accepting an individual cause immediately registers the intercession and consumes one daily opportunity. No additional "I prayed" confirmation is required.
- Standard daily allowance: 2 initially, plus 1 every five levels (2/3/4/5/6 at levels 1/5/10/15/20). Administrators are unlimited. Renewal uses America/Sao_Paulo.
- Reading a shared link, reopening history, reacting, sharing or requesting an AI suggestion does not consume another opportunity.
- General intentions appear when the eligible queue is empty, spend no quota and are not individual history records. General-intention reactions and friend invitations remain available.

### Server contract
- `receive_prayer_cause` selects, records and updates the counter atomically. Per-account advisory locking enforces quota; operation identifiers make uncertain responses retryable. Receipt time is server-owned and intercessions are immutable.
- Exclude the member's own requests, previously assumed requests, deleted/restricted content, suspended/deleted authors, completed causes and closing feedback even when legacy status remains active. Preserve weighted selection among the 50 most recent eligible candidates and a random top-five pool.
- Public links, draws, history and the community feed use safe projections. Anonymous authors expose no identifier, avatar, location or friend badge. Owners and moderators retain authorized raw-row access.
- History uses stable cursor pagination and placeholders for unavailable causes. Reaction removal is a soft delete. Reactions and invitations report success only after the database command commits.
- Internal invitations validate friendship and account eligibility server-side. Anonymous authors can receive the same generic invitation as another friend: filtering them would reveal their identity.
- External sharing sends a generic public link, without copied cause text or the sharer's user identifier. Native cancellation and blocked popups do not count as a confirmed share. Opening WhatsApp alone cannot prove delivery.

### Optional AI and integrations
- `generate-prayer` verifies the member and cause access, reserves a daily attempt budget and caches the result. Provider credentials and model configuration are server-only.
- Send a broad intention category and an optional known devotion, never the original request, personal identifiers or location. Use varied, humble Catholic wording, up to 150 words, without promises of outcomes.
- Current protective budgets: 3 attempts per member/day and 100 total attempts/day; the public Gospel has a shared cache and 3 attempts/day. Failed attempts also count. Prayer and Gospel reading remain usable when AI is unavailable.
- Preserve APP04 owner history/intercessors, APP05 reporting, APP10 messages, APP11 invitations, APP16 points/levels and APP19 altar synchronization. Global XP integrity remains an APP16 dependency; testing supplied XP thresholds is not proof that XP itself is authoritative.
- Implementation details and release checks: `docs/app03-prayer-flow.md`. Local migrations/tests do not imply hosted deployment or production verification.

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
