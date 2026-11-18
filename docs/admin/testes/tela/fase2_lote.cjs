// Fase 2 — ADM03-T03/T05 na tela: lote parcial e corrida entre dois operadores (moderador).
const { BASE, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const L = (n) => `[TESTE ADM03] Lote ${n}`;

async function abrirPendentes(p) {
  await p.goto(BASE + '/admin/prayers', { waitUntil: 'domcontentloaded' });
  await esperar(p, 1500);
  await p.getByRole('tab', { name: /Pendentes/ }).click();
  await p.getByRole('searchbox').or(p.getByLabel('Buscar pedidos por conteúdo, título ou autor')).first().fill('TESTE ADM03');
  await p.getByText(L(1)).first().waitFor({ timeout: 20000 });
  await p.waitForTimeout(800);
}

async function acaoLinha(p, n, acao, motivo) {
  await p.getByRole('button', { name: `Ações para o pedido "${L(n)}"` }).click();
  await p.getByRole('menuitem', { name: new RegExp(acao) }).click();
  const d = p.getByRole('dialog');
  await d.waitFor();
  if (motivo !== undefined) await d.locator('textarea').fill(motivo);
  return d;
}

(async () => {
  const b = await abrirBrowser();
  const A = await (await novoContexto(b)).newPage();
  const B = await (await novoContexto(b)).newPage();
  for (const [n,P] of [['A',A],['B',B]]) { P.on('request', (r) => { if (r.url().includes('/rpc/admin')) r._t = Date.now(); }); P.on('requestfinished', async (r) => { if (r.url().includes('/rpc/admin')) { const res = await r.response(); log('  RPC', n, r.url().split('/rpc/')[1], res && res.status(), Date.now() - r._t, 'ms'); } }); }
  await login(A, 'mod'); await login(B, 'mod');
  await abrirPendentes(A); await abrirPendentes(B);
  await shot(A, 'f2_01_pendentes_teste');

  // A seleciona os lotes 1 a 4
  for (const n of [1, 2, 3, 4]) await A.getByRole('checkbox', { name: `Selecionar o pedido "${L(n)}"` }).check();
  const barra = A.getByRole('region', { name: 'Ações em lote' });
  log('[A] barra:', (await barra.innerText()).replace(/\s+/g, ' '));
  await shot(A, 'f2_02_quatro_selecionados');

  // B, em outra sessão, marca violação no lote 2
  const dB = await acaoLinha(B, 2, 'Marcar violação', 'Teste de corrida entre operadores');
  await shot(B, 'f2_03_operadorB_violacao_lote2');
  await dB.getByRole('button', { name: /^Marcar violação$/ }).click();
  await B.waitForTimeout(2500);
  log('[B] toast:', (await B.locator('[data-sonner-toast], [role="status"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' '));

  // A aplica "Marcar violação" nos 4 selecionados, sem recarregar
  await barra.getByRole('button', { name: 'Marcar violação' }).click();
  const dA = A.getByRole('dialog');
  await dA.waitFor();
  const botoes = await dA.getByRole('button').allInnerTexts();
  log('[A] botões do diálogo:', JSON.stringify(botoes));
  // motivo vazio: o botão deve recusar
  await dA.getByRole('button', { name: /Marcar violação 4/ }).click();
  await A.waitForTimeout(500);
  log('[A] após confirmar sem motivo, diálogo aberto?', await dA.isVisible());
  await shot(A, 'f2_04_lote_sem_motivo');
  await dA.locator('textarea').fill('Teste de lote parcial');
  await shot(A, 'f2_05_lote_confirmacao');
  await dA.getByRole('button', { name: /Marcar violação 4/ }).click();
  const res = A.getByRole('dialog', { name: /Lote concluído em parte/ });
  await res.waitFor({ timeout: 20000 }).catch(() => log('[A] diálogo de resultado parcial NÃO apareceu'));
  log('[A] resultado:', (await res.innerText().catch(() => '')).replace(/\s+/g, ' '));
  await shot(A, 'f2_06_resultado_parcial');
  await res.getByRole('button', { name: 'Entendi' }).click().catch(() => {});
  await A.waitForTimeout(6000);
  log('[A] barra depois:', (await barra.innerText().catch(() => '(sem barra)')).replace(/\s+/g, ' '));
  await shot(A, 'f2_07_apos_lote');

  // Corrida na edição (lote 5): A abre a edição, B salva antes, A tenta salvar
  await A.getByRole('button', { name: 'Limpar seleção' }).click().catch(() => {});
  await A.getByRole('button', { name: `Ações para o pedido "${L(5)}"` }).click();
  await A.getByRole('menuitem', { name: /Editar/ }).click();
  const eA = A.getByRole('dialog'); await eA.waitFor();
  await B.reload(); await abrirPendentes(B);
  await B.getByRole('button', { name: `Ações para o pedido "${L(5)}"` }).click();
  await B.getByRole('menuitem', { name: /Editar/ }).click();
  const eB = B.getByRole('dialog'); await eB.waitFor();
  await eB.locator('#edit-content, textarea').first().fill('Pedido de teste editado pelo operador B. Pode ignorar.');
  await eB.locator('#edit-reason').fill('Teste de edição simultânea (B)');
  await eB.getByRole('button', { name: 'Salvar' }).click();
  await B.waitForTimeout(2500);
  await eA.locator('#edit-content, textarea').first().fill('Pedido de teste editado pelo operador A. Pode ignorar.');
  await eA.locator('#edit-reason').fill('Teste de edição simultânea (A)');
  log('[A] campos antes de salvar:', JSON.stringify(await eA.locator('textarea, input').evaluateAll((els) => els.map((x) => x.id + '=' + x.value.slice(0, 40)))), 'habilitado:', await eA.getByRole('button', { name: /Salvar/ }).isEnabled(), 'qtd dialogs:', await A.getByRole('dialog').count());
  await eA.getByRole('button', { name: 'Salvar' }).click({ timeout: 5000 });
  const t0=Date.now(); await A.waitForFunction(() => !/Salvando/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {}); log('[A] edição respondeu em', Date.now()-t0, 'ms'); await A.waitForTimeout(500);
  log('[A] edição concorrente — diálogo aberto?', await eA.isVisible(), '| textos:',
    (await A.locator('[role="dialog"], [data-sonner-toast]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 400));
  await shot(A, 'f2_08_edicao_conflito');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
