const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=')+1).trim()])
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('churches').select('name, state').limit(5000);

  const issues = data.filter(r => {
    const n = r.name || '';
    return n !== n.trim() || n.includes('  ') || /[\x00-\x1F\x7F]/.test(n);
  });
  console.log('Nomes com espaços extras ou chars de controle:', issues.length);
  issues.slice(0, 10).forEach(r => console.log(' |' + r.name + '|'));

  const caps = data.filter(r => r.name && r.name === r.name.toUpperCase() && /[A-Z]/.test(r.name));
  console.log('\nNomes em CAIXA ALTA:', caps.length);
  caps.slice(0, 5).forEach(r => console.log(' -', r.name));

  const unique = [...new Set(data.map(s => s.state).filter(Boolean))].sort();
  console.log('\nEstados distintos (' + unique.length + '):', unique.join(', '));
}
check();
