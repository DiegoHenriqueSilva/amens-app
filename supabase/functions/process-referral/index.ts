import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referrer_user_id, referred_user_id } = await req.json();

    if (!referrer_user_id || !referred_user_id || referrer_user_id === referred_user_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid referral' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', referred_user_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'Already referred' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert referral
    await supabase.from('referrals').insert({
      referrer_user_id,
      referred_user_id,
      xp_awarded: true,
    });

    // Award 30 XP to referrer
    await supabase.rpc('add_xp', {
      p_user_id: referrer_user_id,
      p_xp_amount: 30,
      p_action: 'referral',
    });

    // Notify referrer
    await supabase.from('notifications').insert({
      user_id: referrer_user_id,
      message: '🎉 Alguém se cadastrou pelo seu link! Você ganhou +30 XP!',
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
