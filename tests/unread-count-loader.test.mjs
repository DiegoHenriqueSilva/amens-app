import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnreadCountLoader } from '../src/lib/unread-count-loader.ts';

test('loads the new account count after sign-in and resets on sign-out', async () => {
  const values = [];
  const users = [];
  const loader = createUnreadCountLoader(async user => { users.push(user); return 3; }, value => values.push(value));
  await loader.refresh();
  assert.equal(users.length, 0);
  loader.setUser('account'); await loader.refresh();
  assert.equal(values.at(-1), 3);
  loader.setUser(null); await loader.refresh();
  assert.equal(values.at(-1), 0);
  assert.deepEqual(users, ['account']);
});

test('older requests cannot restore an obsolete unread badge after messages are read', async () => {
  const responses = [];
  const values = [];
  const loader = createUnreadCountLoader(() => new Promise(resolve => responses.push(resolve)), value => values.push(value));
  loader.setUser('account');
  const old = loader.refresh(), recent = loader.refresh();
  responses[1](0); await recent;
  responses[0](4); await old;
  assert.equal(values.at(-1), 0);
});

test('a previous account or unmounted component cannot publish a stale count', async () => {
  const responses = [];
  const values = [];
  const loader = createUnreadCountLoader(() => new Promise(resolve => responses.push(resolve)), value => values.push(value));
  loader.setUser('first'); const first = loader.refresh();
  loader.setUser('second'); responses[0](8); await first;
  assert.equal(values.at(-1), 0);
  const pending = loader.refresh(); loader.dispose(); responses[1](9); await pending;
  assert.equal(values.at(-1), 0);
});

test('temporary network errors preserve the confirmed badge and a later refresh clears it', async () => {
  const values = [];
  let mode = 'count';
  const loader = createUnreadCountLoader(async () => {
    if (mode === 'error') throw Error('offline');
    if (mode === 'unknown') return null;
    return mode === 'read' ? 0 : 2;
  }, value => values.push(value));
  loader.setUser('account'); await loader.refresh();
  mode = 'error'; await loader.refresh(); assert.equal(values.at(-1), 2);
  mode = 'unknown'; await loader.refresh(); assert.equal(values.at(-1), 2);
  mode = 'read'; await loader.refresh(); assert.equal(values.at(-1), 0);
});
