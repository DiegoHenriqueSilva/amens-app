import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { createPrayerAiHandler } from '../_shared/prayer-ai.ts';
import { DEFAULT_PRAYERS } from '../_shared/default-prayers.ts';
import { SAINTS } from '../_shared/saints.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
const key = Deno.env.get('GEMINI_API_KEY') ?? '';
const model = Deno.env.get('GEMINI_MODEL') ?? '';

Deno.serve(
  createPrayerAiHandler({
    configured: Boolean(key && /^[a-z0-9.-]{1,80}$/.test(model)),
    user: async (authorization) => {
      if (!authorization.startsWith('Bearer ')) return null;
      const { data, error } = await service.auth.getUser(authorization.slice(7));
      return error ? null : (data.user?.id ?? null);
    },
    context: async (user, causeId) => {
      const { data, error } = await service.rpc('prayer_ai_context', {
        p_user: user,
        p_cause_id: causeId,
      });
      if (error || !data) throw new Error('Unavailable context');
      return data;
    },
    defaultContent: (id) => DEFAULT_PRAYERS.find((item) => item.id === id)?.content,
    knownDevotion: (value) => (SAINTS as readonly string[]).includes(value),
    day: () =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
    reserve: async (user, kind, resource) => {
      const { data, error } = await service.rpc('reserve_prayer_ai', {
        p_user: user,
        p_kind: kind,
        p_resource: resource,
      });
      if (error || !data) throw new Error('Unavailable budget');
      return data;
    },
    finish: async (id, output) => {
      const { error } = await service
        .from('prayer_ai_attempts')
        .update({ status: output ? 'done' : 'failed', output })
        .eq('id', id)
        .eq('status', 'pending');
      if (error) throw new Error('Unavailable cache');
    },
    generate: async (prompt) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 512 },
          }),
        },
      );
      if (!response.ok) throw new Error('Provider unavailable');
      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join('') ?? ''
      );
    },
    gospel: async () => {
      const response = await fetch('https://liturgia.up.railway.app/', {
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error('Liturgy unavailable');
      const data = await response.json();
      if (
        typeof data.evangelho?.texto !== 'string' ||
        typeof data.evangelho?.referencia !== 'string'
      )
        throw new Error('Liturgy unavailable');
      return { text: data.evangelho.texto, reference: data.evangelho.referencia };
    },
  }),
);
