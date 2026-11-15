import { loadEnv } from 'vite';
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const env = loadEnv('production', process.cwd(), 'VITE_');
const callback = 'com.amens.app://auth/callback';
const backend = new URL(env.VITE_SUPABASE_URL).hostname;
const project = backend.split('.')[0];
if (!/^[a-z]{20}$/.test(project)) throw new Error('Unexpected Supabase project reference.');
mkdirSync('tmp', { recursive: true });
const directory = mkdtempSync(join(process.cwd(), 'tmp', 'auth-check-'));
const configFile = join(directory, 'supabase', 'config.toml');
mkdirSync(join(directory, 'supabase'));
writeFileSync(configFile, `project_id = "${project}"\n`);
try {
  // Use the CLI's authenticated session; do not read or print access tokens.
  const cli = spawnSync(process.execPath, [join(process.cwd(), 'node_modules', 'supabase', 'dist', 'supabase.js'),
    'config', 'pull', '--project-ref', project, '--workdir', directory, '--yes', '--force', '--output-format', 'json'],
    { encoding: 'utf8', timeout: 60000 });
  if (cli.error || cli.status !== 0) throw new Error('Could not read remote auth configuration. Check the Supabase CLI session.');
  const config = readFileSync(configFile, 'utf8');
  const redirects = config.match(/^additional_redirect_urls\s*=\s*(\[[^\r\n]*\])/m);
  if (!redirects) throw new Error('Remote redirect list was not returned.');
  const allowed = JSON.parse(redirects[1]).includes(callback);
  console.log(JSON.stringify({ backend, android_callback: callback, explicitly_allowed: allowed }, null, 2));
  if (!allowed) throw new Error('The Android callback is not explicitly authorized in this Supabase project.');
  console.log('Android OAuth callback allowlist: OK. Device sign-in still requires testing.');
} finally {
  // Delete the known exported configuration file without exposing its contents.
  unlinkSync(configFile);
}
