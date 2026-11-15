/**
 * Corrige o campo `source` na tabela `churches`:
 *  - 'import' = existe na planilha igrejas_brasil_google.xlsx
 *  - 'app'    = cadastrada por usuário (não existe na planilha)
 *
 * Uso: node scripts/fix_church_source.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ler .env manualmente (sem dotenv)
function loadEnv(envPath) {
  try {
    return Object.fromEntries(
      readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.trim().startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    );
  } catch { return {}; }
}

const env = loadEnv(resolve(__dirname, '../.env'));
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Normalização ───────────────────────────────────────────────────────────────
function norm(s) {
  if (!s) return '';
  return s.toString().trim()
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Ler planilha ───────────────────────────────────────────────────────────────
console.log('📖 Lendo planilha...');
const wb = xlsx.readFile(resolve(__dirname, '../igrejas_brasil_google.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 });

// DB stores full state name (e.g. "Minas Gerais"), xlsx also has full state names
const xlsxSet = new Set();
for (let i = 1; i < rawRows.length; i++) {
  const [nome, , cidade, estado] = rawRows[i];
  if (!nome || !cidade || !estado) continue;
  xlsxSet.add(`${norm(estado)}|${norm(nome)}|${norm(cidade)}`);
}
console.log(`✅ ${xlsxSet.size.toLocaleString()} igrejas únicas na planilha`);

// ── Buscar todas as igrejas do banco ───────────────────────────────────────────
console.log('\n📡 Buscando igrejas no banco...');
let allChurches = [];
let from = 0;
const PAGE = 1000;

while (true) {
  const { data, error } = await supabase
    .from('churches')
    .select('id, name, city, state, source')
    .range(from, from + PAGE - 1);

  if (error) { console.error('Erro ao buscar igrejas:', error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  allChurches = allChurches.concat(data);
  from += PAGE;
  if (data.length < PAGE) break;
}
console.log(`✅ ${allChurches.length.toLocaleString()} igrejas no banco`);

// ── Classificar ───────────────────────────────────────────────────────────────
const toImport = [];
const toApp = [];

for (const c of allChurches) {
  const key = `${norm(c.state)}|${norm(c.name)}|${norm(c.city)}`;
  const correctSource = xlsxSet.has(key) ? 'import' : 'app';
  if (c.source !== correctSource) {
    if (correctSource === 'import') toImport.push(c.id);
    else toApp.push(c.id);
  }
}

const importCount  = allChurches.filter(c => xlsxSet.has(`${norm(c.state)}|${norm(c.name)}|${norm(c.city)}`)).length;
const appCount     = allChurches.length - importCount;

console.log(`\n📊 Classificação:`);
console.log(`  Planilha (import) : ${importCount.toLocaleString()}`);
console.log(`  Usuário   (app)   : ${appCount.toLocaleString()}`);
console.log(`\n  Registros a corrigir:`);
console.log(`    → import: ${toImport.length}`);
console.log(`    → app   : ${toApp.length}`);

if (toImport.length === 0 && toApp.length === 0) {
  console.log('\n✅ Tudo já correto — nenhuma atualização necessária.');
  process.exit(0);
}

// Mostrar amostra dos que serão marcados como 'app'
const appSample = allChurches.filter(c => {
  const key = `${norm(c.state)}|${norm(c.name)}|${norm(c.city)}`;
  return !xlsxSet.has(key);
}).slice(0, 10);
console.log('\n📋 Amostra das igrejas que serão marcadas como "Usuário" (app):');
appSample.forEach(c => console.log(`  [${c.state}] ${c.city} — ${c.name} (source atual: ${c.source})`));

console.log('\nPressione Ctrl+C para cancelar ou aguarde 5s para continuar...');
await new Promise(r => setTimeout(r, 5000));

// ── Atualizar em batches ───────────────────────────────────────────────────────
const BATCH = 100;

async function updateBatch(ids, source) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await supabase.from('churches').update({ source }).in('id', batch);
    if (error) throw error;
    process.stdout.write(`\r  → '${source}': ${Math.min(i + BATCH, ids.length)}/${ids.length}   `);
  }
  if (ids.length > 0) console.log();
}

console.log('\n🔄 Aplicando atualizações...');
if (toImport.length > 0) await updateBatch(toImport, 'import');
if (toApp.length > 0) await updateBatch(toApp, 'app');

console.log('\n✅ Concluído!');
