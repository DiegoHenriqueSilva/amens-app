// Fase 5 — ADM05 na tela: lista, criar/editar, situação, conflito, duplicadas (mesclar/desfazer) e importação CSV.
// Precisa de uma conta admin em CONTAS[CONTA_ADMIN] (padrão "adm"). Dados de teste: "[Teste ADM05] ..." em "Cidade Teste ADM05".
// Limpeza: docs/admin/testes/tela/limpa_adm05.sql
const fs = require('fs');
const path = require('path');
const { BASE, CONTAS, OUT, abrirBrowser, novoContexto, esperar, login, shot, log } = require('./lib.cjs');

const ADM = process.env.CONTA_ADMIN || 'adm';
const env = Object.fromEntries(fs.readFileSync(process.env.ENV_FILE || 'c:/Projetos/Amens_Git/.env', 'utf8').split(/\r?\n/).filter((l) => /^VITE_/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const URL_SB = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function token(k) {
  return (await (await fetch(URL_SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: CONTAS[k].email, password: CONTAS[k].senha }) })).json()).access_token;
}
async function rpc(k, fn, args) {
  const r = await fetch(URL_SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, authorization: 'Bearer ' + (k ? await token(k) : KEY), 'content-type': 'application/json' }, body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const toastText = async (p) => (await p.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ');
const alerta = async (p) => (await p.getByRole('dialog').locator('[role="alert"]').allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ');

async function abrir(p, aba, busca = '[Teste ADM05]') {
  await p.goto(BASE + '/admin/churches', { waitUntil: 'domcontentloaded' });
  await esperar(p, 1500);
  if (aba) await p.getByRole('tab', { name: new RegExp('^' + aba) }).click();
  if (busca) { await p.getByLabel('Buscar por nome, cidade ou estado').fill(busca); await p.waitForTimeout(1800); }
}
const linha = (p, nome) => p.locator('table tbody tr').filter({ hasText: nome }).first();
async function acao(p, nome, item) {
  await linha(p, nome).getByRole('button', { name: /^Ações para/ }).click();
  await p.getByRole('menuitem', { name: item, exact: true }).click();
  const d = p.getByRole('dialog'); await d.waitFor();
  return d;
}
async function confirmar(p, d, motivo, botao, nome) {
  if (motivo) await d.locator('textarea').fill(motivo);
  log(`[diálogo] ${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  if (nome) await shot(p, nome);
  await d.getByRole('button', { name: botao, exact: true }).click();
  await p.waitForTimeout(2500);
  log(`  → aberto? ${await d.isVisible()} | toast: ${await toastText(p)} | erro: ${await alerta(p)}`);
}

(async () => {
  const b = await abrirBrowser();

  // T04 · Moderador não entra
  const M = await (await novoContexto(b)).newPage();
  await login(M, 'mod');
  await M.goto(BASE + '/admin/churches', { waitUntil: 'domcontentloaded' }); await esperar(M, 1500);
  log('[mod] /admin/churches →', M.url(), '|', (await M.locator('main, body').first().innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await shot(M, 'f5_01_moderador_sem_acesso');
  log('[mod] RPC admin_list_churches →', JSON.stringify(await rpc('mod', 'admin_list_churches', { p_tab: 'all' })).slice(0, 160));

  const A = await (await novoContexto(b)).newPage();
  await login(A, ADM);
  await abrir(A, null, '');
  log('[lista] abas:', (await A.getByRole('tablist').innerText()).replace(/\s+/g, ' '));
  log('[lista] rodapé:', await A.locator('[aria-live="polite"]').first().innerText());
  await shot(A, 'f5_02_lista_desktop');

  // T01 · Criar (cidade digitada), duplicada bloqueada, editar
  await A.getByRole('button', { name: 'Nova igreja' }).click();
  let d = A.getByRole('dialog');
  await d.getByLabel('Nome da paróquia ou igreja').fill('[Teste ADM05] Paróquia da Tela');
  await d.getByRole('combobox', { name: 'Estado' }).click(); await A.getByRole('option', { name: 'São Paulo (SP)' }).click();
  await d.getByLabel('Cidade', { exact: true }).fill('Cidade Teste ADM05');
  await d.getByLabel('Endereço (opcional)').fill('Rua da Tela, 1');
  await shot(A, 'f5_03_nova_igreja');
  await d.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[criar] aberto?', await d.isVisible(), '| toast:', await toastText(A));

  await A.getByRole('button', { name: 'Nova igreja' }).click(); d = A.getByRole('dialog');
  await d.getByLabel('Nome da paróquia ou igreja').fill('[TESTE adm05] paroquia da tela');
  await d.getByRole('combobox', { name: 'Estado' }).click(); await A.getByRole('option', { name: 'São Paulo (SP)' }).click();
  await d.getByLabel('Cidade', { exact: true }).fill('cidade teste adm05');
  await d.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[duplicada] erro:', await alerta(A));
  await shot(A, 'f5_04_duplicada_bloqueada');
  await d.getByRole('button', { name: 'Cancelar' }).click();

  await abrir(A);
  await linha(A, 'Paróquia da Tela').getByRole('button', { name: /^Ações para/ }).click();
  await A.getByRole('menuitem', { name: 'Editar…' }).click(); d = A.getByRole('dialog');
  await d.getByLabel('Endereço (opcional)').fill('Rua da Tela, 2');
  await d.getByLabel('Motivo da edição (opcional)').fill('Número corrigido (teste)');
  await d.getByRole('button', { name: 'Salvar' }).click(); await A.waitForTimeout(2500);
  log('[editar] toast:', await toastText(A));

  // T01 · Inativar (motivo obrigatório), ativar, remover, restaurar
  await abrir(A);
  d = await acao(A, 'Paróquia da Tela', 'Inativar…');
  await d.getByRole('button', { name: 'Inativar', exact: true }).click(); await A.waitForTimeout(800);
  log('[inativar sem motivo] ajuda:', (await d.innerText()).includes('Informe o motivo'));
  await confirmar(A, d, 'Fechou (teste)', 'Inativar', 'f5_05_inativar');
  await abrir(A, 'Inativas'); await shot(A, 'f5_06_aba_inativas');
  d = await acao(A, 'Paróquia da Tela', 'Ativar'); await confirmar(A, d, '', 'Ativar');
  await abrir(A);
  d = await acao(A, 'Paróquia da Tela', 'Remover…'); await confirmar(A, d, 'Cadastro errado (teste)', 'Remover', 'f5_07_remover');
  await abrir(A, 'Arquivadas'); await shot(A, 'f5_08_aba_arquivadas');
  d = await acao(A, 'Paróquia da Tela', 'Restaurar'); await confirmar(A, d, '', 'Restaurar');

  // T04 · Conflito: outra sessão inativa enquanto o diálogo está aberto
  await abrir(A);
  d = await acao(A, 'Paróquia da Tela', 'Inativar…');
  await d.locator('textarea').fill('Conflito (teste)');
  const lista = await rpc(ADM, 'admin_list_churches', { p_tab: 'all', p_search: 'Paróquia da Tela' });
  const id = lista.body.rows[0].id;
  log('[outra sessão] inativa:', (await rpc(ADM, 'admin_set_church_status', { p_id: id, p_action: 'deactivate', p_reason: 'outra sessão', p_expected_status: 'active' })).status);
  await d.getByRole('button', { name: 'Inativar', exact: true }).click(); await A.waitForTimeout(2500);
  log('[conflito] erro:', await alerta(A));
  await shot(A, 'f5_09_conflito');
  await d.getByRole('button', { name: 'Cancelar' }).click();

  // T02 · Duplicadas: semeadas por limpa/semeia (SQL) — grupo "[Teste ADM05] Grupo Tela" com 1 perfil ligado
  await abrir(A, 'Duplicadas', '[teste adm05] grupo');
  log('[duplicadas]', (await A.locator('ul[aria-label="Grupos de igrejas duplicadas"]').innerText().catch(() => '—')).replace(/\s+/g, ' ').slice(0, 400));
  await shot(A, 'f5_10_duplicadas');
  await A.getByRole('button', { name: 'Mesclar…' }).first().click(); d = A.getByRole('dialog');
  await confirmar(A, d, '', 'Mesclar', 'f5_11_mesclar');
  await abrir(A, 'Inativas', '[teste adm05] grupo'); await shot(A, 'f5_12_mesclada');
  d = await acao(A, 'Grupo Tela', 'Desfazer mesclagem…'); await confirmar(A, d, 'Revisar (teste)', 'Desfazer');
  await abrir(A, 'Duplicadas', '[teste adm05] grupo');
  await A.getByRole('button', { name: 'Resolver todas…' }).click(); d = A.getByRole('dialog'); await A.waitForTimeout(4000);
  log('[resolver todas] prévia:', (await d.innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await shot(A, 'f5_13_resolver_todas_previa');
  await d.getByRole('button', { name: 'Cancelar' }).click();

  // T03 · Importação: arquivo com linhas mistas
  const csv = path.join(OUT, 'igrejas_teste_adm05.csv');
  fs.writeFileSync(csv, [
    'nome;cidade;uf;endereço;status',
    '[Teste ADM05] Importada 1;Cidade Teste ADM05;SP;Rua 1;active',
    '"[Teste ADM05] Importada 2; com ponto e vírgula";Cidade Teste ADM05;São Paulo;;',
    '[teste adm05] importada 1;cidade teste adm05;sp;;',
    '[Teste ADM05] Paróquia da Tela;Cidade Teste ADM05;SP;;',
    '=HYPERLINK("http://exemplo");Cidade Teste ADM05;SP;;',
    '[Teste ADM05] Sem estado;Cidade Teste ADM05;XX;;',
    ';Cidade Teste ADM05;SP;;',
  ].join('\r\n'), 'utf8');
  await abrir(A, null, '');
  await A.getByRole('button', { name: 'Importar CSV' }).click(); d = A.getByRole('dialog');
  await shot(A, 'f5_14_importar_arquivo');
  await d.locator('input[type=file]').setInputFiles(csv); await A.waitForTimeout(4000);
  log('[importar] prévia:', (await d.innerText()).replace(/\s+/g, ' ').slice(0, 600));
  await shot(A, 'f5_15_importar_previa');
  await d.getByRole('button', { name: 'Ignoradas' }).click(); await shot(A, 'f5_16_importar_ignoradas');
  await d.getByRole('button', { name: /^Importar \d/ }).click(); await A.waitForTimeout(4000);
  log('[importar] resultado:', (await d.innerText()).replace(/\s+/g, ' ').slice(0, 400));
  await shot(A, 'f5_17_importar_resultado');
  const [dl] = await Promise.all([A.waitForEvent('download'), d.getByRole('button', { name: 'Baixar relatório' }).click()]);
  const rel = path.join(OUT, 'relatorio_importacao.csv'); await dl.saveAs(rel);
  log('[relatório]', fs.readFileSync(rel, 'utf8').replace(/\r?\n/g, ' ⏎ ').slice(0, 600));
  await d.getByRole('button', { name: 'Fechar' }).click();

  // Arquivo inválido
  const ruim = path.join(OUT, 'sem_colunas.csv'); fs.writeFileSync(ruim, 'igreja;municipio\nA;B\n');
  await A.getByRole('button', { name: 'Importar CSV' }).click(); d = A.getByRole('dialog');
  await d.locator('input[type=file]').setInputFiles(ruim); await A.waitForTimeout(1500);
  log('[importar inválido] erro:', (await d.locator('[role="alert"]').innerText().catch(() => '—')).replace(/\s+/g, ' '));
  await shot(A, 'f5_18_importar_sem_colunas');
  await d.getByRole('button', { name: 'Fechar' }).click();

  // T05 · Contrato público: só ativas
  log('[público] search_churches:', JSON.stringify((await rpc(null, 'search_churches', { p_state: 'SP', p_city: 'Cidade Teste ADM05', p_query: 'teste adm05' })).body?.map?.((r) => r.name)));

  // Celular, tema legado, 320 e paisagem
  const C = await (await novoContexto(b, { width: 390, height: 844 })).newPage();
  await login(C, ADM); await abrir(C); await shot(C, 'f5_19_celular');
  await C.evaluate(() => localStorage.setItem('amens-theme', 'legacy')); await abrir(C); await shot(C, 'f5_20_celular_legado');
  await C.setViewportSize({ width: 320, height: 640 }); await C.waitForTimeout(800); await shot(C, 'f5_21_320_legado');
  await C.setViewportSize({ width: 844, height: 390 }); await C.waitForTimeout(800); await shot(C, 'f5_22_paisagem_legado');
  await abrir(C, 'Duplicadas', '[teste adm05] grupo'); await C.setViewportSize({ width: 390, height: 844 }); await C.waitForTimeout(800); await shot(C, 'f5_23_duplicadas_celular');

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
