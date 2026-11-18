// Fase 1 — ADM00-T01/T04/T05 na tela: matriz de acesso por papel e link direto.
const { BASE, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const ROTAS = ['/admin', '/admin/users', '/admin/donations', '/admin/settings', '/admin/logs',
  '/admin/prayers', '/admin/reports', '/admin/feedback', '/admin/churches', '/admin/nao-existe'];

(async () => {
  const b = await abrirBrowser();
  const r = async (page, papel) => {
    for (const rota of ROTAS) {
      await page.goto(BASE + rota, { waitUntil: 'domcontentloaded' });
      await esperar(page, 1500);
      const u = new URL(page.url());
      const h = await page.locator('main h1, main h2, h1').first().innerText().catch(() => '');
      log(`[${papel}] ${rota} -> ${u.pathname}${u.search} | ${h.replace(/\s+/g, ' ').slice(0, 50)}`);
    }
  };
  // Visitante
  let ctx = await novoContexto(b); let p = await ctx.newPage();
  await r(p, 'visitante'); await ctx.close();
  // Comum
  ctx = await novoContexto(b); p = await ctx.newPage();
  await login(p, 'autor'); await r(p, 'comum'); await ctx.close();
  // Moderador, desktop e celular com menu
  ctx = await novoContexto(b); p = await ctx.newPage();
  await login(p, 'mod'); await r(p, 'moderador');
  await p.goto(BASE + '/admin/prayers'); await esperar(p, 2000);
  await shot(p, 'f1_moderador_pedidos_desktop');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /menu/i }).first().click().catch((e) => log('sem botão menu', e.message));
  await p.waitForTimeout(800);
  const itens = await p.locator('[role="dialog"] a, [role="dialog"] button').allInnerTexts().catch(() => []);
  log('[moderador] itens do menu:', JSON.stringify(itens.map((t) => t.trim()).filter(Boolean)));
  await shot(p, 'f1_moderador_menu_celular');
  await ctx.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
