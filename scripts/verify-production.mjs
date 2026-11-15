import { createHash, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { verifyOtaManifest } from '../src/lib/ota-manifest.ts';

const config = JSON.parse(readFileSync('ota.config.json'));
const runtime = JSON.parse(readFileSync('ota.runtime.json'));
const prepared = JSON.parse(readFileSync('tmp/ota/prepared.json'));
const verificationNonce = Date.now();
const response = await fetch(`${config.origin}/app-updates/${config.compatibilityId}/latest.json?check=${prepared.releaseId}&nonce=${verificationNonce}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Published manifest is unavailable (HTTP ${response.status}).`);
if (response.headers.get('access-control-allow-origin') !== '*') throw new Error('The update manifest is not accessible from the Android WebView.');
const payload = await verifyOtaManifest(await response.json(), { ...config, fingerprint: runtime.fingerprint });
if (payload.releaseId !== prepared.releaseId) throw new Error('The production domain is not serving the prepared release.');
const zipResponse = await fetch(payload.url, { signal: AbortSignal.timeout(60000) });
if (!zipResponse.ok) throw new Error('The update archive is unavailable.');
const archive = Buffer.from(await zipResponse.arrayBuffer());
if (createHash('sha256').update(archive).digest('hex') !== payload.checksum
  || !verify('sha256', archive, config.publicKey, Buffer.from(payload.zipSignature, 'base64'))) throw new Error('Published archive integrity verification failed.');
const entries = unzipSync(archive);
if (!entries['index.html']) throw new Error('The OTA archive has no root index.html.');
const web = await fetch(`${config.origin}/?release-check=${prepared.releaseId}&nonce=${verificationNonce}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
if (!web.ok || await web.text() !== new TextDecoder().decode(entries['index.html'])) throw new Error('The website and OTA archive do not contain the same index.html.');
console.log(`Production verified: ${payload.releaseId}. Manifest signature, ZIP signature/checksum, CORS, and site/app parity: OK.`);
