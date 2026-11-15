import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, sep } from 'node:path';
import { verifyOtaManifest, shouldDownloadRelease } from '../src/lib/ota-manifest.ts';
import { nativeFingerprint, assertNativeCompatible, productionRoutes } from '../scripts/lib/ota-artifacts.mjs';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const expected = { origin: 'https://www.amens.com.br', compatibilityId: 'android-5', nativeVersionCode: 5, fingerprint: 'runtime-hash', publicKey: keys.publicKey };
const payload = { schema: 1, compatibilityId: 'android-5', nativeVersionCode: 5, nativeFingerprint: 'runtime-hash',
  releaseId: 'release-1794000000000-1234abcd', sequence: 1794000000000,
  url: 'https://www.amens.com.br/app-updates/android-5/release-1794000000000-1234abcd.zip', checksum: 'a'.repeat(64), zipSignature: 'signature' };
const envelope = value => ({ payload: value, signature: sign('sha256', Buffer.from(JSON.stringify(value)), keys.privateKey).toString('base64') });

test('accepts an authentic compatible release manifest', async () => {
  assert.deepEqual(await verifyOtaManifest(envelope(payload), expected), payload);
});
test('rejects modified metadata and signatures', async () => {
  const signed = envelope(payload);
  signed.payload = { ...payload, sequence: payload.sequence + 1 };
  await assert.rejects(verifyOtaManifest(signed, expected), /signature/);
  await assert.rejects(verifyOtaManifest({ ...envelope(payload), signature: 'invalid' }, expected));
});
test('rejects cross-origin bundles and incompatible native releases even when signed', async () => {
  for (const change of [{ url: 'https://other.example/app.zip' }, { nativeVersionCode: 6 }, { nativeFingerprint: 'other-runtime' },
    { compatibilityId: 'android-6' }, { releaseId: '../unsafe' }, { checksum: 'invalid' }]) {
    await assert.rejects(verifyOtaManifest(envelope({ ...payload, ...change }), expected));
  }
});
test('skips installed, staged, rolled-back, and replayed releases', () => {
  const state = { current: 'builtin', next: null, blocked: [], highestSequence: 0, highestRelease: '' };
  assert.equal(shouldDownloadRelease(payload, state), true);
  for (const change of [{ current: payload.releaseId }, { next: payload.releaseId }, { blocked: [payload.releaseId] },
    { highestSequence: payload.sequence + 1 }, { highestSequence: payload.sequence, highestRelease: 'other-release' }]) {
    assert.equal(shouldDownloadRelease(payload, { ...state, ...change }), false);
  }
  assert.equal(shouldDownloadRelease(payload, { ...state, highestSequence: payload.sequence, highestRelease: payload.releaseId }), true);
});

test('native compatibility guard allows web changes and rejects native changes', t => {
  const root = mkdtempSync(join(tmpdir(), 'amens-ota-fixture-'));
  t.after(() => {
    const resolved = realpathSync(root), allowed = realpathSync(tmpdir()) + sep;
    if (!resolved.startsWith(allowed) || !basename(resolved).startsWith('amens-ota-fixture-')) throw Error('Unsafe test cleanup target.');
    rmSync(resolved, { recursive: true, force: true });
  });
  const put = (path, data) => { const target = join(root, path); mkdirSync(join(target, '..'), { recursive: true }); writeFileSync(target, data); };
  for (const file of ['capacitor.config.ts', 'ota.config.json', 'android/app/build.gradle', 'android/build.gradle', 'android/variables.gradle',
    'android/gradle.properties', 'android/gradle/wrapper/gradle-wrapper.properties', 'android/app/src/main/AndroidManifest.xml', 'android/app/google-services.json']) put(file, '{}');
  put('package.json', JSON.stringify({ dependencies: { '@capacitor/core': '8' } }));
  put('package-lock.json', JSON.stringify({ packages: { 'node_modules/@capacitor/core': { version: '8.3.0' } } }));
  const fingerprint = nativeFingerprint(root);
  put('ota.runtime.json', JSON.stringify({ fingerprint }));
  put('src/SomePage.tsx', 'changed web UI');
  assert.equal(assertNativeCompatible(root).fingerprint, fingerprint);
  put('android/app/src/main/AndroidManifest.xml', '<manifest>new permission</manifest>');
  assert.throws(() => assertNativeCompatible(root), /new APK/);
  put('android/app/src/main/AndroidManifest.xml', '{}');
  put('package-lock.json', JSON.stringify({ packages: { 'node_modules/@capacitor/core': { version: '8.4.0' } } }));
  assert.throws(() => assertNativeCompatible(root), /new APK/);
});

test('production serves manifests without caching and never rewrites missing updates to the SPA', () => {
  const routes = productionRoutes();
  const manifest = routes.find(route => route.headers?.['Cache-Control']?.includes('no-store'));
  assert.equal(new RegExp(manifest.src).test('/app-updates/android-5/latest.json'), true);
  const fallback = new RegExp(`^${routes.at(-1).src}$`);
  assert.equal(fallback.test('/messages'), true);
  assert.equal(fallback.test('/app-updates/android-5/latest.json'), false);
  assert.equal(fallback.test('/app-updates/missing'), false);
});
