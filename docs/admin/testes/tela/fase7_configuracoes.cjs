// Fase 7 — ADM07 na tela: papéis, validação, alteração não salva, conflito, efeito real no XP e níveis.
// Precisa de conta admin em CONTAS[CONTA_ADMIN] (padrão "adm"). Restaura multiplicador 1,0 e limite 3 ao final.
// Limpeza complementar: docs/admin/testes/tela/limpa_adm07.sql
const fs = require('fs');
const { BASE, CONTAS, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const ADM = process.env.CONTA_ADMIN || 'adm';
const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || 'c:/Projetos/Amens_Git/.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const tokens = {};
async function token(k) {
  if (!tokens[k]) tokens[k] = (await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: CONTAS[k].email, password: CONTAS[k].senha }) })).json());
  return tokens[k];
}
async function rpc(k, fn, args) {
  const r = await fetch(URL_SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + (k ? (await token(k)).access_token : KEY), 'content-type': 'application/json' }, body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const toastText = async (p) => (await p.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');
const form = (p, nome) => p.getByRole('form', { name: nome });
async function abrir(p) { await p.goto(BASE + '/admin/settings', { waitUntil: 'domcontentloaded' }); await esperar(p, 1800); }

(async () => {
  // Segurança do XP pela API
  const autor = (await token('autor')).user.id, d1 = (await token('d1')).user.id;
  log('[anon] add_xp →', JSON.stringify(await rpc(null, 'add_xp', { p_user_id: autor, p_xp_amount: 9999, p_action: 'pray' })).slice(0, 140));
  log('[autor] add_xp para outra pessoa →', JSON.stringify(await rpc('autor', 'add_xp', { p_user_id: d1, p_xp_amount: 9999, p_action: 'pray' })).slice(0, 160));
  const r0 = await rpc('autor', 'add_xp', { p_user_id: autor, p_xp_amount: 9999, p_action: 'react' });
  log('[autor] add_xp 9999 em reagir →', JSON.stringify(r0));
  const r1 = await fetch(URL_SB + '/rest/v1/user_xp?user_id=eq.' + autor, { method: 'PATCH', headers: { apikey: KEY, authorization: 'Bearer ' + (await token('autor')).access_token, 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify({ total_xp: 99999 }) });
  log('[autor] PATCH no próprio XP →', r1.status, (await r1.text()).slice(0, 120));

  const b = await abrirBrowser();
  const M = await (await novoContexto(b)).newPage();
  await login(M, 'mod'); await abrir(M);
  log('[mod] /admin/settings →', M.url(), '| RPC:', (await rpc('mod', 'admin_get_settings', {})).status);
  await shot(M, 'f7_01_moderador_sem_acesso');

  const A = await (await novoContexto(b)).newPage();
  await login(A, ADM); await abrir(A);
  await shot(A, 'f7_02_configuracoes_desktop');

  // Multiplicador: inválido, alteração não salva, salvar, efeito no próximo ganho
  let f = form(A, 'Multiplicador de XP');
  await f.getByLabel('Multiplicador').fill('0');
  log('[mult 0]', (await f.innerText()).replace(/\s+/g, ' ').slice(0, 200), '| Salvar habilitado?', await f.getByRole('button', { name: 'Salvar' }).isEnabled());
  await shot(A, 'f7_03_multiplicador_invalido');
  await f.getByLabel('Multiplicador').fill('1,5');
  log('[mult 1,5]', (await f.innerText()).replace(/\s+/g, ' ').slice(0, 260));
  await shot(A, 'f7_04_alteracao_nao_salva');
  await f.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[mult salvar] toast:', await toastText(A), '|', (await f.innerText()).replace(/\s+/g, ' ').slice(0, 120));
  const antes = (await rpc('autor', 'add_xp', { p_user_id: autor, p_xp_amount: 1, p_action: 'react' })).body;
  const depois = (await rpc('autor', 'add_xp', { p_user_id: autor, p_xp_amount: 1, p_action: 'react' })).body;
  log('[efeito] reagir com 1,5× →', depois - antes, 'XP');

  // Limite de denúncias: inválido, conflito com outra sessão, salvar
  f = form(A, 'Revisão automática por denúncias');
  await f.getByLabel('Pessoas diferentes').fill('1');
  log('[limite 1]', (await f.innerText()).replace(/\s+/g, ' ').slice(0, 220));
  await f.getByLabel('Pessoas diferentes').fill('4');
  log('[outra sessão] grava 5:', (await rpc(ADM, 'admin_set_setting', { p_key: 'auto_escalate_threshold', p_value: '5' })).status);
  await f.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[conflito]', (await f.locator('[role="alert"]').innerText().catch(() => '—')).replace(/\s+/g, ' '), '| campo:', await f.getByLabel('Pessoas diferentes').inputValue(), '|', (await f.innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await shot(A, 'f7_05_conflito');
  await f.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[limite salvar] toast:', await toastText(A));

  await A.locator('text=Níveis da Jornada da Fé').scrollIntoViewIfNeeded();
  await shot(A, 'f7_06_niveis');

  // Celular e tema legado
  const C = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(C, ADM); await abrir(C); await shot(C, 'f7_07_celular');
  await C.evaluate(() => localStorage.setItem('amens-theme', 'legacy')); await abrir(C); await shot(C, 'f7_08_celular_legado');
  await C.setViewportSize({ width: 320, height: 640 }); await C.waitForTimeout(800); await shot(C, 'f7_09_320_legado');
  await C.setViewportSize({ width: 844, height: 390 }); await C.waitForTimeout(800); await shot(C, 'f7_10_paisagem_legado');

  // Restaura os valores de produção
  log('[restaura]', (await rpc(ADM, 'admin_set_setting', { p_key: 'xp_global_multiplier', p_value: '1.0' })).status,
    (await rpc(ADM, 'admin_set_setting', { p_key: 'auto_escalate_threshold', p_value: '3' })).status);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
