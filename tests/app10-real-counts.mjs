import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")]; }));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
for (const email of ["teste-a@amens.test", "teste-b@amens.test", "teste-moderador@amens.test", "teste-admin@amens.test"]) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: "testeteste" });
  if (error) { console.log(email, "LOGIN ERROR", error.message); continue; }
  const result = await client.from("notifications").select("id", { count: "exact", head: true });
  console.log(email, data.user.id, "notifications=", result.count, "error=", result.error?.message ?? "none");
  if (email === "teste-b@amens.test") await client.from("notifications").update({ is_read: true }).eq("user_id", data.user.id).like("message", "APP10_REAL_%");
}
await client.auth.signOut();
