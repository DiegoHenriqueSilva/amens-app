// Fase 3 — ADM03-T02 (ciclo pelo app), ADM02-T03 (conta suspensa no app), ADM00-T02 (troca de conta sem recarregar).
const fs = require('fs');
const { BASE, CONTAS, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || '.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TITULO = '[TESTE ADM03] Ciclo pelo app';
const AUTOR = process.env.AUTOR_ID; // id da conta comum de teste

async function token(conta) {
  const r = await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: CONTAS[conta].email, password: CONTAS[conta].senha }) });
  return (await r.json()).access_token;
}
async function rpc(conta, nome, body) {
  const r = await fetch(URL_SB + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + await token(conta), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.status + ' ' + (await r.text()).slice(0, 200);
}
// O que a comunidade enxerga: visitante (chave pública) consultando o pedido
async function visivelComunidade() {
  const r = await fetch(URL_SB + '/rest/v1/prayer_requests?select=status&title=eq.' + encodeURIComponent(TITULO), { headers: { apikey: KEY } });
  const j = await r.json();
  return Array.isArray(j) ? (j.length ? 'visível (' + j.map((x) => x.status).join(',') + ')' : 'não visível') : JSON.stringify(j).slice(0, 100);
}
async function sino(p, nome) {
  // Os avisos ficam em Mensagens (a tela inicial atual não tem sino)
  await p.goto(BASE + '/messages', { waitUntil: 'domcontentloaded' }); await esperar(p, 2500);
  const linhas = (await p.locator('body').innerText()).split('\n').map((t) => t.trim()).filter((t) => /pedido/i.test(t) && t.length > 30);
  log(`[autor] mensagens (${nome}):`, JSON.stringify(linhas.slice(0, 2)));
  await shot(p, 'f3_' + nome);
}
async function decidir(M, acao, motivo, confirmar) {
  await M.goto(BASE + '/admin/prayers', { waitUntil: 'domcontentloaded' }); await esperar(M, 1500);
  await M.getByLabel('Buscar pedidos por conteúdo, título ou autor').fill('Ciclo pelo app');
  await M.getByText(TITULO).first().waitFor({ timeout: 20000 });
  await M.waitForTimeout(800);
  await M.getByRole('button', { name: `Ações para o pedido "${TITULO}"` }).click();
  await M.getByRole('menuitem', { name: new RegExp(acao) }).click();
  const d = M.getByRole('dialog'); await d.waitFor();
  if (motivo) await d.locator('textarea').fill(motivo);
  await shot(M, 'f3_mod_' + acao.replace(/\s+/g, '-').toLowerCase());
  await d.getByRole('button', { name: new RegExp('^' + confirmar + '$') }).click();
  await M.waitForTimeout(2500);
  log(`[mod] ${acao}: diálogo ainda aberto?`, await d.isVisible(), '| comunidade:', await visivelComunidade());
}

(async () => {
  const b = await abrirBrowser();
  const P = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  const M = await (await novoContexto(b)).newPage();
  await login(P, 'autor'); await login(M, 'mod');

  // ── ADM03-T02: autor envia pelo app
  await P.goto(BASE + '/submit', { waitUntil: 'domcontentloaded' }); await esperar(P, 1500);
  await P.fill('#title', TITULO);
  await P.fill('#content', 'Pedido de teste do ciclo da moderação. Pode ignorar, será removido em instantes.');
  await P.getByRole('button', { name: /Enviar|Publicar/ }).first().click();
  await P.waitForTimeout(2500);
  log('[autor] envio:', (await P.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' '), '| comunidade:', await visivelComunidade());
  await shot(P, 'f3_autor_enviou');

  await decidir(M, 'Colocar em revisão', 'Teste do ciclo: revisar conteúdo', 'Colocar em revisão');
  await sino(P, 'aviso_revisao');
  await decidir(M, 'Aprovar', '', 'Aprovar');
  await sino(P, 'aviso_aprovado');
  await decidir(M, 'Remover', 'Teste do ciclo: remoção final', 'Remover');
  await sino(P, 'aviso_removido');

  // ── ADM02-T03: moderador suspende o autor; o app avisa e o banco recusa a ação
  log('[mod] suspender autor:', await rpc('mod', 'admin_suspend_user', { p_user: AUTOR, p_days: 1, p_reason: 'Teste de suspensão no app' }));
  await P.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await esperar(P, 3000);
  const aviso = await P.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => []);
  log('[autor suspenso] aviso:', JSON.stringify(aviso.map((t) => t.replace(/\s+/g, ' ')).filter((t) => /conta|pausad/i.test(t))));
  await shot(P, 'f3_autor_suspenso_aviso');
  await P.goto(BASE + '/submit', { waitUntil: 'domcontentloaded' }); await esperar(P, 1500);
  await P.fill('#title', '[TESTE ADM02] Suspenso tentando enviar');
  await P.fill('#content', 'Este envio deve ser recusado pelo banco.');
  await P.getByRole('button', { name: /Enviar|Publicar/ }).first().click();
  await P.waitForTimeout(2500);
  log('[autor suspenso] envio:', (await P.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' '));
  await shot(P, 'f3_autor_suspenso_envio');
  log('[mod] remover suspensão:', await rpc('mod', 'admin_unsuspend_user', { p_user: AUTOR, p_reason: 'Fim do teste de suspensão' }));
  await P.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await esperar(P, 3000);
  const aviso2 = await P.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => []);
  log('[autor liberado] aviso:', JSON.stringify(aviso2.map((t) => t.replace(/\s+/g, ' ')).filter((t) => /conta|pausad/i.test(t))));

  // ── ADM00-T02: na mesma aba, moderador sai e o autor entra sem recarregar
  await M.goto(BASE + '/admin/prayers', { waitUntil: 'domcontentloaded' }); await esperar(M, 1500);
  await M.getByRole('link', { name: /Voltar ao App/ }).or(M.getByRole('button', { name: /Voltar ao App/ })).first().click();
  await esperar(M, 1500);
  await M.getByText('Sair da Conta').first().click().catch(async () => { log('sem "Sair da Conta" visível'); });
  await M.waitForTimeout(2000);
  log('[troca] após sair:', M.url());
  await M.evaluate(() => { history.pushState({}, '', '/auth'); dispatchEvent(new PopStateEvent('popstate')); });
  await M.locator('#login-email').waitFor({ timeout: 15000 });
  await M.fill('#login-email', CONTAS.autor.email); await M.fill('#login-password', CONTAS.autor.senha);
  await M.locator('#login-password').press('Enter');
  await M.waitForFunction(() => !location.pathname.startsWith('/auth'), null, { timeout: 20000 }).catch(() => {});
  await esperar(M, 1500);
  await M.evaluate(() => { history.pushState({}, '', '/admin/prayers'); dispatchEvent(new PopStateEvent('popstate')); });
  await esperar(M, 3000);
  const vazou = await M.getByText('Pedidos de Oração').count();
  log('[troca] autor em /admin/prayers sem recarregar ->', new URL(M.url()).pathname, '| título do portal visível?', vazou > 0);
  await shot(M, 'f3_troca_conta');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
