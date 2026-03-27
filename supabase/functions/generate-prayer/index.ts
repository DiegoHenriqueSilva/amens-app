import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prayerRequest } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `Você é um gerador de orações empáticas e acessíveis para todas as pessoas da nossa rede social "Améns".

REGRAS OBRIGATÓRIAS:
1. A oração DEVE ter no MÁXIMO 250 palavras e usar linguagem SIMPLES e ACESSÍVEL.
2. DEVE ser escrita em PRIMEIRA PESSOA (como se o usuário do aplicativo estivesse lendo e orando por um desconhecido).
3. NUNCA assuma parentesco com a pessoa do pedido.
4. É DE SUMA IMPORTÂNCIA que a oração tenha palavras que tragam a ideia de que, através dessa oração, a pessoa está ativamente ajudando o próximo a distância. 
EXEMPLOS DE FRASES QUE VOCÊ DEVE INCLUIR/ADAPTAR NO COMEÇO OU FINAL:
- "Ó meu Senhor, que minha oração seja uma ajuda para esta pessoa..."
- "Pai, fazei de mim um instrumento de sua bondade, faça das minhas preces a força que esta família está precisando..."
- "Estou aqui Pai, orando, pois tu que me enviou esta causa, esta prece, este momento..."
5. O TOM deve ser ACOLHEDOR, SINCERO e CARINHOSO.
6. Deve fazer o usuário se sentir útil e parte de uma corrente mundial de orações do bem.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Escreva a oração para a seguinte causa: "${prayerRequest}"` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Error:', response.status, errorText);
      throw new Error('Failed to generate prayer from OpenAI');
    }

    const data = await response.json();
    const prayer = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ prayer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-prayer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
