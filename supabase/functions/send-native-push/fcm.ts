export type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function base64url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function createGoogleAssertion(account: ServiceAccount, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), char => char.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}

type PushNotification = { id: string; type?: string | null; message?: string | null };

export function buildPushMessage(token: string, notification: PushNotification) {
  const isDailyGospel = notification.type === "daily_gospel";
  const title = isDailyGospel ? "Bom dia! A Palavra espera por você ✨" : "Améns";
  const body = isDailyGospel && notification.message
    ? notification.message
    : "Você tem uma nova notificação no Améns.";
  const url = isDailyGospel ? "/daily-gospel" : "/messages";
  return { message: {
    token,
    // Personal prayer content stays off lock screens and shared devices.
    notification: { title, body },
    data: { url, notification_id: notification.id, notification_type: notification.type ?? "general" },
    android: { priority: "HIGH", ttl: "86400s", notification: {
      channel_id: "amens-notifications", icon: "ic_notification", sound: "default", tag: `amens-${notification.id}`,
    } },
  } };
}

export function buildFcmConfigurationProbe() {
  return { validate_only: true, message: {
    topic: "amens-configuration-check",
    notification: { title: "Améns", body: "Configuration check" },
  } };
}

export function isExpiredToken(response: unknown) {
  const body = response as { error?: { details?: { "@type"?: string; errorCode?: string }[] } };
  return Array.isArray(body?.error?.details) && body.error.details.some(detail =>
    detail["@type"] === "type.googleapis.com/google.firebase.fcm.v1.FcmError" && detail.errorCode === "UNREGISTERED");
}

export function parseNotificationEvent(value: unknown): string | null {
  const event = value as { type?: string; schema?: string; table?: string; record?: { id?: string } };
  if (event?.type !== "INSERT" || event.schema !== "public" || event.table !== "notifications") return null;
  const id = event.record?.id;
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export async function secretsMatch(actual: string | null, expected: string) {
  if (!actual || !expected) return false;
  const digest = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
