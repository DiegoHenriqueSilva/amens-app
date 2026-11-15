import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrayerConcluded, isPrayerEligibleForDraw } from '../src/lib/prayer-status.ts';

test('closing testimonies cannot be drawn even when legacy status is active', () => {
  for (const feedback of ['success', 'grace_received', 'not_this_time', 'god_knows']) {
    assert.equal(isPrayerConcluded({ status: 'active', feedback }), true, feedback);
    assert.equal(isPrayerEligibleForDraw({ status: 'active', feedback }), false, feedback);
  }
});

test('a completed cause is excluded even without a testimony', () => {
  for (const feedback of [null, '', 'keep_trying', 'success']) {
    assert.equal(isPrayerConcluded({ status: 'completed', feedback }), true);
    assert.equal(isPrayerEligibleForDraw({ status: 'completed', feedback }), false);
  }
});

test('open requests and the explicit choice to keep trying remain eligible', () => {
  for (const feedback of [null, undefined, '', 'keep_trying']) {
    assert.equal(isPrayerConcluded({ status: 'active', feedback }), false);
    assert.equal(isPrayerEligibleForDraw({ status: 'active', feedback }), true);
  }
});

test('reopening with active status and no feedback makes a cause eligible again', () => {
  const cause = { status: 'completed', feedback: 'grace_received' };
  assert.equal(isPrayerEligibleForDraw(cause), false);
  assert.equal(isPrayerEligibleForDraw({ ...cause, status: 'active', feedback: null }), true);
});

test('pending, rejected, banned or missing status cannot enter the draw', () => {
  for (const status of ['pending', 'rejected', 'banned', null, undefined]) {
    assert.equal(isPrayerEligibleForDraw({ status, feedback: null }), false);
  }
});
