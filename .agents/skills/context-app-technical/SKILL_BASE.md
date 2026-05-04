# Technical Context - Améns

## 💻 Programming Languages

- TypeScript / JavaScript (Frontend)
- SQL (Database queries)
- Potential backend logic via Supabase functions

---

## 🧰 Frameworks & Tools

- React (likely via Vite)
- Supabase SDK
- Vercel deployment platform

---

## 🔗 Repository

GitHub Repository:
https://github.com/DiegoHenriqueSilva/amens-app

---

## ⚙️ Environment Variables (.env)

A `.env` file should exist with keys such as:

- VITE_SUPABASE_URL=
- VITE_SUPABASE_ANON_KEY=
- VITE_GEMINI_API_KEY=

⚠️ Never expose real values.

---

## 📱 Responsiveness Strategy

- Mobile-first design
- Responsive layout for desktop
- Future possibility: native mobile app

---

## 🗄️ Database

### Engine
- PostgreSQL (via Supabase)

### Expected Entities

Examples:

#### users
- id
- name
- email
- created_at

#### prayers
- id
- user_id
- content
- created_at

#### interactions
- id
- prayer_id
- user_id
- type (e.g., "amen")

---

## 🧠 Technical Guidelines

- Avoid hardcoding sensitive values
- Use modular components
- Maintain separation of concerns
- Keep code readable and maintainable

---

## ⚠️ Important

Whenever asked about code, ALWAYS refer to the correct context skill before answering.
