const fs = require('fs');
const XLSX = require('xlsx');
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=')+1).trim()])
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Title case preserving special chars (São, 1º, etc.)
function toTitleCase(str) {
  const particles = new Set(['de','da','do','das','dos','e','em','a','o','as','os','na','no','nas','nos','ao','aos']);
  return str
    .toLowerCase()
    .split(' ')
    .map((w, i) => {
      if (i > 0 && particles.has(w)) return w;
      // Preserve ordinal º and ª
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

const STATE_MAP = { 'PR': 'Paraná' };

function normalizeState(s) {
  return STATE_MAP[s] || s;
}

function normalizeName(name) {
  if (!name) return name;
  const trimmed = name.trim().replace(/  +/g, ' ');
  // Only convert ALL-CAPS words (not mixed case which is likely correct)
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return toTitleCase(trimmed);
  }
  return trimmed;
}

async function run() {
  console.log('1. Deleting all existing churches...');
  let deleted = 0;
  while (true) {
    const { data: rows } = await supabase.from('churches').select('id').limit(1000);
    if (!rows || rows.length === 0) break;
    const ids = rows.map(r => r.id);
    await supabase.from('churches').delete().in('id', ids);
    deleted += ids.length;
    process.stdout.write('\rDeleted: ' + deleted);
  }
  console.log('\nDone deleting:', deleted);

  console.log('\n2. Reading xlsx...');
  const wb = XLSX.readFile('./igrejas_brasil_google.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const churches = rows.slice(1).filter(r => r[0]).map(r => ({
    name: normalizeName(String(r[0] || '')),
    address: r[1] ? String(r[1]).trim() : null,
    city: r[2] ? String(r[2]).trim() : null,
    state: r[3] ? normalizeState(String(r[3]).trim()) : null,
    status: 'active',
  }));

  console.log('Total to import:', churches.length);
  console.log('Sample:', churches[0]);

  console.log('\n3. Importing...');
  let inserted = 0, errors = 0;
  const BATCH = 500;
  for (let i = 0; i < churches.length; i += BATCH) {
    const batch = churches.slice(i, i + BATCH);
    const { error } = await supabase.from('churches').insert(batch);
    if (error) { errors++; console.error('\nErro lote', i, error.message); }
    else { inserted += batch.length; process.stdout.write('\rInseridos: ' + inserted + '/' + churches.length); }
  }
  console.log('\nConcluído. Inseridos:', inserted, '| Erros:', errors);
}
run();
