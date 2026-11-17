import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prayerShare,
  sharePrayer,
  prayerOperation,
  isPrayerId,
  isGeneralIntentionId,
} from '../src/lib/prayer-flow.ts';
const cause = {
  id: '00000000-0000-4000-8000-000000000123',
  content: 'Private content',
  location: 'Private address',
  display_name: 'Private name',
  is_anonymous: true,
  is_default: false,
};
test('public shares contain only the application link and generic invitation', () => {
  const payload = prayerShare(cause);
  const value = JSON.stringify(payload);
  for (const privateValue of ['Private content', 'Private address', 'Private name', 'from='])
    assert.equal(value.includes(privateValue), false);
  assert.equal(new URL(payload.url).searchParams.get('id'), cause.id);
});
test('general intentions use a valid share route instead of passing a non-UUID as a cause id', () => {
  const payload = prayerShare({ ...cause, id: 'default-001', is_default: true });
  assert.equal(new URL(payload.url).searchParams.get('intention'), 'default-001');
  assert.equal(new URL(payload.url).searchParams.has('id'), false);
});
test('cancelled native shares do not report success or open WhatsApp', async () => {
  const value = await sharePrayer(cause, {
    share: async () => {
      throw Object.assign(new Error(), { name: 'AbortError' });
    },
    open: () => {
      throw new Error('Should not open');
    },
  });
  assert.equal(value, 'cancelled');
});
test('blocked popup and accepted share have distinct outcomes', async () => {
  assert.equal(await sharePrayer(cause, { open: () => null }), 'blocked');
  assert.equal(await sharePrayer(cause, { share: async () => {}, open: () => null }), 'shared');
  const popup = { opener: 'parent' };
  assert.equal(await sharePrayer(cause, { open: () => popup }), 'opened');
  assert.equal(popup.opener, null);
});
test('operation ids persist until acknowledgment and stay isolated by account and target', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  const first = prayerOperation(storage, 'alice:random');
  assert.equal(prayerOperation(storage, 'alice:random').id, first.id);
  assert.notEqual(prayerOperation(storage, 'bob:random').id, first.id);
  assert.notEqual(prayerOperation(storage, 'alice:specific').id, first.id);
  first.acknowledge();
  assert.notEqual(prayerOperation(storage, 'alice:random').id, first.id);
});
test('identifier validation rejects malformed public links', () => {
  assert.equal(isPrayerId(cause.id), true);
  assert.equal(isPrayerId('not-a-uuid'), false);
  assert.equal(isGeneralIntentionId('default-008'), true);
  assert.equal(isGeneralIntentionId('default-009'), false);
});

test('retries retain their identity when optional recovery storage is unavailable', () => {
  const blocked = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {},
    removeItem: () => {},
  };
  const first = prayerOperation(blocked, 'blocked-storage:random');
  assert.equal(prayerOperation(blocked, 'blocked-storage:random').id, first.id);
  first.acknowledge();
  assert.notEqual(prayerOperation(blocked, 'blocked-storage:random').id, first.id);
});
