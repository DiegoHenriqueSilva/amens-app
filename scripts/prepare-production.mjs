import { createHash, createPublicKey, randomBytes, sign, verify } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { zipSync, unzipSync } from 'fflate';
import { assertNativeCompatible, productionRoutes } from './lib/ota-artifacts.mjs';
import { verifyOtaManifest } from '../src/lib/ota-manifest.ts';

const root = process.cwd();
const runtime = assertNativeCompatible(root);
const config = JSON.parse(readFileSync('ota.config.json', 'utf8'));
const project = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));
if (project.projectId !== config.vercelProjectId) throw new Error('The linked Vercel project is not the Amens production project.');
const privateKey = readFileSync('.private/ota-signing-key.pem');
if (createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }).toString() !== config.publicKey) throw new Error('OTA signing key mismatch.');
const expected = { ...config, fingerprint: runtime.fingerprint };
let previousSequence = 0;
const latestUrl = `${config.origin}/app-updates/${config.compatibilityId}/latest.json`;
const latestResponse = await fetch(latestUrl, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
if (latestResponse.ok) {
  previousSequence = (await verifyOtaManifest(await latestResponse.json(), expected)).sequence;
} else if (latestResponse.status !== 404) throw new Error(`Cannot verify the previous production release (HTTP ${latestResponse.status}).`);
const sequence = Math.max(Date.now(), previousSequence + 1);
const releaseId = `release-${sequence}-${randomBytes(4).toString('hex')}`;
const rollbackIndex = process.argv.indexOf('--rollback');
const rollbackId = rollbackIndex >= 0 ? process.argv[rollbackIndex + 1] : null;
let archive;
if (rollbackId) {
  if (!/^release-\d{13}-[a-f0-9]{8}$/.test(rollbackId)) throw new Error('Invalid rollback release ID.');
  const previous = JSON.parse(readFileSync(join('.private/releases', rollbackId, 'manifest.json')));
  const oldPayload = await verifyOtaManifest(previous, expected);
  archive = readFileSync(join('.private/releases', rollbackId, 'bundle.zip'));
  if (createHash('sha256').update(archive).digest('hex') !== oldPayload.checksum
    || !verify('sha256', archive, config.publicKey, Buffer.from(oldPayload.zipSignature, 'base64'))) throw new Error('Rollback archive verification failed.');
  // Vite empties dist safely before restoring a trusted, previously signed release.
  const entries = unzipSync(archive);
  for (const path of Object.keys(entries)) {
    if (path.startsWith('/') || path.split('/').some(part => part === '..') || path.includes('\\')) throw new Error('Unsafe archive entry.');
  }
  const dist = resolve(root, 'dist');
  if (existsSync(dist)) {
    if (lstatSync(dist).isSymbolicLink() || !realpathSync(dist).startsWith(realpathSync(root) + sep)) throw new Error('Unsafe dist directory.');
    rmSync(dist, { recursive: true, force: true });
  }
  for (const [path, bytes] of Object.entries(entries)) {
    const target = join(dist, path);
    mkdirSync(resolve(target, '..'), { recursive: true }); writeFileSync(target, bytes);
  }
} else {
  const firebase = JSON.parse(readFileSync('android/app/google-services.json', 'utf8'));
  if (!firebase.client.some(client => client.client_info?.android_client_info?.package_name === 'com.amens.app')) throw new Error('Firebase package mismatch.');
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit', env: {
    ...process.env, VITE_ANDROID_PUSH_ENABLED: 'true', VITE_APP_RELEASE_ID: releaseId, VITE_APP_RELEASE_SEQUENCE: String(sequence),
  } });
  if (result.status !== 0) throw new Error('Production web build failed.');
  const index = readFileSync('dist/index.html', 'utf8');
  writeFileSync('dist/index.html', index.replace('<head>', `<head><meta name="amens-release" content="${releaseId}">`));
  const entries = {};
  const walk = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not supported in OTA bundles.');
      const path = prefix + entry.name;
      if (entry.isDirectory()) walk(join(directory, entry.name), `${path}/`);
      else entries[path] = new Uint8Array(readFileSync(join(directory, entry.name)));
    }
  };
  walk('dist');
  archive = Buffer.from(zipSync(entries, { level: 6 }));
}
const payload = { schema: 1, compatibilityId: config.compatibilityId, nativeVersionCode: config.nativeVersionCode,
  nativeFingerprint: runtime.fingerprint, releaseId, sequence,
  url: `${config.origin}/app-updates/${config.compatibilityId}/${releaseId}.zip`,
  checksum: createHash('sha256').update(archive).digest('hex'), zipSignature: sign('sha256', archive, privateKey).toString('base64') };
const envelope = { payload, signature: sign('sha256', Buffer.from(JSON.stringify(payload)), privateKey).toString('base64') };
await verifyOtaManifest(envelope, expected);
const updateDir = join('dist/app-updates', config.compatibilityId);
mkdirSync(updateDir, { recursive: true });
writeFileSync(join(updateDir, `${releaseId}.zip`), archive);
writeFileSync(join(updateDir, 'latest.json'), JSON.stringify(envelope));
const archiveDir = join('.private/releases', releaseId);
mkdirSync(archiveDir, { recursive: true });
writeFileSync(join(archiveDir, 'bundle.zip'), archive);
writeFileSync(join(archiveDir, 'manifest.json'), JSON.stringify(envelope, null, 2));
// Keep the last authenticated release of older APK cohorts available after a native-only upgrade.
const legacy = new Map();
for (const entry of readdirSync('.private/releases', { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^release-\d{13}-[a-f0-9]{8}$/.test(entry.name)) continue;
  const saved = JSON.parse(readFileSync(join('.private/releases', entry.name, 'manifest.json')));
  if (saved.payload.compatibilityId === config.compatibilityId) continue;
  await verifyOtaManifest(saved, { ...config, compatibilityId: saved.payload.compatibilityId,
    nativeVersionCode: saved.payload.nativeVersionCode, fingerprint: saved.payload.nativeFingerprint });
  const old = legacy.get(saved.payload.compatibilityId);
  if (!old || old.payload.sequence < saved.payload.sequence) legacy.set(saved.payload.compatibilityId, saved);
}
for (const saved of legacy.values()) {
  const previousArchive = readFileSync(join('.private/releases', saved.payload.releaseId, 'bundle.zip'));
  if (createHash('sha256').update(previousArchive).digest('hex') !== saved.payload.checksum
    || !verify('sha256', previousArchive, config.publicKey, Buffer.from(saved.payload.zipSignature, 'base64'))) throw new Error('A previous native cohort archive is corrupted.');
  const target = join('dist/app-updates', saved.payload.compatibilityId);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, `${saved.payload.releaseId}.zip`), previousArchive);
  writeFileSync(join(target, 'latest.json'), JSON.stringify(saved));
}
const output = resolve(root, '.vercel/output');
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || !realpathSync(output).startsWith(realpathSync(root) + sep)) throw new Error('Unsafe generated Vercel output directory.');
  rmSync(output, { recursive: true, force: true });
}
mkdirSync(output, { recursive: true });
cpSync('dist', join(output, 'static'), { recursive: true });
writeFileSync(join(output, 'config.json'), JSON.stringify({ version: 3, routes: productionRoutes() }, null, 2));
mkdirSync('tmp/ota', { recursive: true });
writeFileSync('tmp/ota/prepared.json', JSON.stringify({ releaseId, sequence, checksum: payload.checksum, compatibilityId: config.compatibilityId, rollbackOf: rollbackId }));
console.log(`Prepared signed production release ${releaseId}. Site and Android OTA share the same web assets.`);
