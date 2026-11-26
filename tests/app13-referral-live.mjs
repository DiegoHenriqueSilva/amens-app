import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")]; }));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data, error } = await client.auth.signInWithPassword({ email: "teste-a@amens.test", password: "testeteste" });
assert.ifError(error);
const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/process-referral`, {
  method: "POST",
  headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ referrer_user_id: "628f5a88-0875-4a38-a832-ba6ee2e6809a", referred_user_id: "628f5a88-0875-4a38-a832-ba6ee2e6809a" }),
});
assert.equal(response.status, 400);
console.log("APP13 live referral guard passed: invalid authenticated identity rejected with HTTP 400.");
await client.auth.signOut();
