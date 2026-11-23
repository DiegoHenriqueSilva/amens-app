// Fase 8 — ADM08 na tela: trilha das ações, filtros, detalhe, texto íntimo sob demanda, integridade e tamanhos.
// Precisa de conta admin em CONTAS[CONTA_ADMIN] (padrão "adm"). Dados de teste: motivo "[TESTE ADM08] …".
// Limpeza: docs/admin/testes/tela/limpa_adm08.sql
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
async function call(k, method, p, body) {
  const r = await fetch(URL_SB + '/rest/v1/' + p, { method, headers: { apikey: KEY, authorization: 'Bearer ' + (await token(k)).access_token, 'content-type': 'application/json', prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: (await r.text()).slice(0, 220) };
}
async function abrir(p, busca = '[TESTE ADM08]') {
  await p.goto(BASE + '/admin/logs', { waitUntil: 'domcontentloaded' });
  await esperar(p, 1800);
  if (busca) { await p.getByLabel('Buscar por quem fez, alvo, motivo ou ID').fill(busca); await p.waitForTimeout(2000); }
}

(async () => {
  const d1 = (await token('d1')).user.id;
  // Ações reais pelo painel (comandos do servidor) para aparecerem na trilha
  log('[adm] suspende d1:', (await call(ADM, 'POST', 'rpc/admin_suspend_user', { p_user: d1, p_days: 2, p_reason: '[TESTE ADM08] suspensão de teste' })).status);
  log('[adm] retira suspensão:', (await call(ADM, 'POST', 'rpc/admin_unsuspend_user', { p_user: d1, p_reason: '[TESTE ADM08] fim do teste' })).status);
  // Tentativa de forjar: moderador grava log com outro ator e data antiga
  const adminId = (await token(ADM)).user.id;
  log('[mod] log forjado:', JSON.stringify(await call('mod', 'POST', 'moderation_logs', { moderator_id: adminId, target_type: 'user', target_id: d1, action: 'ban', reason: '[TESTE ADM08] forjado', created_at: '2020-01-01T00:00:00Z' })));
  log('[mod] apagar log:', JSON.stringify(await call('mod', 'DELETE', 'moderation_logs?reason=eq.' + encodeURIComponent('[TESTE ADM08] forjado'))));
  log('[mod] consulta da tela:', (await call('mod', 'POST', 'rpc/admin_list_logs', {})).status);

  const b = await abrirBrowser();
  const M = await (await novoContexto(b)).newPage();
  await login(M, 'mod'); await abrir(M, '');
  log('[mod] /admin/logs →', M.url());
  await shot(M, 'f8_01_moderador_sem_acesso');

  const A = await (await novoContexto(b)).newPage();
  await login(A, ADM); await abrir(A, '');
  log('[lista] rodapé:', await A.locator('[aria-live="polite"]').first().innerText());
  await shot(A, 'f8_02_lista_desktop');

  await abrir(A);
  log('[busca teste]', (await A.locator('table tbody').innerText()).replace(/\s+/g, ' ').slice(0, 500));
  await shot(A, 'f8_03_busca_teste');
  // Detalhe da suspensão
  await A.getByRole('button', { name: /^Ver detalhes: Suspenso/ }).first().click(); await A.waitForTimeout(500);
  log('[detalhe suspensão]', (await A.locator('table tbody').innerText()).replace(/\s+/g, ' ').slice(0, 400));
  await shot(A, 'f8_04_detalhe_suspensao');

  // Texto íntimo sob demanda (log de edição semeado por semeia_adm08.sql)
  await abrir(A, '[TESTE ADM08] ajuste');
  await A.getByRole('button', { name: /^Ver detalhes: Conteúdo editado/ }).first().click(); await A.waitForTimeout(500);
  log('[edição] antes de mostrar:', (await A.locator('table tbody').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await shot(A, 'f8_05_texto_escondido');
  await A.getByRole('button', { name: 'Mostrar texto anterior' }).click(); await A.waitForTimeout(1500);
  log('[edição] depois:', (await A.locator('table tbody').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await shot(A, 'f8_06_texto_mostrado');

  // Filtros: automático, período inválido, sem resultado
  await abrir(A, '');
  await A.getByRole('combobox', { name: 'Filtrar por quem fez' }).click(); await A.getByRole('option', { name: 'Automático (sistema)' }).click(); await A.waitForTimeout(2000);
  log('[filtro automático] rodapé:', await A.locator('[aria-live="polite"]').first().innerText());
  await A.getByLabel('De', { exact: true }).fill('2026-11-23'); await A.getByLabel('Até', { exact: true }).fill('2026-11-01'); await A.waitForTimeout(800);
  log('[período inválido]', await A.locator('[aria-live="polite"]').first().innerText());
  await shot(A, 'f8_07_periodo_invalido');
  await A.getByRole('button', { name: 'Limpar filtros' }).click(); await A.waitForTimeout(1500);
  await A.getByLabel('Buscar por quem fez, alvo, motivo ou ID').fill('nada-com-isso-xyz'); await A.waitForTimeout(2000);
  log('[sem resultado]', (await A.locator('main').innerText()).includes('Nenhum registro com esses filtros.'));
  await shot(A, 'f8_08_sem_resultado');

  // Celular e tema legado
  const C = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(C, ADM); await abrir(C); await shot(C, 'f8_09_celular');
  await C.evaluate(() => localStorage.setItem('amens-theme', 'legacy')); await abrir(C); await shot(C, 'f8_10_celular_legado');
  await C.setViewportSize({ width: 320, height: 640 }); await C.waitForTimeout(800); await shot(C, 'f8_11_320_legado');
  await C.setViewportSize({ width: 844, height: 390 }); await C.waitForTimeout(800); await shot(C, 'f8_12_paisagem_legado');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
