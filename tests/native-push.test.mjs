import test from 'node:test';
import assert from 'node:assert/strict';
import { registerNativePush } from '../src/lib/native-push-registration.ts';
import { buildFcmConfigurationProbe, buildPushMessage, isExpiredToken, parseNotificationEvent, createGoogleAssertion, secretsMatch } from '../supabase/functions/send-native-push/fcm.ts';

function fakePlugin(event, value) {
  const callbacks = new Map();
  const removed = [];
  return { removed,
    addListener: async (name, callback) => { callbacks.set(name, callback); return { remove: async () => { removed.push(name); } }; },
    register: async () => { if (event) callbacks.get(event)(value); },
  };
}

test('activation waits for server persistence after receiving a token', async () => {
  const plugin = fakePlugin('registration', { value: 'device-token' });
  let complete;
  let saved;
  const saving = new Promise(resolve => { complete = resolve; });
  let resolved = false;
  const pending = registerNativePush(plugin, async token => { saved = token; await saving; }).then(() => { resolved = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(saved, 'device-token');
  assert.equal(resolved, false);
  complete(); await pending;
  assert.equal(resolved, true);
  assert.equal(plugin.removed.length, 2);
});

test('database errors do not produce successful activation', async () => {
  const plugin = fakePlugin('registration', { value: 'device-token' });
  await assert.rejects(registerNativePush(plugin, async () => { throw new Error('database unavailable'); }), /database unavailable/);
  assert.equal(plugin.removed.length, 2);
});

test('timeout also covers a hung native call or database save', async () => {
  const native = fakePlugin(null);
  native.register = () => new Promise(() => {});
  await assert.rejects(registerNativePush(native, async () => {}, 10), /timed out/);
  assert.equal(native.removed.length, 2);
  const database = fakePlugin('registration', { value: 'device-token' });
  await assert.rejects(registerNativePush(database, () => new Promise(() => {}), 10), /timed out/);
  assert.equal(database.removed.length, 2);
});

test('registration failures, empty tokens, and timeouts reject and clean up listeners', async () => {
  for (const [event, value, message] of [
    ['registrationError', { error: 'error' }, /failed/],
    ['registration', { value: '' }, /Empty/],
    [null, null, /timed out/],
  ]) {
    const plugin = fakePlugin(event, value);
    await assert.rejects(registerNativePush(plugin, async () => assert.fail('should not save'), 10), message);
    assert.equal(plugin.removed.length, 2);
  }
});

test('FCM payload keeps private prayer content out of the lock screen', () => {
  const payload = buildPushMessage('token', 'notification-id');
  assert.equal(payload.message.token, 'token');
  assert.equal(payload.message.data.url, '/messages');
  assert.equal(payload.message.android.notification.channel_id, 'amens-notifications');
  assert.equal(payload.message.notification.body, 'Você tem uma nova notificação no Améns.');
});

test('FCM configuration probe validates without delivering any notification', () => {
  const probe = buildFcmConfigurationProbe();
  assert.equal(probe.validate_only, true);
  assert.equal(probe.message.topic, 'amens-configuration-check');
  assert.equal(probe.message.token, undefined);
});

test('only the explicit FCM unregistered error invalidates a device token', () => {
  const error = code => ({ error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: code }] } });
  assert.equal(isExpiredToken(error('UNREGISTERED')), true);
  for (const body of [error('INVALID_ARGUMENT'), error('UNAVAILABLE'), null, {}, { error: { details: 'invalid' } }]) assert.equal(isExpiredToken(body), false);
});

test('webhook accepts only notification inserts with a valid ID', () => {
  const id = '59f4c99e-f8c0-4993-b727-187a966d1585';
  const event = { type: 'INSERT', schema: 'public', table: 'notifications', record: { id } };
  assert.equal(parseNotificationEvent(event), id);
  for (const value of [null, {}, { ...event, type: 'UPDATE' }, { ...event, table: 'profiles' }, { ...event, record: { id: 'invalid' } }]) assert.equal(parseNotificationEvent(value), null);
});

test('webhook authentication rejects missing and mismatched secrets', async () => {
  assert.equal(await secretsMatch('shared-secret', 'shared-secret'), true);
  assert.equal(await secretsMatch('other', 'shared-secret'), false);
  assert.equal(await secretsMatch(null, 'shared-secret'), false);
  assert.equal(await secretsMatch('', ''), false);
});

test('Google assertion is signed with RS256 and restricted to FCM scope', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pem = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64');
  const account = { project_id: 'test-project', client_email: 'push@test-project.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----` };
  const assertion = await createGoogleAssertion(account, 1000);
  const [header, payload, signature] = assertion.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'RS256');
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assert.equal(claims.iss, account.client_email);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', keys.publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`)), true);
});
