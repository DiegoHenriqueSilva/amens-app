import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { referrer_user_id: referrerUserId, referred_user_id: referredUserId } = await req.json();
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ success: false, message: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ success: false, message: "Invalid authentication" }, 401);

    if (!referrerUserId || !referredUserId || referrerUserId === user.id || referredUserId !== user.id) {
      return json({ success: false, message: "Invalid referral" }, 400);
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing, error: lookupError } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return json({ success: false, message: "Already referred" }, 409);

    const { error: insertError } = await supabase.from("referrals").insert({
      referrer_user_id: referrerUserId,
      referred_user_id: user.id,
      xp_awarded: true,
    });
    if (insertError) {
      if (insertError.code === "23505") return json({ success: false, message: "Already referred" }, 409);
      throw insertError;
    }

    const { error: xpError } = await supabase.rpc("add_xp", {
      p_user_id: referrerUserId,
      p_xp_amount: 20,
      p_action: "referral",
    });
    if (xpError) throw xpError;

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: referrerUserId,
      message: "🎉 Alguém se cadastrou pelo seu link! Você ganhou +20 XP!",
    });
    if (notificationError) throw notificationError;

    return json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
