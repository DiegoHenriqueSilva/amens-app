import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function nativeFingerprint(root) {
  const files = ['capacitor.config.ts', 'ota.config.json', 'android/app/build.gradle', 'android/build.gradle',
    'android/variables.gradle', 'android/gradle.properties', 'android/gradle/wrapper/gradle-wrapper.properties',
    'android/app/src/main/AndroidManifest.xml', 'android/app/google-services.json'];
  const walk = relative => {
    if (!existsSync(join(root, relative))) return;
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (path !== 'android/app/src/main/res/xml/config.xml') files.push(path);
    }
  };
  walk('android/app/src/main/java'); walk('android/app/src/main/res');
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const nativePackages = Object.keys(rootPackage.dependencies ?? {}).filter(name => {
    const path = join(root, 'node_modules', name, 'package.json');
    return name.startsWith('@capacitor/') || name.startsWith('@capawesome/') || (existsSync(path) && JSON.parse(readFileSync(path, 'utf8')).capacitor);
  }).sort().map(name => [name, lock.packages[`node_modules/${name}`]?.version]);
  const digest = createHash('sha256').update(JSON.stringify(nativePackages));
  for (const path of files.sort()) {
    if (!existsSync(join(root, path))) throw new Error(`Native runtime file is missing: ${path}`);
    const raw = readFileSync(join(root, path));
    const value = /\.(ts|json|xml|gradle|properties|java)$/.test(path) ? Buffer.from(raw.toString().replace(/\r\n/g, '\n')) : raw;
    digest.update(path).update('\0').update(value).update('\0');
  }
  return digest.digest('hex');
}

export function assertNativeCompatible(root) {
  const runtime = JSON.parse(readFileSync(join(root, 'ota.runtime.json'), 'utf8'));
  if (runtime.fingerprint !== nativeFingerprint(root)) throw new Error('Native Android files/plugins changed. Create a new APK/runtime cohort before publishing OTA.');
  return runtime;
}

export function productionRoutes() {
  return [
    { src: '/app-updates/.*', headers: { 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' }, continue: true },
    { src: '/app-updates/.*/latest\\.json', headers: { 'Cache-Control': 'no-store, max-age=0' }, continue: true },
    { src: '/app-updates/.*\\.zip', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
    { handle: 'filesystem' },
    { src: '/((?!assets/|daily-gospel/|backgrounds/|app-updates/|.*\\..*).*)', dest: '/index.html' },
  ];
}
