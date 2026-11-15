import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNativeAuthCallback, NATIVE_AUTH_REDIRECT } from '../src/lib/native-auth-callback.ts';

test('accepts the exact Android callback and decodes its authorization code', () => {
  assert.deepEqual(parseNativeAuthCallback(`${NATIVE_AUTH_REDIRECT}?code=one%2Btwo`), { code: 'one+two', error: false });
});

test('rejects unrelated and impersonated callback URLs', () => {
  for (const value of ['invalid', 'https://auth/callback?code=x', 'com.amens.app://evil/callback?code=x',
    'com.amens.app://auth/other?code=x', 'com.amens.app://user@auth/callback?code=x',
    'com.amens.app://auth:99/callback?code=x', 'com.amens.app://auth/callback/extra?code=x']) {
    assert.equal(parseNativeAuthCallback(value), null, value);
  }
});

test('recognizes provider errors in both query and fragment', () => {
  for (const suffix of ['?error=access_denied', '#error=access_denied', '?code=x&error_description=denied']) {
    assert.equal(parseNativeAuthCallback(`${NATIVE_AUTH_REDIRECT}${suffix}`).error, true);
  }
});

test('does not accept implicit flow tokens as a PKCE code', () => {
  assert.deepEqual(parseNativeAuthCallback(`${NATIVE_AUTH_REDIRECT}#access_token=example&refresh_token=example`), { code: null, error: false });
});
