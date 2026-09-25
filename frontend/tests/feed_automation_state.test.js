/**
 * SENTINEL — Real-Time Feed Automation State Consistency Test Suite
 *
 * Verifies that:
 * 1. When Automation = OFF:
 *    - ZERO automatic action execution occurs (No ACTION TAKEN by Automation Engine).
 *    - Flagged transactions requiring intervention show ACTION REQUIRED and expose human action buttons.
 *    - Unflagged routine baseline transactions show NO ACTION REQUIRED / Routine Baseline (no fake executions).
 *    - Human operator executed actions display ACTION TAKEN / Human Operator.
 * 2. When Automation = ON:
 *    - Permitted actions execute automatically and display ACTION TAKEN / ⚡ Automation Engine.
 *    - Destructive actions (FREEZE) continue to require human operator approval.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirroring the exact logic in Feed.jsx
function deriveRowState(tx, autonomyMode) {
  const dec = tx.response_decision || {};
  const rec = tx.execution_record || {};
  const rawScore = Number(tx.risk_score || 0);
  const anomalyIndicator = tx.anomaly_indicator || tx.reason || '';

  let actionCode = tx.action || rec.action_code || dec.action;
  if (!actionCode) {
    actionCode = rawScore >= 85 ? 'FREEZE' : rawScore >= 70 ? 'ESCALATE_ANALYST_REVIEW' : rawScore >= 40 ? 'ENHANCED_MONITORING' : 'MONITOR';
  }

  const accountStatus = tx.account_status || rec.resulting_account_state || 'ACTIVE';
  const isFrozen = accountStatus === 'FROZEN';
  const isFreezeAction = actionCode === 'FREEZE';
  const isHumanOperator = rec.actor_type === 'HUMAN_OPERATOR' || tx.actor_type === 'HUMAN_OPERATOR';
  const isActionExecuted = rec.execution_status === 'SUCCESS' || rec.execution_status === 'EXECUTED' || tx.action_status === 'SUCCESS' || tx.action_status === 'EXECUTED';

  // Zero automatic action execution when Automation = OFF.
  // When Automation is OFF, only actions actually executed by a human operator count as ACTION TAKEN.
  const wasActuallyActedUpon = isHumanOperator
    ? isActionExecuted
    : (autonomyMode && isActionExecuted && !isFreezeAction);

  const isRoutineTransfer = (!anomalyIndicator ||
    anomalyIndicator === 'Routine clearing · Baseline verified' ||
    anomalyIndicator === 'Normal routine transfer') && !tx.total_hops;

  const isFlagged = rawScore >= 40 ||
    isFreezeAction ||
    (actionCode && actionCode !== 'MONITOR') ||
    (tx.total_hops && tx.total_hops > 1) ||
    !isRoutineTransfer;

  if (isFreezeAction && !isFrozen) {
    return {
      statusType: 'ACTION_REQUIRED',
      button: 'Freeze',
      actor: null
    };
  } else if (wasActuallyActedUpon) {
    return {
      statusType: 'ACTION_TAKEN',
      button: null,
      actor: isHumanOperator ? 'Human Operator' : '⚡ Automation Engine'
    };
  } else if (isFlagged) {
    const buttonLabel = actionCode === 'ESCALATE_ANALYST_REVIEW' ? 'Escalate' :
      actionCode === 'ENHANCED_MONITORING' ? 'Enhanced Monitoring' :
      actionCode === 'BLOCK' ? 'Block' :
      actionCode === 'REJECT_TRANSACTION' ? 'Reject' :
      actionCode === 'FILE_STR' ? 'File STR' :
      actionCode === 'CLOSE_ACCOUNT' ? 'Close Account' : 'Monitor';

    return {
      statusType: 'ACTION_REQUIRED',
      button: buttonLabel,
      actor: null
    };
  } else {
    return {
      statusType: 'NO_ACTION_REQUIRED',
      label: 'Routine Baseline',
      button: null,
      actor: null
    };
  }
}

test('Automation OFF: High-risk flagged transaction displays ACTION REQUIRED and Escalate button', () => {
  const tx = {
    tx_id: 'TX-HIGH-01',
    risk_score: 75,
    reason: 'Abnormal transaction amount for profile',
    anomaly_indicator: 'Abnormal transaction amount for profile',
    execution_record: {
      action_code: 'ESCALATE_ANALYST_REVIEW',
      execution_status: 'NOT_EXECUTED',
      automation_mode: 'AUTOMATE_OFF'
    }
  };

  const state = deriveRowState(tx, false);
  assert.equal(state.statusType, 'ACTION_REQUIRED');
  assert.equal(state.button, 'Escalate');
  assert.equal(state.actor, null);
});

test('Automation OFF: Critical-risk transaction displays ACTION REQUIRED and Freeze button', () => {
  const tx = {
    tx_id: 'TX-CRIT-01',
    risk_score: 92,
    reason: 'Rapid high-velocity fund routing across multiple counterparties',
    anomaly_indicator: 'Rapid high-velocity fund routing across multiple counterparties',
    execution_record: {
      action_code: 'FREEZE',
      execution_status: 'REQUIRES_OPERATOR_ACTION',
      automation_mode: 'AUTOMATE_OFF'
    }
  };

  const state = deriveRowState(tx, false);
  assert.equal(state.statusType, 'ACTION_REQUIRED');
  assert.equal(state.button, 'Freeze');
  assert.equal(state.actor, null);
});

test('Automation OFF: Low-risk routine baseline transaction displays NO ACTION REQUIRED / Routine Baseline', () => {
  const tx = {
    tx_id: 'TX-ROUTINE-01',
    risk_score: 18,
    reason: 'Normal routine transfer',
    anomaly_indicator: 'Normal routine transfer',
    execution_record: {
      action_code: 'MONITOR',
      execution_status: 'NOT_EXECUTED',
      automation_mode: 'AUTOMATE_OFF'
    }
  };

  const state = deriveRowState(tx, false);
  assert.equal(state.statusType, 'NO_ACTION_REQUIRED');
  assert.equal(state.label, 'Routine Baseline');
  assert.equal(state.button, null);
  assert.equal(state.actor, null);
});

test('Automation OFF: Transactions initialized with legacy execution status NEVER display Automation Engine', () => {
  const tx = {
    tx_id: 'TX-LEGACY-01',
    risk_score: 48,
    reason: 'New beneficiary counterparty',
    anomaly_indicator: 'New beneficiary counterparty',
    execution_record: {
      action_code: 'ENHANCED_MONITORING',
      execution_status: 'SUCCESS', // Legacy or mock marked success
      actor_type: null,
      automation_mode: 'AUTOMATE_OFF'
    }
  };

  const state = deriveRowState(tx, false);
  // When Automation is OFF, non-human execution CANNOT count as ACTION TAKEN
  assert.notEqual(state.actor, '⚡ Automation Engine');
  assert.equal(state.statusType, 'ACTION_REQUIRED');
  assert.equal(state.button, 'Enhanced Monitoring');
});

test('Automation OFF: Human Operator executed action displays ACTION TAKEN / Human Operator', () => {
  const tx = {
    tx_id: 'TX-HUMAN-01',
    risk_score: 75,
    reason: 'Abnormal transaction amount for profile',
    actor_type: 'HUMAN_OPERATOR',
    execution_record: {
      action_code: 'ESCALATE_ANALYST_REVIEW',
      execution_status: 'SUCCESS',
      actor_type: 'HUMAN_OPERATOR'
    }
  };

  const state = deriveRowState(tx, false);
  assert.equal(state.statusType, 'ACTION_TAKEN');
  assert.equal(state.actor, 'Human Operator');
  assert.equal(state.button, null);
});

test('Automation ON: Permitted action executes automatically and displays ACTION TAKEN / ⚡ Automation Engine', () => {
  const tx = {
    tx_id: 'TX-AUTO-01',
    risk_score: 75,
    reason: 'Abnormal transaction amount for profile',
    execution_record: {
      action_code: 'ESCALATE_ANALYST_REVIEW',
      execution_status: 'SUCCESS',
      actor_type: 'AUTOMATION_ENGINE',
      automation_mode: 'AUTOMATE_ON'
    }
  };

  const state = deriveRowState(tx, true);
  assert.equal(state.statusType, 'ACTION_TAKEN');
  assert.equal(state.actor, '⚡ Automation Engine');
});

test('Automation ON: Destructive action (FREEZE) still requires human operator approval', () => {
  const tx = {
    tx_id: 'TX-AUTO-CRIT-01',
    risk_score: 95,
    reason: 'Rapid high-velocity fund routing',
    execution_record: {
      action_code: 'FREEZE',
      execution_status: 'REQUIRES_OPERATOR_ACTION',
      automation_mode: 'AUTOMATE_ON'
    }
  };

  const state = deriveRowState(tx, true);
  assert.equal(state.statusType, 'ACTION_REQUIRED');
  assert.equal(state.button, 'Freeze');
});
