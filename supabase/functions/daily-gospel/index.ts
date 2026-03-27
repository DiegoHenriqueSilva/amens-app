import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const prompt = `Você é um especialista em liturgia católica. Me forneça EXATAMENTE o Evangelho do dia da liturgia católica para hoje, ${dateStr}.

REGRAS:
1. Deve ser o evangelho que é lido na missa católica de hoje conforme o calendário litúrgico
2. Responda APENAS em JSON válido, sem markdown, sem código
3. Use este formato exato:

{"verse":"[texto completo do evangelho do dia]","reference":"[livro capítulo:versículos]","liturgicalDay":"[nome do dia litúrgico, ex: 3ª Semana da Quaresma]","title":"[título da passagem do evangelho]"}

Retorne SOMENTE o JSON, nada mais.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error('AI gateway error');

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? '';

    // Clean markdown fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const gospel = JSON.parse(content);

    return new Response(
      JSON.stringify(gospel),
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
