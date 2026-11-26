import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")]; }));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: "teste-a@amens.test", password: "testeteste" });
assert.ifError(authError);
const userId = auth.user.id;
const { data: profile, error: readError } = await client.from("profiles").select("id,full_name").eq("id", userId).single();
assert.ifError(readError);
const { data: updated, error: updateError } = await client.from("profiles").update({ full_name: profile.full_name }).eq("id", userId).select("id");
console.log(JSON.stringify({ userId, readOwnProfile: !readError, updateError: updateError?.message ?? null, updatedRows: updated?.length ?? 0 }));
await client.auth.signOut();
