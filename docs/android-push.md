# Android push notifications

## Current status

The repository contains device registration, truthful permission/activation UI,
an Android notification channel/icon, a multi-device table with RLS, and the
`send-native-push` Edge Function. The Firebase Android configuration for project
`amens-f10ba` and package `com.amens.app` has been validated, and the Android build
with that configuration passed. The server was deployed to
`fszltwvhbdasqoznnors` on November 6, 2026. Device RLS, the Vault-backed insert
trigger, the authenticated function, and FCM API authorization passed validation.
The FCM check used `validate_only: true`, delivering no notifications. Requests
without the webhook secret returned HTTP 401. There were no registered Android
devices at initial verification time. A real test was subsequently accepted by
FCM for one registered Android device, and the tester confirmed receipt both in
the background and inside the app.
Website Web Push delivery is outside this Android setup.

## 1. Register the Android app

Create or choose the Firebase project, add the Android app with package name
`com.amens.app`, download `google-services.json`, and place it at
`android/app/google-services.json`. The build validates the package name and
enables Android push only when this configuration is present. This client config
does not authorize sending messages from a server. Keep Google OAuth configured
in the existing Supabase project; Firebase Authentication is not required.

Enable the Firebase Cloud Messaging API (HTTP v1). Create a dedicated Google
service account with permission to send FCM messages to this Firebase project,
and obtain its private key JSON. Store that JSON only as the Supabase Edge
Function secret `FIREBASE_SERVICE_ACCOUNT`, not in source control, an APK, a
`VITE_` variable, or a chat message. The service account's `project_id` must match
the project in `google-services.json`.

## 2. Select the correct Supabase project

Use the project host from Vite's production `VITE_SUPABASE_URL`, including
`.env.local` / production environment precedence. During implementation the build
used `fszltwvhbdasqoznnors.supabase.co`, while CLI linking and `config.toml` referred
to other projects. Verify the intended host before any database or function
deployment. Always pass the correct `--project-ref`; do not run a broad `db push`
against the historical link or blindly apply unrelated migrations.

On the project used by the APK, apply only the new table migration
`supabase/migrations/20261106000000_native_push_devices.sql` after checking whether
it has already been applied. It does not replace the older browser subscription
table. Each authenticated user can access only their own device registrations.

Add these function secrets through the Supabase dashboard:

- `FIREBASE_SERVICE_ACCOUNT`: the dedicated service account JSON.
- `PUSH_WEBHOOK_SECRET`: a high-entropy random secret of at least 32 bytes.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge
Functions. Do not copy these privileged values into the client environment.

Deploy the function with the correct project reference:

```powershell
node_modules/.bin/supabase.cmd functions deploy send-native-push --project-ref <actual-project-ref>
```

The function has `verify_jwt = false` because Database Webhooks do not use an
end-user session. It still authenticates every request using the shared secret;
an anonymous invocation cannot send messages.

## 3. Database trigger and deployment

The current deployment uses `public.amens_native_push_on_insert`, installed by
`scripts/deploy-native-push.ps1`. The trigger reads its URL and shared secret from
Supabase Vault and queues an asynchronous `pg_net` request. No secret is embedded
in the trigger definition. Do not add an additional dashboard webhook to this
deployment; that would duplicate delivery.

The setup script applies only the two dedicated native-push SQL files, without
running historical migrations or changing the old CLI link. These direct SQL
applications do not reconcile the repository's broader migration history.

Run `scripts/check-native-push-delivery.ps1` for a no-delivery configuration test
through the database HTTP queue, Edge Function, and Firebase's validation-only
API. Its checks include Firebase project matching, HTTP 401 for unauthorized
requests, device RLS, and the enabled trigger.

For a fresh installation choosing a dashboard webhook instead of the trigger,
the equivalent configuration is:

In Database > Webhooks, create a webhook for INSERT on `public.notifications`:

- Method: POST.
- URL: `https://<actual-project-ref>.supabase.co/functions/v1/send-native-push`.
- Header `Content-Type`: `application/json`.
- Header `x-push-webhook-secret`: exactly the value of `PUSH_WEBHOOK_SECRET`.

The function accepts the standard Supabase webhook payload. It reloads the
notification from the database and derives the recipient there rather than
trusting a supplied user ID. Already-read or deleted notifications are skipped.
It sends a generic lock-screen message to the recipient's registered Android
devices. Personal prayer content is available only after opening the app.

Expired FCM tokens are deleted only for the explicit `UNREGISTERED` response.
Other delivery errors return HTTP 503 and record non-sensitive counters in the
function logs. This webhook implementation does not include a durable retry
queue; investigate failed webhook calls and replay them deliberately. Replays
use the same Android notification tag, reducing duplicate visible tray entries.

## 4. Build and verify on a phone

Run `scripts/build-android-debug.ps1`, then
`scripts/verify-android-debug.ps1`. The latter creates `tmp/Amens-teste.apk` after
signature and manifest checks. Install it as an update over the previous test
APK signed by the same debug key, preserving the account session.

1. Sign in and enable notifications. Success must wait for the token to be saved
   in `push_devices`. Registration errors must not appear as permission refusal.
2. Check that the row belongs to the logged-in user, without sharing its token.
3. Create a notification for the tester's own account and verify the webhook log.
4. Test with the app open (in-app notice), backgrounded, and normally closed
   (Android notification). A force-stopped app is a separate Android state.
5. Tap the notification and verify it opens `/messages` within Amens.
6. Test a second phone on the same account and confirm both registrations remain.
7. Sign out and confirm that device's registration is removed when online. An
   offline cleanup can fail, so lock-screen payloads intentionally omit personal
   message content. Reinstallations can leave tokens until FCM expires them.

The app's per-installation ID and user ID are used together for registration;
opening a new session refreshes the device token without prompting again when
Android permission is already granted.

## Validation performed locally

The web build, Android build, and eighteen automated tests passed, covering native registration,
database failure propagation, timeouts, callback parsing, JWT signing, webhook
validation/authentication, and expired-token classification. Full application
type-checking still has the four existing errors in `PrayerChain.tsx`. Delivery
has been validated through Firebase's no-delivery API and a real device test.
The signed APK `tmp/Amens-teste-notificacoes.apk` is version `1.0.1-test`
(version code 2). Its successor, `tmp/Amens-teste-mensagens.apk`, is version
`1.0.2-test` (version code 3) and fixes the in-app unread-message badge.

## Unread message badge

`public.notifications` was missing from `supabase_realtime`; the dedicated
`20261106020000_notifications_realtime.sql` migration enabled it while retaining
existing notification RLS. The unread-count hook now follows the authenticated
account and refreshes for Realtime changes, foreground push events, app resume,
focus, reconnection, and navigation. A visible-page polling fallback recovers
missed events. Clicking the navigation icon does not optimistically clear the
badge: successful inbox read updates determine the confirmed count.

Four count-loader tests cover sign-in/sign-out, out-of-order requests, account
changes/unmounting, and temporary failures. The new APK build and signature check
passed; the updated visual badge still needs verification on the phone after a
fresh notification.

## Foreground presentation

Version `1.0.3-test` (version code 4), packaged as `tmp/Amens-teste-1.0.3.apk`,
sets `PushNotifications.presentationOptions` to an empty array. In the installed
Android plugin this skips foreground system-notification display while still
dispatching `pushNotificationReceived`, which updates the in-app toast and unread
badge. FCM's background system presentation remains unchanged. The Android build,
signature, and packaged configuration were checked; foreground/background device
behavior should be confirmed after installing this update.
