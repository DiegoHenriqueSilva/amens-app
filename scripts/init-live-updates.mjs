import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { nativeFingerprint } from './lib/ota-artifacts.mjs';

mkdirSync('.private', { recursive: true });
const privatePath = '.private/ota-signing-key.pem';
if (!existsSync(privatePath)) {
  if (existsSync('ota.config.json')) throw new Error('The existing OTA signing key is missing. Restore its backup; do not rotate it silently.');
  const keys = generateKeyPairSync('rsa', { modulusLength: 4096, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  writeFileSync(privatePath, keys.privateKey, { mode: 0o600 });
}
const publicKey = createPublicKey(readFileSync(privatePath)).export({ type: 'spki', format: 'pem' }).toString();
if (!existsSync('ota.config.json')) {
  writeFileSync('ota.config.json', JSON.stringify({ origin: 'https://www.amens.com.br', nativeVersionCode: 5,
    compatibilityId: 'android-5', vercelProjectId: 'prj_AmM4FHW51NBc18S6VQsGlrlc0ifX', publicKey }, null, 2) + '\n');
} else if (JSON.parse(readFileSync('ota.config.json')).publicKey !== publicKey) throw new Error('OTA key pair mismatch.');
if (process.argv.includes('--lock-runtime')) {
  const config = JSON.parse(readFileSync('ota.config.json'));
  const gradle = readFileSync('android/app/build.gradle', 'utf8');
  if (Number(gradle.match(/versionCode\s+(\d+)/)?.[1]) !== config.nativeVersionCode) throw new Error('APK version code and OTA cohort differ.');
  writeFileSync('ota.runtime.json', JSON.stringify({ nativeVersionCode: config.nativeVersionCode, compatibilityId: config.compatibilityId,
    fingerprint: nativeFingerprint(process.cwd()) }, null, 2) + '\n');
  console.log('Native runtime compatibility recorded. Back up .private/ota-signing-key.pem securely.');
} else console.log('OTA signing key and public configuration ready.');
