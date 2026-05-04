# App Infrastructure Context - Améns

## 🧱 Core Platforms

- Frontend Hosting: :contentReference[oaicite:0]{index=0}
- Backend / Database: :contentReference[oaicite:1]{index=1}
- AI Integration: :contentReference[oaicite:2]{index=2}
- Code Repository: :contentReference[oaicite:3]{index=3}

---

## 🗄️ Backend Architecture

- Supabase (PostgreSQL-based)
- REST / RPC APIs via Supabase
- Authentication handled by Supabase Auth
- Row Level Security (RLS) may be applied

---

## ☁️ Deployment Strategy

- Vercel for frontend deployments
- Preview environments per branch
- Production and staging separation via environment variables

---

## 🔐 Environment Management

- Environment variables handled via Vercel
- Supabase keys separated per environment:
  - Production
  - Preview / Dev

---

## 📦 CI/CD

- Git-based deployment
- Automatic deploy on push
- Preview deploys for testing features before production

---

## ⚠️ Observations

- Scalability must be considered due to potential high user-generated content
- AI moderation cost should be optimized
- Database performance should be monitored as usage grows
