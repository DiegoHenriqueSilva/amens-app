import { createHash, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { assertNativeCompatible } from './lib/ota-artifacts.mjs';
import { verifyOtaManifest } from '../src/lib/ota-manifest.ts';

const runtime = assertNativeCompatible(process.cwd());
const config = JSON.parse(readFileSync('ota.config.json'));
const prepared = JSON.parse(readFileSync('tmp/ota/prepared.json'));
const manifest = JSON.parse(readFileSync(`dist/app-updates/${config.compatibilityId}/latest.json`));
const payload = await verifyOtaManifest(manifest, { ...config, fingerprint: runtime.fingerprint });
if (payload.releaseId !== prepared.releaseId) throw new Error('Prepared release metadata mismatch.');
const archive = readFileSync(`dist/app-updates/${config.compatibilityId}/${payload.releaseId}.zip`);
if (createHash('sha256').update(archive).digest('hex') !== payload.checksum
  || !verify('sha256', archive, config.publicKey, Buffer.from(payload.zipSignature, 'base64'))) throw new Error('Prepared archive verification failed.');
for (const [path, bytes] of Object.entries(unzipSync(archive))) {
  if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) throw new Error('Unsafe bundle path.');
  if (!readFileSync(`dist/${path}`).equals(Buffer.from(bytes))) throw new Error(`Prepared web file changed: ${path}`);
}
console.log(`APK web assets match the signed production release ${payload.releaseId}.`);
