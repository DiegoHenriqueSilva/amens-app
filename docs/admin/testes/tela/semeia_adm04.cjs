// Cria os dados de teste da ADM04 pela API real (como o app faria), com as contas de teste.
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || '.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Credenciais fora do repositório: { autor, mod, d1, d2: {email, senha} }
const C = require(require('path').resolve(process.env.CONTAS_TESTE || 'contas_teste.json'));
const tok = {};
async function login(k) {
  if (tok[k]) return tok[k];
  const j = await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: C[k].email, password: C[k].senha }) })).json();
  tok[k] = { t: j.access_token, id: j.user.id }; return tok[k];
}
async function rest(k, method, path, body, prefer = 'return=minimal') {
  const { t } = await login(k);
  const r = await fetch(URL_SB + '/rest/v1/' + path, { method, headers: { apikey: KEY, authorization: 'Bearer ' + t, 'content-type': 'application/json', prefer }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  return { status: r.status, body: txt };
}
(async () => {
  const autor = await login('autor'), d1 = await login('d1'), d2 = await login('d2'), mod = await login('mod');
  const pr = await rest('autor', 'POST', 'prayer_requests', { title: '[TESTE ADM04] Pedido denunciado', content: 'Pedido de teste das denúncias. Pode ignorar, será apagado ao fim do teste.', user_id: autor.id, author_name: 'Autor', prayer_count: 0 }, 'return=representation');
  const prayer = JSON.parse(pr.body)[0];
  console.log('pedido', pr.status, prayer.status);
  const ct = await rest('autor', 'POST', 'prayer_contributions', { user_id: autor.id, target_timestamp: Date.now(), author_name: 'Autor Teste ADM04', author_city: 'Teste' }, 'return=representation');
  const contrib = JSON.parse(ct.body)[0];
  console.log('participação', ct.status);
  const rep = (k, body) => rest(k, 'POST', 'prayer_reports', { reporter_user_id: tok[k].id, ...body });
  console.log('d1 pedido', (await rep('d1', { prayer_request_id: prayer.id, target_type: 'prayer_request', category: 'spam', description: 'Parece repetido (teste).', status: 'open' })).status);
  console.log('d1 pedido de novo (deve ser ignorado)', (await rep('d1', { prayer_request_id: prayer.id, target_type: 'prayer_request', category: 'fake', status: 'open' })).status);
  console.log('d2 pedido, Outro', (await rep('d2', { prayer_request_id: prayer.id, target_type: 'prayer_request', category: 'other', custom_reason: 'Texto de teste fora do tema', status: 'open' })).status);
  console.log('d2 forjando "resolvido" no pedido (vira aberta e duplicada → ignorada)', (await rep('d2', { prayer_request_id: prayer.id, target_type: 'prayer_request', category: 'spam', status: 'resolved', resolution_notes: 'forjado' })).status);
  console.log('mod pedido (3ª pessoa)', (await rep('mod', { prayer_request_id: prayer.id, target_type: 'prayer_request', category: 'inappropriate', status: 'open' })).status);
  console.log('d1 pessoa', (await rep('d1', { target_type: 'user', target_user_id: autor.id, category: 'harassment', description: 'Mensagens insistentes (teste).', status: 'open' })).status);
  console.log('d2 remetente', (await rep('d2', { target_type: 'message', target_user_id: autor.id, category: 'harassment', status: 'open' })).status);
  console.log('d1 participação', (await rep('d1', { target_type: 'contribution', target_contribution_id: contrib.id, category: 'inappropriate', description: 'Nome ofensivo (teste).', status: 'open' })).status);
  console.log('d1 denuncia a si mesmo', (await rep('d1', { target_type: 'user', target_user_id: d1.id, category: 'spam', status: 'open' })).body.slice(0, 120));
  const pr2 = await rest('autor', 'GET', `prayer_requests?id=eq.${prayer.id}&select=status`);
  console.log('situação do pedido após 3 pessoas:', pr2.body);
  fs.writeFileSync(require('path').resolve(process.env.ADM04_IDS || 'adm04_ids.json'), JSON.stringify({ prayer: prayer.id, contrib: contrib.id, autor: autor.id }));
})().catch((e) => { console.error(e); process.exit(1); });
