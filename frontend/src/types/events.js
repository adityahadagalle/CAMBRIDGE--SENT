/**
 * SENTINEL WebSocket Event Schema
 */

export const EVENT_TYPES = {
  TX_SCORED: 'tx_scored',
  CASE_UPDATED: 'case_updated',
  ACTION_TAKEN: 'action_taken',
  TRANSACTION_ACTION: 'transaction.action',
  AUTOMATION_ACTION: 'automation.action',
  AUTOMATION_MODE_CHANGED: 'automation.mode.changed',
  CUSTOMER_VERIFICATION_REQUESTED: 'customer.verification.requested',
  CUSTOMER_VERIFICATION_RESPONDED: 'customer.verification.responded'
};



/**
 * @typedef {Object} TxScoredEvent
 * @property {"tx_scored"} event
 * @property {string} tx_id
 * @property {number} risk_score
 * @property {string} case_id
 * @property {import('./index').RiskFactor[]} risk_factors
 */

/**
 * @typedef {Object} CaseUpdatedEvent
 * @property {"case_updated"} event
 * @property {string} case_id
 * @property {string} status
 * @property {number} recoverable_amount
 * @property {number} golden_window_minutes
 */

/**
 * @typedef {Object} ActionTakenEvent
 * @property {"action_taken"} event
 * @property {string} action_id
 * @property {string} case_id
 * @property {string} action_type
 * @property {string} target
 * @property {Object} api_response
 */

/**
 * @typedef {Object} CustomerVerificationRequestedEvent
 * @property {"customer.verification.requested"} event
 * @property {string} case_id
 * @property {string} verification_id
 * @property {string} reason_summary
 * @property {"PENDING"} status
 */

/**
 * @typedef {Object} CustomerVerificationRespondedEvent
 * @property {"customer.verification.responded"} event
 * @property {string} case_id
 * @property {string} verification_id
 * @property {"RESPONDED_YES"|"RESPONDED_NO"} status
 * @property {string} reason_summary
 * @property {string} responded_at
 */
