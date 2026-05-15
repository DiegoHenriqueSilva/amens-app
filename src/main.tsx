import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Surface missing env vars immediately instead of silent blank page
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing = [
    !SUPABASE_URL && "VITE_SUPABASE_URL",
    !SUPABASE_KEY && "VITE_SUPABASE_ANON_KEY",
  ].filter(Boolean).join(", ");

  console.error(
    `[Amens] ❌ Missing env vars: ${missing}\n` +
    `Create a .env file at the project root with:\n\n` +
    `  VITE_SUPABASE_URL=https://<your-project>.supabase.co\n` +
    `  VITE_SUPABASE_ANON_KEY=<your-anon-key>\n\n` +
    `Get these from: https://supabase.com/dashboard → Project Settings → API`
  );

  document.getElementById("root")!.innerHTML = `
    <div style="font-family:monospace;padding:2rem;max-width:600px;margin:4rem auto">
      <h2 style="color:#b91c1c">⚠️ Variáveis de ambiente ausentes</h2>
      <p>Crie um arquivo <strong>.env</strong> na raiz do projeto com:</p>
      <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto">VITE_SUPABASE_URL=https://&lt;seu-projeto&gt;.supabase.co
VITE_SUPABASE_ANON_KEY=&lt;sua-anon-key&gt;</pre>
      <p>Encontre as chaves em:<br>
        <a href="https://supabase.com/dashboard" target="_blank">supabase.com/dashboard</a>
        → <em>Project Settings → API</em>
      </p>
      <p style="color:#6b7280;font-size:0.85rem">Variáveis faltando: <strong>${missing}</strong></p>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
