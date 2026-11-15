# Unified website and Android production releases

The current Android APK is version `1.1.1-test` (native version code 6), with
the official dove icon. Install it over the previous test app. Version
`1.1.0-test` (code 5) introduced the live-update runtime; earlier APKs cannot
acquire that runtime over the air.

## Publishing

From the configured workspace, run:

```powershell
npm.cmd run deploy:production
```

This is the production publication workflow for both the site and Android web
assets. It checks the backend, checks native compatibility, builds the current
React application, signs a ZIP and its manifest, and publishes a single static
Vercel deployment containing the website and OTA artifacts. It then downloads
and verifies the public manifest and ZIP and compares the site's index with the
one in the app update. A local code edit alone does not publish a release.

Use this command for subsequent production publications. A standalone Vite
build, raw Vercel source deployment, Lovable Publish, or an unconfigured GitHub
auto-deployment does not generate these signed OTA artifacts. CI publication
must run an equivalent signed release workflow with securely provisioned keys;
the existing repository's historical branches have not been merged or pushed by
this setup. The signing key is kept locally and not uploaded to Vercel.

Production: `https://www.amens.com.br`.
Manifest: `/app-updates/android-6/latest.json`.
ZIPs: `/app-updates/android-6/<release-id>.zip`.
Previous cohorts retain their last archived compatible release during publishing;
new releases target the current cohort. Install the current APK to move cohorts.

## What updates automatically

HTML, React/TypeScript logic, CSS, images, and bundled web content can update
without an APK, provided they remain compatible with the installed native
runtime. The site and downloaded app bundle come from the same build. Supabase
data and deployed server behavior are already shared; schema and Edge Function
changes still require deliberate, backward-compatible Supabase deployment.

The app checks on startup/resume, reconnection, and periodically while visible.
It downloads the new bundle in the background and stages it for the next cold
start. On a warm resume it also applies a staged update when the app is on its
home screen and no form or dialog is active. It does not interrupt Google login,
an open form, a prayer screen, or an active session to reload immediately.
Updates require internet; offline use keeps the installed bundle. A killed app
does not check for releases until Android opens it again.

## Native changes

New native plugins, Android permissions, native notification presentation,
Firebase Android configuration, app icons, Capacitor configuration, and other
native code changes can require another APK. `ota.runtime.json` records a native
fingerprint. Production preparation rejects a changed native runtime rather
than sending incompatible web code to existing installations.

For an intentional new native cohort, increment the Android version code and
`ota.config.json`'s native version/cohort, configure the native changes, then run:

```powershell
node scripts/init-live-updates.mjs --lock-runtime
```

Build and distribute a new APK for that cohort. Retain the existing signing key;
key rotation also requires native coordination. This workflow does not promise
that native changes can be delivered as web updates.

## Signing and recovery

Back up `.private/ota-signing-key.pem` securely, outside Git and outside public
hosting. Losing this key prevents publishing updates accepted by the installed
APK. `ota.config.json` contains only its public counterpart. Neither private keys
nor Firebase service-account credentials belong in Vite assets.

The app verifies the manifest signature, expected origin, native cohort,
fingerprint, and sequence. The native plugin verifies ZIP checksum and RSA
signature. Already staged/current releases and rolled-back releases are skipped.
If an updated bundle does not signal readiness after startup, the native runtime
returns to the web assets embedded in the APK and blocks that failed bundle.
This detects startup failure, not every possible application-level defect.

Previous signed web releases are archived under `.private/releases/`. To publish
one of those releases again to both site and app using a fresh release sequence:

```powershell
npm.cmd run deploy:production -- -RollbackRelease release-<timestamp>-<suffix>
```

## Building the bootstrap APK

After preparing/publishing production, build from those exact signed web assets:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-debug.ps1 -UsePreparedWebBuild
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify-android-debug.ps1 -OutputName Amens-atualizacao-automatica.apk
```

The signing-certificate comparison verifies this is installable as an update over
the earlier test APK. Device verification is still necessary: install the
bootstrap, use a subsequent production release, reopen the app, and confirm the
new web behavior without installing another APK. Desktop signature/hosting tests
do not substitute for that final phone test.
