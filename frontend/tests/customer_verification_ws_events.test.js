/**
 * SENTINEL — WebSocket Merge Logic for customer.verification.* Events
 *
 * Mirrors the handleEvent() branch added to src/hooks/useWebSocket.js for
 * EVENT_TYPES.CUSTOMER_VERIFICATION_REQUESTED / _RESPONDED, since
 * useWebSocket.js itself relies on Vite's import.meta.env and browser
 * WebSocket globals and cannot be imported under the plain Node test runner
 * (matches this repo's existing test convention -- see
 * collaboration_visibility.test.js / collaboration_workspace.test.js, which
 * mirror component logic rather than importing components directly).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_TYPES } from '../src/types/events.js';

/** Mirrors the CUSTOMER_VERIFICATION_* branch in useWebSocket.js handleEvent(). */
function mergeVerificationEvent(store, payload) {
  const type = payload.event;
  if (
    type !== EVENT_TYPES.CUSTOMER_VERIFICATION_REQUESTED &&
    type !== EVENT_TYPES.CUSTOMER_VERIFICATION_RESPONDED
  ) {
    return store;
  }
  const caseId = payload.case_id;
  if (!caseId) return store;
  return {
    ...store,
    verifications: {
      ...store.verifications,
      [caseId]: {
        ...(store.verifications[caseId] || {}),
        verification_id: payload.verification_id,
        status: payload.status,
        reason_summary: payload.reason_summary || (store.verifications[caseId] || {}).reason_summary,
        responded_at: payload.responded_at || (store.verifications[caseId] || {}).responded_at
      }
    }
  };
}

const emptyStore = () => ({ transactions: [], cases: [], actions: [], verifications: {} });

test('customer.verification.requested creates a PENDING entry keyed by case_id', () => {
  const store = mergeVerificationEvent(emptyStore(), {
    event: 'customer.verification.requested',
    case_id: 'CASE-WS-1',
    verification_id: 'CV-1',
    reason_summary: 'This payment is much higher than your recent activity.',
    status: 'PENDING'
  });
  assert.equal(store.verifications['CASE-WS-1'].status, 'PENDING');
  assert.equal(store.verifications['CASE-WS-1'].verification_id, 'CV-1');
});

test('customer.verification.responded updates the existing entry in place', () => {
  let store = mergeVerificationEvent(emptyStore(), {
    event: 'customer.verification.requested',
    case_id: 'CASE-WS-2',
    verification_id: 'CV-2',
    reason_summary: 'reason text',
    status: 'PENDING'
  });
  store = mergeVerificationEvent(store, {
    event: 'customer.verification.responded',
    case_id: 'CASE-WS-2',
    verification_id: 'CV-2',
    status: 'RESPONDED_NO',
    responded_at: '2026-09-24T10:10:00Z'
  });
  assert.equal(store.verifications['CASE-WS-2'].status, 'RESPONDED_NO');
  // reason_summary from the first event is preserved even though the second
  // payload doesn't repeat it.
  assert.equal(store.verifications['CASE-WS-2'].reason_summary, 'reason text');
  assert.equal(store.verifications['CASE-WS-2'].responded_at, '2026-09-24T10:10:00Z');
});

test('event with missing case_id is ignored (does not throw, does not mutate store)', () => {
  const before = emptyStore();
  const after = mergeVerificationEvent(before, { event: 'customer.verification.requested' });
  assert.deepEqual(after, before);
});

test('unrelated event types pass through unchanged', () => {
  const before = emptyStore();
  const after = mergeVerificationEvent(before, { event: 'case_updated', case_id: 'CASE-WS-3' });
  assert.deepEqual(after, before);
});

test('two different cases maintain independent verification entries', () => {
  let store = mergeVerificationEvent(emptyStore(), {
    event: 'customer.verification.requested', case_id: 'CASE-A', status: 'PENDING', reason_summary: 'r1'
  });
  store = mergeVerificationEvent(store, {
    event: 'customer.verification.requested', case_id: 'CASE-B', status: 'PENDING', reason_summary: 'r2'
  });
  assert.equal(store.verifications['CASE-A'].reason_summary, 'r1');
  assert.equal(store.verifications['CASE-B'].reason_summary, 'r2');
});
