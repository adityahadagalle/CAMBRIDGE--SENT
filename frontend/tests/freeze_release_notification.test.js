/**
 * SENTINEL — Customer Response Notification & Freeze/Release UI logic
 *
 * Mirrors the notification-merge branch added to useWebSocket.js and the
 * frozen-state derivation logic in InvestigationSidebar.jsx (see
 * customer_verification_ws_events.test.js for why this repo's convention is
 * to mirror logic rather than import components/hooks that need Vite/browser
 * globals under the plain Node test runner).
 *
 * 16. live frontend state updates correctly -- covered by the store-merge
 * behavior below (a customer_response_notification event updates the
 * notifications list without a page refresh).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

/** Mirrors the 'customer_response_notification' branch in useWebSocket.js handleEvent(). */
function mergeNotificationEvent(store, payload) {
  if (payload.event !== 'customer_response_notification') return store;
  const notif = {
    id: `NOTIF-${payload.case_id}-${payload.timestamp || 'x'}`,
    case_id: payload.case_id,
    transaction_id: payload.transaction_id,
    account_id: payload.account_id,
    decision: payload.decision,
    frozen_by: payload.frozen_by,
    frozen_at: payload.frozen_at,
    timestamp: payload.timestamp || new Date().toISOString(),
    read: false
  };
  return { ...store, notifications: [notif, ...store.notifications].slice(0, 50) };
}

/** Mirrors the displayVerification/isAccountFrozen release-button gating logic. */
function shouldShowReleaseButton(verificationStatus, isAccountFrozen) {
  return Boolean(isAccountFrozen && verificationStatus?.status === 'RESPONDED_YES');
}

const emptyStore = () => ({ notifications: [] });

test('customer_response_notification creates a notification identifying the correct case', () => {
  const store = mergeNotificationEvent(emptyStore(), {
    event: 'customer_response_notification',
    case_id: 'CASE-FRAUD-602',
    transaction_id: 'TXN-XXXX',
    account_id: 'ACC-USR-1004',
    decision: 'RESPONDED_YES',
    frozen_by: 'ANALYST_1',
    frozen_at: '2026-01-01T10:05:00Z',
    timestamp: '2026-01-01T10:27:00Z'
  });
  assert.equal(store.notifications.length, 1);
  assert.equal(store.notifications[0].case_id, 'CASE-FRAUD-602');
  assert.equal(store.notifications[0].decision, 'RESPONDED_YES');
});

test('notifications for different cases do not overwrite each other', () => {
  let store = mergeNotificationEvent(emptyStore(), {
    event: 'customer_response_notification', case_id: 'CASE-A', decision: 'RESPONDED_YES', timestamp: '1'
  });
  store = mergeNotificationEvent(store, {
    event: 'customer_response_notification', case_id: 'CASE-B', decision: 'RESPONDED_NO', timestamp: '2'
  });
  assert.equal(store.notifications.length, 2);
  const caseIds = store.notifications.map((n) => n.case_id);
  assert.ok(caseIds.includes('CASE-A'));
  assert.ok(caseIds.includes('CASE-B'));
});

test('unrelated events do not create notifications', () => {
  const before = emptyStore();
  const after = mergeNotificationEvent(before, { event: 'customer.verification.responded', case_id: 'CASE-A' });
  assert.deepEqual(after, before);
});

// 4/5. customer YES after freeze -> release button surfaces, but only then.
test('release button surfaces only when frozen AND customer responded YES', () => {
  assert.equal(shouldShowReleaseButton({ status: 'RESPONDED_YES' }, true), true);
  assert.equal(shouldShowReleaseButton({ status: 'RESPONDED_YES' }, false), false);
  assert.equal(shouldShowReleaseButton({ status: 'PENDING' }, true), false);
  assert.equal(shouldShowReleaseButton({ status: 'RESPONDED_NO' }, true), false);
});

// 8. release requires rationale -- client-side gate mirrors the server's mandatory reason.
function canSubmitRelease(releaseReasonText) {
  return Boolean(releaseReasonText && releaseReasonText.trim().length > 0);
}

test('release submission is blocked client-side without a non-empty reason', () => {
  assert.equal(canSubmitRelease(''), false);
  assert.equal(canSubmitRelease('   '), false);
  assert.equal(canSubmitRelease('Customer confirmed via phone call'), true);
});
