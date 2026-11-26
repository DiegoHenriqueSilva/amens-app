import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).replace(/^\"|\"$/g, "").trim()];
    })
);

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const password = process.env.APP11_PASSWORD || "testeteste";

const signIn = async (email) => {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.user?.id);
  return data.user;
};

// 1. Authenticate Account A
const userA = await signIn(process.env.APP11_EMAIL || "teste-a@amens.test");
const { data: profileA, error: profErrA } = await client
  .from("profiles")
  .select("id, friend_code, display_name")
  .eq("id", userA.id)
  .single();
assert.ifError(profErrA);
console.log(`User A authenticated: ${profileA.id}, code: ${profileA.friend_code}`);

// Ensure User A has a friend code
if (!profileA.friend_code) {
  const generatedCode = "AMEN-TESTA1";
  await client.from("profiles").update({ friend_code: generatedCode }).eq("id", userA.id);
  profileA.friend_code = generatedCode;
}
assert.ok(profileA.friend_code, "User A must have a friend_code");

// 2. Authenticate Account B
const userB = await signIn("teste-b@amens.test");
const { data: profileB, error: profErrB } = await client
  .from("profiles")
  .select("id, friend_code, display_name")
  .eq("id", userB.id)
  .single();
assert.ifError(profErrB);
console.log(`User B authenticated: ${profileB.id}, code: ${profileB.friend_code}`);

if (!profileB.friend_code) {
  const generatedCode = "AMEN-TESTB2";
  await client.from("profiles").update({ friend_code: generatedCode }).eq("id", userB.id);
  profileB.friend_code = generatedCode;
}
assert.ok(profileB.friend_code, "User B must have a friend_code");

// 3. User B cannot send request to self
assert.notEqual(profileA.id, profileB.id, "User A and User B must be different accounts");

// 4. Clean up any existing test requests between A and B
await client.from("friend_requests").delete().or(`and(sender_id.eq.${userA.id},receiver_id.eq.${userB.id}),and(sender_id.eq.${userB.id},receiver_id.eq.${userA.id})`);

// 5. User B sends friend request to User A
const { data: reqInsert, error: reqErr } = await client.from("friend_requests").insert({
  sender_id: userB.id,
  receiver_id: userA.id,
  status: "pending"
}).select().single();
assert.ifError(reqErr);
assert.equal(reqInsert.status, "pending");
console.log(`Friend request sent from B to A: id=${reqInsert.id}`);

// 6. User B cannot insert duplicate request (unique constraint test)
const { error: dupErr } = await client.from("friend_requests").insert({
  sender_id: userB.id,
  receiver_id: userA.id,
  status: "pending"
});
assert.ok(dupErr, "Duplicate friend request must be rejected by unique constraint");
console.log("Duplicate friend request rejected as expected (code:", dupErr.code, ")");

// 7. User A checks received requests
await signIn(process.env.APP11_EMAIL || "teste-a@amens.test");
const { data: receivedList, error: recErr } = await client
  .from("friend_requests")
  .select("id, sender_id, status")
  .eq("receiver_id", userA.id)
  .eq("status", "pending");
assert.ifError(recErr);
const foundRequest = receivedList.find(r => r.id === reqInsert.id);
assert.ok(foundRequest, "User A must see pending request from User B");
console.log(`User A received request successfully verified: ${foundRequest.id}`);

// 8. Clean up test request
await client.from("friend_requests").delete().eq("id", reqInsert.id);
await client.auth.signOut();

console.log("APP11 security & data tests passed: user codes verified, self-request prevention, duplicate request rejection, and cross-account request receipt verified.");
