import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing public Supabase build configuration.');
if (new URL(url).protocol !== 'https:') throw new Error('The test APK requires an HTTPS backend.');
if (key.startsWith('sb_secret_')) throw new Error('A secret Supabase key must not be bundled in the APK.');
if (key.split('.').length === 3) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (payload.role !== 'anon') throw new Error('Expected an anonymous/public Supabase key.');
}
const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
  headers: { apikey: key }, signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Supabase Auth settings returned HTTP ${response.status}.`);
const settings = await response.json();
if (!settings.external?.google) throw new Error('Google sign-in is disabled in this Supabase project.');
console.log('Supabase HTTPS connection: OK');
console.log('Public client key: OK');
console.log('Google provider: enabled');
console.log('The redirect allowlist and device sign-in still require verification.');
