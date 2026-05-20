const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env','utf8').split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=')+1).trim()])
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Count total
  const { count } = await supabase.from('churches').select('*', { count: 'exact', head: true });
  console.log('Total churches in DB:', count);

  // Get distinct states via RPC/raw select - use a raw query approach
  // Supabase client doesn't support DISTINCT easily, use limit 50000
  let page = 0;
  const pageSize = 1000;
  const allStates = new Set();
  let total = 0;
  while (true) {
    const { data, error } = await supabase.from('churches').select('state').range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    data.forEach(r => r.state && allStates.add(r.state));
    total += data.length;
    process.stdout.write('\rFetched: ' + total);
    if (data.length < pageSize) break;
    page++;
  }
  console.log('\nDistinct states (' + allStates.size + '):');
  [...allStates].sort().forEach(s => console.log(' -', s));
}
check();
