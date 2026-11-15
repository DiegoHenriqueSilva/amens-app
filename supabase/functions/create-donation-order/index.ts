import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const allowedOrigins = new Set(["https://www.amens.com.br", "https://amens.com.br", "http://localhost", "capacitor://localhost"]);
const json = (body: unknown, status = 200, origin = "https://www.amens.com.br") => Response.json(body, {
  status,
  headers: {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://www.amens.com.br",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  },
});

Deno.serve(async request => {
  const origin = request.headers.get("origin") || "https://www.amens.com.br";
  if (request.method === "OPTIONS") return json({}, 200, origin);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const authorization = request.headers.get("authorization");
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const environment = Deno.env.get("MERCADOPAGO_ENVIRONMENT") === "production" ? "production" : "test";
    if (!authorization || !url || !anonKey || !serviceKey || !accessToken) {
      return json({ error: "Donation service is not configured" }, 503, origin);
    }

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.email) return json({ error: "Authentication required" }, 401, origin);

    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "Payload too large" }, 413, origin);
    let body: { amountCents?: unknown; native?: unknown };
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    const amountCents = body.amountCents;
    if (!Number.isInteger(amountCents) || (amountCents as number) < 500 || (amountCents as number) > 1000000) {
      return json({ error: "Invalid donation amount" }, 400, origin);
    }
    const native = body.native === true;
    const database = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count, error: countError } = await database.from("donation_orders").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since);
    if (countError) throw countError;
    if ((count || 0) >= 5) return json({ error: "Aguarde alguns minutos antes de iniciar outra doação." }, 429, origin);

    const id = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const { error: insertError } = await database.from("donation_orders").insert({
      id, user_id: user.id, amount_cents: amountCents, environment, idempotency_key: idempotencyKey,
    });
    if (insertError) throw insertError;

    const webBase = "https://www.amens.com.br/donate";
    const returnUrl = (result: string) => native
      ? `com.amens.app://auth/callback?payment=${result}`
      : `${webBase}?result=${result}`;
    const amount = ((amountCents as number) / 100).toFixed(2);
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "manual",
        total_amount: amount,
        external_reference: id,
        description: "Doação para apoiar o Améns",
        payer: { email: user.email },
        config: {
          statement_descriptor: "AMENS",
          online: {
            success_url: returnUrl("approved"),
            failure_url: returnUrl("failure"),
            pending_url: returnUrl("pending"),
            auto_return: "all",
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const paymentOrder = await response.json().catch(() => ({}));
    if (!response.ok || typeof paymentOrder.id !== "string" || typeof paymentOrder.checkout_url !== "string") {
      await database.from("donation_orders").update({ status: "create_failed", status_detail: String(paymentOrder?.error || paymentOrder?.message || "provider_error"), updated_at: new Date().toISOString() }).eq("id", id);
      console.error("Mercado Pago order creation failed", { status: response.status, code: paymentOrder?.error || paymentOrder?.code });
      return json({ error: "Não foi possível abrir o pagamento. Tente novamente." }, 502, origin);
    }

    const { error: updateError } = await database.from("donation_orders").update({
      provider_order_id: paymentOrder.id,
      checkout_url: paymentOrder.checkout_url,
      status: "created",
      status_detail: paymentOrder.status_detail || "created",
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "creating");
    if (updateError) throw updateError;
    return json({ checkoutUrl: paymentOrder.checkout_url, testMode: environment === "test" }, 200, origin);
  } catch (error) {
    console.error("Donation order creation failed", { name: error instanceof Error ? error.name : "unknown" });
    return json({ error: "Não foi possível iniciar a doação. Tente novamente." }, 500, origin);
  }
});
