import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^\"|\"$/g, "")]; }));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const password = process.env.APP10_PASSWORD || "testeteste";
const signIn = async (email) => {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.user?.id);
  return data.user.id;
};

const userA = await signIn(process.env.APP10_EMAIL || "teste-a@amens.test");
const userB = await signIn("teste-b@amens.test");
const { data: foreignRows, error: readError } = await client.from("notifications").select("id").eq("user_id", userA);
assert.ifError(readError);
assert.equal(foreignRows?.length ?? 0, 0, "a conta B não deve ler notificações da conta A");
const { data: updateRows, error: updateError } = await client.from("notifications").update({ is_read: true }).eq("user_id", userA).select("id");
assert.ifError(updateError);
assert.equal(updateRows?.length ?? 0, 0, "a conta B não deve atualizar notificações da conta A");
await client.auth.signOut();
console.log(`APP10 security passed: account isolation verified for ${userA} and ${userB}.`);
