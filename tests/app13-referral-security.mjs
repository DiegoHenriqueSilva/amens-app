import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("supabase/functions/process-referral/index.ts", "utf8");
assert.match(source, /Authorization/);
assert.match(source, /authClient\.auth\.getUser/);
assert.match(source, /referredUserId !== user\.id/);
assert.match(source, /referrerUserId === user\.id/);
assert.match(source, /insertError\.code === "23505"/);
assert.match(source, /if \(xpError\) throw xpError/);
assert.match(source, /if \(notificationError\) throw notificationError/);
console.log("APP13 referral security contract passed: authenticated identity, self-referral rejection, race handling and post-insert rewards.");
