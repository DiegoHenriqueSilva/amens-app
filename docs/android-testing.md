# Android testing

## Authentication setup

The Android app uses the existing Supabase project and Google OAuth provider.
In Supabase **Authentication > URL Configuration > Redirect URLs**, add exactly:

```text
com.amens.app://auth/callback
```

Keep existing website redirects and the website Site URL. The Google Cloud OAuth
client continues to use the Supabase HTTPS callback already configured for web
sign-in. The custom scheme above belongs in Supabase's redirect allowlist, not in
Google Cloud's authorized HTTPS redirect list.

On November 6, 2026, the active APK backend (`fszltwvhbdasqoznnors`) was found to
have only four website/development redirects and no Android callback. The exact
callback above was added, preserving the four existing entries and all other
remote properties. A fresh configuration read confirmed it is explicitly
allowed. Run `node scripts/check-native-auth-redirect.mjs` with an authenticated
Supabase CLI session to verify this prerequisite. This check does not perform a
user login. After an allowlist fix, close the previous browser tab and initiate a
new Google sign-in from the installed APK; an old OAuth attempt can retain its
original website return destination.

Android authentication opens a system browser custom tab and uses PKCE. The code
is exchanged in the app, using the verifier stored when login started. Both cold
launch and an already running app handle the callback. Website login keeps its
existing redirect flow. Email confirmation initiated in Android also uses this
callback and must be completed on the same installation that started sign-up.

## Toolchain and build

Use an existing Java 21 / Android SDK installation by setting `JAVA_HOME` and
`ANDROID_HOME`, or run the optional portable setup from PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup-android.ps1
```

The setup downloads tools from Adoptium and Google, verifies their checksums,
accepts Android SDK licenses, and stores everything under ignored
`tmp/android-tools/`. It writes the ignored `android/local.properties` file.

Build from the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-debug.ps1
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
Run `scripts/verify-android-debug.ps1` to check the signature and authentication
intent and copy the verified APK to `tmp/Amens-teste.apk` for manual sharing.
This is a debug-signed build for initial testing, not a production release.
Preserve the debug keystore to keep subsequent test builds installable as
updates. A production release needs a dedicated signing key kept outside Git.

## Validation status

The Android debug build and APK v2 signature verification passed. Four automated
callback parser tests passed. The configured Supabase HTTPS endpoint responded
successfully and reported the Google provider enabled. Device sign-in, the
Supabase redirect allowlist, and authenticated database operations still need the
manual checks below. The full TypeScript check still reports four pre-existing
errors in `src/pages/PrayerChain.tsx`; it is not a clean type-check baseline.

The web build embeds Vite's public configuration. Use the intended Supabase URL
and public/anonymous key; never put a service-role key in Vite configuration.
The database remains remote and follows the authenticated user's RLS policies.
Testing against the website's project creates real records there.

## Device verification

1. Install the APK and allow installation from the chosen download source.
2. Sign in with an existing Google account; check the return to Amens.
3. For a new account, complete the profile and check database persistence.
4. Close and reopen the app; confirm the session persists.
5. Sign out, cancel Google login, and retry successfully.
6. Start login, let Android terminate the app, and finish login; verify cold start.
7. Create a test prayer and confirm it appears on the website under the same user.
8. Check photos, keyboard, back navigation, and login with a second tester account.

If Google's OAuth consent screen is in testing mode, test accounts may need to be
added to the Google Cloud project's allowed test users.

Push delivery requires separate Firebase/server configuration and is not proven
by a successful APK build. The build script disables Android push registration
when `android/app/google-services.json` is absent, avoiding Firebase initialization
errors. OTA updates are not configured by this workflow.
