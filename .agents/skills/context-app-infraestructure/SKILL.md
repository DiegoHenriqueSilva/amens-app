# Antigravity Context Skill - App Infrastructure (Améns)

## 🤖 Diretrizes para o Agente (Antigravity):
Ao planejar novas features de backend, rotas de API, ou integrações de banco de dados, o agente deve **obrigatoriamente** levar em consideração as plataformas definidas abaixo. Não proponha o uso de AWS, Firebase, ou outros serviços se eles não estiverem explicitamente listados aqui como parte da arquitetura estabelecida.

---

## 🧱 Core Platforms
- **Frontend Hosting:** Vercel
- **Backend / Database:** Supabase (PostgreSQL-based)
- **AI Integration:** Google Gemini
- **Code Repository:** GitHub

---

## 🗄️ Backend Architecture (Supabase)
- **Banco de Dados:** PostgreSQL hospedado e gerenciado pelo Supabase.
- **APIs:** Acesso ao banco de dados se dá preferencialmente pelas REST / RPC APIs auto-geradas do Supabase Client SDK, direto do frontend quando possível.
- **Autenticação:** Gerenciada nativamente pelo Supabase Auth.
- **Segurança:** Utilização pesada de Row Level Security (RLS) no PostgreSQL para garantir que cada usuário tenha acesso estrito apenas ao que é permitido, limitando acesso público a informações sensíveis.

---

## ☁️ Deployment Strategy
- Vercel para deploys de frontend (inclui serverless functions/edge se usado Next.js ou Vite/Vercel functions).
- Separação rigorosa entre os ambientes de **Production** e **Preview/Staging**, definidos por ramificações (branches) do repositório.

---

## 🔐 Environment Management
- O gerenciamento de variáveis de ambiente ocorre diretamente no dashboard da Vercel.
- Chaves do Supabase e do Gemini API possuem chaves separadas para Produção vs. Desenvolvimento/Preview.

---

## 📦 CI/CD
- Pipeline baseada em Git e integrada à Vercel.
- Deploys automáticos a cada push na branch principal (`main`).
- Preview deploys gerados para cada pull request a fim de testar novas features antes da mesclagem (merge).

---

## ⚠️ Observações de Infraestrutura
- **Escalabilidade:** Deve ser considerada nas consultas do banco de dados (ex: uso de paginação) devido ao volume esperado de conteúdo gerado por usuários (orações e interações).
- **Custos de IA:** Chamadas de IA para moderação ou geração de conteúdo (Evangelho, Curiosidades) devem ter algum tipo de cache local ou diário no banco para evitar requisições duplicadas e caras.
- **Performance:** Evitar `n+1 queries` ao buscar orações junto com reações e informações de usuário. Utilizar views ou junções otimizadas (joins/rpc) no Supabase.
