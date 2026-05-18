# Antigravity Context Skill - Technical (Améns)

## 🤖 Diretrizes para o Agente (Antigravity):
Ao ser questionado sobre como o sistema funciona por trás, padrões de codificação, banco de dados ou antes de implementar um código complexo, **consulte esta skill primeiro**.

---

## 💻 Linguagens de Programação
- **Frontend:** TypeScript e JavaScript.
- **Marcação e Estilo:** HTML5, CSS e Tailwind CSS (via configuração de projeto).
- **Banco de Dados:** SQL (PostgreSQL).

---

## 🧰 Metodologias Técnicas e Plataformas Utilizadas
- **Frameworks Principais:** React (gerenciado via Vite).
- **Plataforma Backend:** Supabase (BaaS).
- **Plataforma de Deploy:** Vercel.
- **Abordagem de Componentes:** Componentes modulares, separação de responsabilidades (ex: lógicas de sorteio isoladas em custom hooks como `useDrawLimit`).
- **Repositório:** [GitHub - amens-app](https://github.com/DiegoHenriqueSilva/amens-app)

---

## 📱 Responsividade e Multiplataforma
- **Mobile-first Design:** Toda a interface de usuário DEVE ser idealizada e desenhada inicialmente para dispositivos móveis, pois este é o formato principal de consumo.
- **Adaptação Web:** O layout deve responder elegantemente para telas de desktop (ex: redimensionamento dinâmico, margens centrais).
- **Visão de Futuro:** O projeto prevê a transição do formato site/web app para um **aplicativo de celular (Mobile App)** nativo/híbrido posteriormente. A arquitetura de CSS e componentes deve evitar coisas que seriam impossíveis de portar (manter a simplicidade modular).

---

## ⚙️ Arquivo `.env` e Variáveis de Ambiente
O aplicativo depende de um arquivo `.env` local para se comunicar com as plataformas. Este arquivo não é versionado (fica no `.gitignore`). As variáveis padrão utilizadas no código são:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

> [!WARNING]
> **NUNCA** inclua os valores reais dessas chaves no código-fonte, nos arquivos Markdown de contexto ou nos logs de chat.

---

## 🗄️ Banco de Dados (Supabase / PostgreSQL)
O aplicativo usa **PostgreSQL** gerenciado pelo Supabase. O agente deve assumir a estrutura abaixo como base da arquitetura de dados e referenciá-las para queries ou RPCs.

### Tabelas Principais (Estrutura Básica)

#### 1. `users` (ou `profiles`)
Armazena as informações públicas ou gerenciadas do usuário autenticado no app.
- `id` (uuid) - Primary Key, referência ao ID do Supabase Auth.
- `name` / `display_name` (varchar) - Nome de exibição do usuário.
- `email` (varchar) - E-mail do usuário.
- `avatar_url` (varchar) - Foto de perfil.
- `xp` / `faith_points` (integer) - Pontos acumulados na jornada.
- `created_at` (timestamp) - Data de registro.

#### 2. `prayer_requests`
Armazena os pedidos de oração que os usuários enviam para a comunidade.
- `id` (uuid) - Primary Key.
- `user_id` (uuid) - Chave estrangeira ligando ao autor do pedido.
- `title` (varchar) - Título curto do pedido.
- `content` / `description` (text) - Texto detalhando a situação.
- `is_anonymous` (boolean) - Flag para esconder dados do autor se for true.
- `created_at` (timestamp) - Data do envio da causa.

#### 3. `prayer_intercessions` (Histórico de Intercessão)
Armazena os registros de quem orou por qual causa, fundamental para evitar que a mesma causa apareça duas vezes para o usuário.
- `id` (uuid) - Primary Key.
- `prayer_request_id` (uuid) - Chave estrangeira (qual causa recebeu a oração).
- `intercessor_id` (uuid) - Chave estrangeira (quem é o usuário que está orando).
- `interceded_at` (timestamp) - Quando a oração ocorreu.

#### 4. `prayer_reactions`
Armazena reações emocionais e empáticas enviadas a um pedido específico.
- `id` (uuid) - Primary Key.
- `prayer_request_id` (uuid) - Chave estrangeira.
- `user_id` (uuid) - Chave estrangeira (autor da reação).
- `reaction_type` (varchar) - O tipo da reação (ex: "compaixao", "graca", "forca").
- `created_at` (timestamp) - Quando a reação foi dada.

---

## 🧠 Technical Guidelines (Boas Práticas de Código)
- **Não exponha lógicas backend frágeis no front.**
- **Tipagem Forte:** Como o projeto usa TypeScript, sempre defina interfaces e types claros (ex: `interface PrayerRequest {}`) para os retornos do Supabase.
- **Proteja chamadas do Supabase** fazendo tratamento de erros e usando *loading states* na interface.
