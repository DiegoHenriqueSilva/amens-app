import { createClient } from "npm:@supabase/supabase-js@2.75.1";
import { buildFcmConfigurationProbe, buildPushMessage, createGoogleAssertion, isExpiredToken, parseNotificationEvent, secretsMatch } from "./fcm.ts";
import type { ServiceAccount } from "./fcm.ts";

let googleToken: { value: string; expires: number } | undefined;
async function getGoogleToken(account: ServiceAccount) {
  if (googleToken && googleToken.expires > Date.now() + 60000) return googleToken.value;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await createGoogleAssertion(account) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Google authorization failed.");
  const data = await response.json();
  if (!data.access_token || !data.expires_in) throw new Error("Invalid Google authorization response.");
  googleToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return googleToken.value;
}
const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async request => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret) return json({ error: "Push delivery is not configured" }, 503);
  if (!await secretsMatch(request.headers.get("x-push-webhook-secret"), webhookSecret)) return json({ error: "Unauthorized" }, 401);
  try {
    const text = await request.text();
    if (text.length > 16384) return json({ error: "Payload too large" }, 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return json({ error: "Invalid JSON" }, 400); }
    const checkConfiguration = (body as { action?: string })?.action === "check_configuration";
    const notificationId = parseNotificationEvent(body);
    if (!checkConfiguration && !notificationId) return json({ error: "Expected a notifications INSERT event" }, 400);
    const config = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!config || !url || !key) return json({ error: "Push delivery is not configured" }, 503);
    const account: ServiceAccount = JSON.parse(config);
    if (!account.client_email || !account.private_key || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(account.project_id)) throw new Error("Invalid Firebase configuration.");
    const database = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    if (checkConfiguration) {
      const accessToken = await getGoogleToken(account);
      const { error: tableError } = await database.from("push_devices").select("id", { head: true }).limit(0);
      if (tableError) throw tableError;
      const fcm = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildFcmConfigurationProbe()), signal: AbortSignal.timeout(15000),
      });
      if (!fcm.ok) {
        const details = await fcm.json();
        const reason = details?.error?.details?.find((item: { "@type"?: string }) => item["@type"] === "type.googleapis.com/google.rpc.ErrorInfo")?.reason;
        return json({ error: "FCM API validation failed", upstream_status: fcm.status, upstream_reason: reason }, 503);
      }
      return json({ configured: true, firebase_project: account.project_id, database_ready: true, fcm_api_ready: true });
    }
    // Resolve the recipient from the database, never from untrusted webhook fields.
    const { data: notification, error: readError } = await database.from("notifications").select("id,user_id,is_read,type,message").eq("id", notificationId!).maybeSingle();
    if (readError) throw readError;
    if (!notification || notification.is_read) return json({ sent: 0, skipped: true });
    const { data: devices, error } = await database.from("push_devices").select("id,token")
      .eq("user_id", notification.user_id).eq("platform", "android").limit(100);
    if (error) throw error;
    if (!devices?.length) return json({ sent: 0 });
    const accessToken = await getGoogleToken(account);
    let sent = 0, expired = 0, failed = 0;
    // Bound parallel sends to avoid overwhelming the function or FCM.
    for (let offset = 0; offset < devices.length; offset += 5) {
      await Promise.all(devices.slice(offset, offset + 5).map(async device => {
        try {
          const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
            method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(buildPushMessage(device.token, notification)), signal: AbortSignal.timeout(15000),
          });
          if (response.ok) { sent++; return; }
          const details = await response.json();
          if (isExpiredToken(details)) {
            // Preserve a refreshed token if registration raced with delivery.
            const { error: deleteError } = await database.from("push_devices").delete().eq("id", device.id).eq("token", device.token);
            if (deleteError) failed++; else expired++;
          } else {
            console.warn("FCM delivery rejected", { status: response.status, code: details?.error?.status });
            if (response.status === 401) googleToken = undefined;
            failed++;
          }
        } catch { failed++; }
      }));
    }
    // Do not log credentials, device tokens, or personal notification content.
    console.info("Native push delivery", { notificationId, sent, expired, failed });
    return json({ sent, expired, failed }, failed ? 503 : 200);
  } catch {
    console.error("Native push delivery failed. Check server configuration and database access.");
    return json({ error: "Push delivery failed" }, 500);
  }
});
