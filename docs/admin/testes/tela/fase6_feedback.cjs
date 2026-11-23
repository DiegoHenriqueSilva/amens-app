// Fase 6 — ADM06 na tela: ciclo usuário → moderação → usuário, histórico, conflito, situação e tamanhos.
// O envio do usuário é feito pela API com a conta dele (mesmo INSERT do FeedbackDialog, que hoje não está montado em
// nenhuma tela — backlog B22). Limpeza: docs/admin/testes/tela/limpa_adm06.sql
const fs = require('fs');
const { BASE, CONTAS, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || 'c:/Projetos/Amens_Git/.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const tokens = {};
async function token(k) {
  if (!tokens[k]) tokens[k] = (await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: CONTAS[k].email, password: CONTAS[k].senha }) })).json()).access_token;
  return tokens[k];
}
async function api(k, method, p, body) {
  const r = await fetch(URL_SB + '/rest/v1/' + p, { method, headers: { apikey: KEY, authorization: 'Bearer ' + await token(k), 'content-type': 'application/json', prefer: 'return=minimal' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
}

const toastText = async (p) => (await p.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');
const cartao = (p, trecho) => p.locator('ul[aria-label="Feedbacks"] > li').filter({ hasText: trecho }).first();
async function abrir(p, aba) {
  await p.goto(BASE + '/admin/feedback', { waitUntil: 'domcontentloaded' });
  await esperar(p, 1500);
  if (aba) await p.getByRole('tab', { name: new RegExp('^' + aba) }).click();
  await p.getByLabel('Buscar no texto, no nome ou no e-mail').fill('[TESTE ADM06]');
  await p.waitForTimeout(1800);
}

(async () => {
  // Usuário envia (um forjado como "respondido", um longo, um comum)
  log('[autor] envio forjado:', JSON.stringify(await api('autor', 'POST', 'user_feedback', { category: 'sugestao', message: '[TESTE ADM06] Seria bom poder rezar o terço em grupo pelo app.', status: 'replied', reply_text: 'forjado' })));
  log('[autor] envio longo:', JSON.stringify(await api('autor', 'POST', 'user_feedback', { category: 'bug', message: '[TESTE ADM06] O botão de enviar some no celular. ' + 'Detalhe do problema que se repete. '.repeat(20) })));
  log('[d1] envio:', JSON.stringify(await api('d1', 'POST', 'user_feedback', { category: 'elogio', message: '[TESTE ADM06] Gostei muito das novenas!' })));
  log('[autor] tenta ler a fila:', JSON.stringify(await api('autor', 'GET', 'user_feedback?select=id')));

  const b = await abrirBrowser();
  const M = await (await novoContexto(b)).newPage();
  await login(M, 'mod');
  await abrir(M);
  log('[fila]', (await M.locator('ul[aria-label="Feedbacks"]').innerText()).replace(/\s+/g, ' ').slice(0, 500));
  await shot(M, 'f6_01_fila_desktop');
  await cartao(M, 'botão de enviar').getByRole('button', { name: 'Ver tudo' }).click();
  await shot(M, 'f6_02_ver_tudo');

  // Responder (o forjado chegou como Não lido)
  let c = cartao(M, 'terço em grupo');
  log('[forjado] situação no cartão:', (await c.innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await c.getByRole('button', { name: 'Responder…' }).click();
  let d = M.getByRole('dialog'); await d.waitFor();
  await d.getByLabel('Sua resposta').fill('Obrigado pela ideia! Já anotamos para as próximas versões.');
  await d.getByText('Ver como o usuário vai receber').click();
  await shot(M, 'f6_03_responder');
  await d.getByRole('button', { name: 'Enviar resposta' }).click(); await M.waitForTimeout(2500);
  log('[responder] aberto?', await d.isVisible(), '| toast:', await toastText(M));

  // Conflito: outra sessão responde com o diálogo aberto
  await abrir(M, 'Respondidos');
  c = cartao(M, 'terço em grupo');
  await c.getByRole('button', { name: 'Responder de novo…' }).click();
  d = M.getByRole('dialog'); await d.waitFor();
  await d.getByLabel('Sua resposta').fill('Mais um detalhe: a ideia foi para a equipe de produto.');
  const lista = await (await fetch(URL_SB + '/rest/v1/rpc/admin_list_feedback', { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + await token('mod'), 'content-type': 'application/json' }, body: JSON.stringify({ p_tab: 'all', p_search: 'terço em grupo' }) })).json();
  const alvo = lista.rows[0];
  log('[outra sessão] responde:', (await fetch(URL_SB + '/rest/v1/rpc/admin_reply_feedback', { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + await token('mod'), 'content-type': 'application/json' }, body: JSON.stringify({ p_id: alvo.id, p_body: 'Resposta de outra pessoa da equipe.', p_expected_replies: alvo.replies.length }) })).status);
  await d.getByRole('button', { name: 'Enviar resposta' }).click(); await M.waitForTimeout(3500);
  log('[conflito] erro:', (await d.locator('[role="alert"]').innerText().catch(() => '—')).replace(/\s+/g, ' '), '| texto mantido?', (await d.getByLabel('Sua resposta').inputValue()).startsWith('Mais um detalhe'));
  await shot(M, 'f6_04_conflito');
  await d.getByRole('button', { name: 'Li a resposta nova; continuar' }).click();
  await d.getByRole('button', { name: 'Enviar resposta' }).click(); await M.waitForTimeout(2500);
  log('[nova tentativa] aberto?', await d.isVisible(), '| toast:', await toastText(M));
  await abrir(M, 'Respondidos');
  await shot(M, 'f6_05_historico');

  // Situação: lido, arquivar, desarquivar
  await abrir(M);
  await cartao(M, 'novenas').getByRole('button', { name: 'Marcar como lido' }).click(); await M.waitForTimeout(2000);
  log('[lido] toast:', await toastText(M));
  await abrir(M, 'Lidos');
  await cartao(M, 'novenas').getByRole('button', { name: 'Arquivar' }).click(); await M.waitForTimeout(2000);
  await abrir(M, 'Arquivados'); await shot(M, 'f6_06_arquivados');
  await cartao(M, 'novenas').getByRole('button', { name: 'Desarquivar' }).click(); await M.waitForTimeout(2000);
  log('[desarquivar] toast:', await toastText(M));

  // O que o usuário recebe
  const U = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(U, 'autor');
  await U.goto(BASE + '/messages', { waitUntil: 'domcontentloaded' }); await esperar(U, 2500);
  log('[autor] mensagens:', JSON.stringify((await U.locator('body').innerText()).split('\n').filter((t) => /feedback/i.test(t)).slice(0, 4)));
  await shot(U, 'f6_07_usuario_mensagens');

  // Tamanhos e tema legado
  const C = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(C, 'mod'); await abrir(C, 'Todos'); await shot(C, 'f6_08_celular');
  await C.evaluate(() => localStorage.setItem('amens-theme', 'legacy')); await abrir(C, 'Todos'); await shot(C, 'f6_09_celular_legado');
  await C.setViewportSize({ width: 320, height: 640 }); await C.waitForTimeout(800); await shot(C, 'f6_10_320_legado');
  await C.setViewportSize({ width: 844, height: 390 }); await C.waitForTimeout(800); await shot(C, 'f6_11_paisagem_legado');
  await C.setViewportSize({ width: 390, height: 844 });
  await cartao(C, 'terço em grupo').getByRole('button', { name: 'Responder de novo…' }).click();
  await C.waitForTimeout(800); await shot(C, 'f6_12_responder_celular_legado');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
