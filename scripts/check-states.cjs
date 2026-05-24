const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=')+1).trim()])
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get all distinct states — paginate to cover all 31k rows
  let allStates = new Set();
  let from = 0;
  while (true) {
    const { data } = await supabase.from('churches').select('state').range(from, from + 4999);
    if (!data || data.length === 0) break;
    data.forEach(r => r.state && allStates.add(r.state));
    from += 5000;
    if (data.length < 5000) break;
  }
  const sorted = [...allStates].sort();
  console.log('Total distinct states:', sorted.length);
  sorted.forEach(s => console.log(' -', JSON.stringify(s)));
}
check();
