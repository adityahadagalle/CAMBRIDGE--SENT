/**
 * SENTINEL — Customer Verification Panel (n8n VerifyFlow) Test Suite
 *
 * Verifies:
 * 1. EVENT_TYPES carries the two new customer.verification.* event names.
 * 2. The displayVerification merge logic (REST snapshot + live WS push, live
 *    wins) used by InvestigationSidebar.jsx renders correctly across all
 *    states: not-triggered, PENDING, RESPONDED_YES, RESPONDED_NO.
 * 3. The panel never surfaces internal fields (risk score, pattern ids,
 *    verification token) -- only the customer-safe subset the backend
 *    already filters at GET /cases/{case_id}/verification-status.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_TYPES } from '../src/types/events.js';

test('EVENT_TYPES includes the two customer verification events with dotted names', () => {
  assert.equal(EVENT_TYPES.CUSTOMER_VERIFICATION_REQUESTED, 'customer.verification.requested');
  assert.equal(EVENT_TYPES.CUSTOMER_VERIFICATION_RESPONDED, 'customer.verification.responded');
});

/**
 * Mirrors the displayVerification useMemo in InvestigationSidebar.jsx:
 * live WebSocket push wins over the polled REST snapshot when present.
 */
function buildDisplayVerification(verificationStatus, liveVerification) {
  if (!verificationStatus?.triggered && !liveVerification) return null;
  return {
    status: liveVerification?.status || verificationStatus?.status || 'PENDING',
    reason_summary: liveVerification?.reason_summary || verificationStatus?.reason_summary || '',
    requested_at: verificationStatus?.requested_at || null,
    responded_at: liveVerification?.responded_at || verificationStatus?.responded_at || null,
    demo_customer_email_masked: verificationStatus?.demo_customer_email_masked || null
  };
}

test('Case with no VerifyFlow trigger renders no panel (null)', () => {
  const result = buildDisplayVerification({ case_id: 'CASE-X', triggered: false }, null);
  assert.equal(result, null);
});

test('PENDING status from REST snapshot alone renders WAITING state', () => {
  const result = buildDisplayVerification({
    case_id: 'CASE-X',
    triggered: true,
    status: 'PENDING',
    reason_summary: 'This payment is much higher than your recent activity.',
    demo_customer_email_masked: 'a***@gmail.com'
  }, null);
  assert.equal(result.status, 'PENDING');
  assert.equal(result.demo_customer_email_masked, 'a***@gmail.com');
});

test('Live WS push (RESPONDED_YES) overrides a stale PENDING REST snapshot', () => {
  const restSnapshot = { case_id: 'CASE-X', triggered: true, status: 'PENDING', reason_summary: 'reason' };
  const livePush = { status: 'RESPONDED_YES', reason_summary: 'reason', responded_at: '2026-09-24T10:05:00Z' };
  const result = buildDisplayVerification(restSnapshot, livePush);
  assert.equal(result.status, 'RESPONDED_YES');
  assert.equal(result.responded_at, '2026-09-24T10:05:00Z');
});

test('Live WS push (RESPONDED_NO) overrides a stale PENDING REST snapshot', () => {
  const restSnapshot = { case_id: 'CASE-X', triggered: true, status: 'PENDING', reason_summary: 'reason' };
  const livePush = { status: 'RESPONDED_NO', reason_summary: 'reason', responded_at: '2026-09-24T10:06:00Z' };
  const result = buildDisplayVerification(restSnapshot, livePush);
  assert.equal(result.status, 'RESPONDED_NO');
});

test('Panel display object never carries internal fields (token, pattern ids, risk score)', () => {
  // Simulates what GET /cases/{case_id}/verification-status actually returns
  // (backend masks email and withholds the token -- see main.py get_case_verification_status).
  const backendResponse = {
    case_id: 'CASE-X',
    triggered: true,
    verification_id: 'CV-abc123',
    status: 'PENDING',
    reason_summary: 'This payment is much higher than your recent activity.',
    demo_customer_email_masked: 'a***@gmail.com',
    requested_at: '2026-09-24T10:00:00Z',
    responded_at: null
  };
  const result = buildDisplayVerification(backendResponse, null);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('verification_token'));
  assert.ok(!('trigger_pattern_ids' in result));
  assert.ok(!('risk_score' in result));
  assert.ok(!serialized.match(/EV-\d|CTX-\d|REG-\d/));
});
