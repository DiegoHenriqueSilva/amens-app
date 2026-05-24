const fs = require('fs');
const XLSX = require('xlsx');
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=')+1).trim()])
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toTitleCase(str) {
  const particles = new Set(['de','da','do','das','dos','e','em','a','o','as','os','na','no','nas','nos','ao','aos']);
  return str.toLowerCase().split(' ').map((w, i) => {
    if (i > 0 && particles.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function normalizeName(name) {
  if (!name) return name;
  const trimmed = name.trim().replace(/  +/g, ' ');
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return toTitleCase(trimmed);
  return trimmed;
}

async function insertWithRetry(batch, startIdx, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.from('churches').insert(batch);
    if (!error) return true;
    const isTimeout = error.message.includes('fetch failed') || error.message.includes('timeout') || error.message.includes('522');
    if (!isTimeout || attempt === retries) {
      console.error(`\nErro lote ${startIdx} (tentativa ${attempt}): ${error.message}`);
      return false;
    }
    const delay = attempt * 3000;
    process.stdout.write(`\n  lote ${startIdx} timeout, retry ${attempt}/${retries} em ${delay/1000}s...`);
    await sleep(delay);
  }
  return false;
}

async function run() {
  // 1. Delete all existing churches
  console.log('1. Removendo igrejas existentes...');
  let deleted = 0;
  for (let attempt = 0; attempt < 100; attempt++) {
    const { data: rows, error } = await supabase.from('churches').select('id').limit(1000);
    if (error) { console.error('Erro ao buscar:', error.message); break; }
    if (!rows || rows.length === 0) break;
    const ids = rows.map(r => r.id);
    const { error: delErr } = await supabase.from('churches').delete().in('id', ids);
    if (delErr) { console.error('Erro ao deletar:', delErr.message); break; }
    deleted += ids.length;
    process.stdout.write('\rRemovidos: ' + deleted);
    await sleep(200);
  }
  console.log('\nTotal removido:', deleted);

  // 2. Read xlsx
  console.log('\n2. Lendo xlsx...');
  const wb = XLSX.readFile('./igrejas_brasil_google.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const churches = rows.slice(1).filter(r => r[0]).map(r => ({
    name: normalizeName(String(r[0] || '')),
    address: r[1] ? String(r[1]).trim() : null,
    city: r[2] ? String(r[2]).trim() : null,
    state: r[3] ? String(r[3]).trim() : null,
    status: 'active',
  }));

  console.log('Total a importar:', churches.length);
  console.log('Amostra:', churches[0]);

  // 3. Import with retry and delay
  console.log('\n3. Importando...');
  let inserted = 0, errors = 0;
  const BATCH = 100; // smaller batches to avoid timeouts
  for (let i = 0; i < churches.length; i += BATCH) {
    const batch = churches.slice(i, i + BATCH);
    const ok = await insertWithRetry(batch, i);
    if (ok) {
      inserted += batch.length;
    } else {
      errors += batch.length;
    }
    process.stdout.write(`\rInseridos: ${inserted}/${churches.length} | Erros: ${errors}`);
    await sleep(150); // small delay between batches
  }

  console.log(`\n\nConcluído. Inseridos: ${inserted} | Erros: ${errors} de ${churches.length} total`);
}

run().catch(console.error);
