// Fase 4 — ADM04 na tela: fila por alvo, decisões, corrida, reabrir e reverter, aviso ao denunciante.
const fs = require('fs');
const path = require('path');
const { BASE, CONTAS, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || '.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const IDS = require(path.resolve(process.env.ADM04_IDS || 'adm04_ids.json'));

async function token(k) {
  const j = await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: CONTAS[k].email, password: CONTAS[k].senha }) })).json();
  return j;
}
async function rest(k, method, p, body) {
  const t = await token(k);
  const r = await fetch(URL_SB + '/rest/v1/' + p, { method, headers: { apikey: KEY, authorization: 'Bearer ' + t.access_token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.status + ' ' + (await r.text()).slice(0, 160);
}
const situacaoPedido = () => rest('autor', 'GET', `prayer_requests?id=eq.${IDS.prayer}&select=status`);
const suspensao = () => rest('autor', 'GET', `profiles?id=eq.${IDS.autor}&select=suspended_until`);

async function abrir(p, aba) {
  await p.goto(BASE + '/admin/reports', { waitUntil: 'domcontentloaded' });
  await esperar(p, 1500);
  if (aba) await p.getByRole('tab', { name: new RegExp(aba) }).click();
  await p.getByLabel('Buscar no conteúdo denunciado, no nome ou no motivo').fill('Teste ADM');
  await p.waitForTimeout(1800);
}
// Cartão pelo selo de tipo (texto exato), não por qualquer texto do cartão
const cartao = (p, tipo) => p.locator('ul[aria-label="Alvos denunciados"] > li').filter({ has: p.getByText(tipo, { exact: true }) }).first();
async function decidir(p, tipo, botao, motivo, confirmar, nome) {
  const c = cartao(p, tipo);
  await c.getByRole('button', { name: botao, exact: true }).click();
  const d = p.getByRole('dialog'); await d.waitFor();
  log(`[mod] ${tipo} · ${botao} — diálogo:`, (await d.innerText()).replace(/\s+/g, ' ').slice(0, 400));
  if (motivo) await d.locator('textarea').fill(motivo);
  if (nome) await shot(p, nome);
  await d.getByRole('button', { name: confirmar, exact: true }).click();
  await p.waitForTimeout(2500);
  const aberto = await d.isVisible();
  const toast = (await p.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');
  const erro = aberto ? (await d.locator('[role="alert"]').allInnerTexts().catch(() => [])).join(' ') : '';
  log(`[mod] ${tipo} · ${botao} → diálogo aberto? ${aberto} | toast: ${toast} ${erro ? '| erro: ' + erro : ''}`);
  return { aberto, d };
}

(async () => {
  const b = await abrirBrowser();
  const A = await (await novoContexto(b)).newPage();
  await login(A, 'mod');
  await abrir(A);
  const cards = await A.locator('ul[aria-label="Alvos denunciados"] > li').allInnerTexts();
  cards.forEach((t) => log('[fila]', t.replace(/\s+/g, ' ').slice(0, 260)));
  await shot(A, 'f4_01_fila_desktop');
  await cartao(A, 'Pedido de oração').getByRole('button', { name: /Ver 3 denúncias/ }).click();
  await A.waitForTimeout(500);
  await shot(A, 'f4_02_pedido_denuncias');

  // Celular e tema legado
  const M = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(M, 'mod'); await abrir(M); await shot(M, 'f4_03_fila_celular');
  await M.evaluate(() => localStorage.setItem('amens-theme', 'legacy')); await abrir(M); await shot(M, 'f4_04_fila_celular_legado');
  await M.setViewportSize({ width: 320, height: 640 }); await M.waitForTimeout(800); await shot(M, 'f4_05_fila_320_legado');
  await M.setViewportSize({ width: 844, height: 390 }); await M.waitForTimeout(800); await shot(M, 'f4_06_fila_paisagem_legado');

  // Corrida: chega denúncia nova sobre a pessoa enquanto o diálogo está aberto
  const c = cartao(A, 'Pessoa');
  await c.getByRole('button', { name: 'Suspender…', exact: true }).click();
  const d = A.getByRole('dialog'); await d.waitFor();
  await d.locator('#report-suspend-days').fill('2');
  await d.locator('textarea').fill('Assédio reiterado (teste)');
  log('[d2] nova denúncia sobre a pessoa:', await rest('d2', 'POST', 'prayer_reports', { reporter_user_id: (await token('d2')).user.id, target_type: 'user', target_user_id: IDS.autor, category: 'spam' }));
  await d.getByRole('button', { name: 'Suspender', exact: true }).click();
  await A.waitForTimeout(2500);
  log('[mod] corrida — diálogo aberto?', await d.isVisible(), '| erro:', (await d.locator('[role="alert"]').allInnerTexts().catch(() => [])).join(' '));
  await A.waitForTimeout(2000);
  log('[mod] corrida — diálogo após atualizar:', (await d.innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await shot(A, 'f4_07_corrida_nova_denuncia');

  // Nova tentativa no MESMO diálogo: agora com as 2 denúncias
  await d.getByRole('button', { name: 'Suspender', exact: true }).click();
  await A.waitForTimeout(3000);
  log('[mod] nova tentativa — diálogo aberto?', await d.isVisible());
  await shot(A, 'f4_08_suspender_nova_tentativa');
  log('[mod] suspender → toast:', (await A.locator('[data-sonner-toast]').allInnerTexts()).join(' | ').replace(/\s+/g, ' '), '| perfil:', await suspensao());

  // Pedido escalado: sem fundamento → volta a aparecer
  log('[antes] pedido:', await situacaoPedido());
  await decidir(A, 'Pedido de oração', 'Sem fundamento', '', 'Encerrar', 'f4_09_sem_fundamento');
  log('[depois] pedido:', await situacaoPedido());

  // Reabrir e reverter na aba "Sem fundamento"
  await abrir(A, 'Sem fundamento');
  await shot(A, 'f4_10_aba_sem_fundamento');
  await decidir(A, 'Pedido de oração', 'Reabrir e reverter', 'Revisar com mais calma (teste)', 'Reabrir');
  log('[reaberto] pedido:', await situacaoPedido());

  // Marcar violação
  await abrir(A);
  await decidir(A, 'Pedido de oração', 'Marcar violação', 'Conteúdo fora do tema (teste)', 'Marcar violação', 'f4_11_violacao');
  log('[violação] pedido:', await situacaoPedido());

  // Remetente: resolver; participação: retirar
  await abrir(A);
  await decidir(A, 'Remetente de mensagem', 'Resolver', 'Tratado junto com a suspensão (teste)', 'Resolver');
  await decidir(A, 'Participação na corrente', 'Retirar participação', 'Nome ofensivo (teste)', 'Retirar', 'f4_12_retirar_participacao');
  log('[participação]', await rest('mod', 'GET', `prayer_contributions?id=eq.${IDS.contrib}&select=deleted_at`));

  // Reverter a suspensão na aba Resolvidas
  await abrir(A, 'Resolvidas');
  await shot(A, 'f4_13_aba_resolvidas');
  await decidir(A, 'Pessoa', 'Reabrir e reverter', 'Suspensão revista (teste)', 'Reabrir');
  log('[reverter suspensão] perfil:', await suspensao());

  // Fila final
  await abrir(A);
  log('[fila final]', (await A.locator('ul[aria-label="Alvos denunciados"] > li').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 120)).join(' || '));

  // O que o denunciante recebe
  const D = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(D, 'd1');
  await D.goto(BASE + '/messages', { waitUntil: 'domcontentloaded' }); await esperar(D, 2500);
  log('[d1] mensagens:', JSON.stringify((await D.locator('body').innerText()).split('\n').filter((t) => /denúncia/i.test(t)).slice(0, 4)));
  await shot(D, 'f4_14_aviso_denunciante');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
