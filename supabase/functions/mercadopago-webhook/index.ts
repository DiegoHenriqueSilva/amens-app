import { createClient } from "npm:@supabase/supabase-js@2.75.1";
import { WebhookSignatureValidator } from "npm:mercadopago@2";

const json = (body: unknown, status = 200) => Response.json(body, { status });

function amountToCents(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}

Deno.serve(async request => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret || !accessToken || !url || !serviceKey) {
      const missing = [
        !secret && "MERCADOPAGO_WEBHOOK_SECRET",
        !accessToken && "MERCADOPAGO_ACCESS_TOKEN",
        !url && "SUPABASE_URL",
        !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
      ].filter(Boolean);
      return json({ error: "Donation service is not configured", missing }, 503);
    }

    const raw = await request.text();
    if (raw.length > 32768) return json({ error: "Payload too large" }, 413);
    let event: { id?: unknown; type?: unknown; live_mode?: unknown; data?: { id?: unknown } };
    try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

    const requestUrl = new URL(request.url);
    const queryDataId = requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("data_id");
    const bodyDataId = typeof event.data?.id === "string" ? event.data.id : null;
    const dataId = queryDataId || bodyDataId;
    const requestId = request.headers.get("x-request-id") || "";
    const signature = request.headers.get("x-signature") || "";
    if (!dataId || !/^ORD(?:TST)?[A-Z0-9]{20,60}$/.test(dataId)) {
      return json({ error: "Invalid order identifier" }, 400);
    }
    const eventType = event.type || requestUrl.searchParams.get("type");
    if (eventType !== "order" || (bodyDataId && bodyDataId !== dataId)) return json({ ignored: true });

    let signatureValid = false;
    if (signature) {
      try {
        WebhookSignatureValidator.validate({
          xSignature: signature,
          xRequestId: requestId,
          dataId,
          secret,
          toleranceSeconds: 300,
        });
        signatureValid = true;
      } catch { /* Fall through to authoritative pull verification. */ }
    }

    const database = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    // The fallback cannot be used as an open Mercado Pago API proxy: only a
    // high-entropy order already created by this application may be queried.
    const { data: localOrder, error: localError } = await database.from("donation_orders")
      .select("id,environment").eq("provider_order_id", dataId).maybeSingle();
    if (localError) throw localError;
    if (!localOrder) return json({ error: "Unknown order" }, 401);
    if (!signatureValid) console.warn("Webhook signature mismatch; using authoritative order verification", { orderId: dataId });

    const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(dataId)}`, {
      headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!orderResponse.ok) {
      console.error("Mercado Pago order lookup failed", { status: orderResponse.status });
      return json({ error: "Order lookup failed" }, 503);
    }
    const order = await orderResponse.json();
    const amountCents = amountToCents(order.total_amount);
    if (order.id !== dataId || typeof order.external_reference !== "string" || typeof order.status !== "string" || amountCents === null) {
      return json({ error: "Invalid order response" }, 422);
    }

    const providerEventId = signatureValid && event.id
      ? String(event.id)
      : `verified:${dataId}:${order.status}:${order.status_detail || ""}`;
    const liveMode = typeof order.live_mode === "boolean"
      ? order.live_mode
      : localOrder.environment === "production";
    const { error: eventError } = await database.from("donation_webhook_events").upsert({
      provider_event_id: providerEventId,
      provider_order_id: dataId,
      event_type: String(eventType),
      live_mode: liveMode,
    }, { onConflict: "provider_event_id", ignoreDuplicates: true });
    if (eventError) throw eventError;

    const { data: applied, error: applyError } = await database.rpc("apply_mercadopago_order", {
      p_provider_order_id: dataId,
      p_external_reference: order.external_reference,
      p_status: order.status,
      p_status_detail: String(order.status_detail || ""),
      p_live_mode: liveMode,
      p_amount_cents: amountCents,
    });
    if (applyError) throw applyError;
    if (!applied) {
      console.warn("Mercado Pago order did not match a local donation", { orderId: dataId });
      return json({ error: "Order mismatch" }, 422);
    }
    return json({ received: true });
  } catch (error) {
    console.error("Mercado Pago webhook failed", { name: error instanceof Error ? error.name : "unknown" });
    return json({ error: "Webhook processing failed" }, 500);
  }
});
