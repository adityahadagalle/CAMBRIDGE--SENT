import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import RiskBadge from '../components/RiskBadge';
import InvestigationSidebar from '../components/InvestigationSidebar';
import AutomationAuditDrawer from '../components/AutomationAuditDrawer';
import { getRole } from '../roleStore';
import { maskAccount } from '../utils/maskAccount';
import { getAnomalyIndicator } from '../utils/anomalyIndicator';
import {
  Activity, Zap, AlertTriangle, ArrowRight,
  Search, Radio, Lock, X, CheckCircle2,
  Network, Play, Pause
} from 'lucide-react';

// Realistic stream transaction generator obeying payment-rail limits
const CHANNELS = ['UPI', 'IMPS', 'NEFT', 'CARD'];
const USERS = [
  'ACC-USR-1082', 'ACC-USR-3190', 'ACC-USR-5812', 'ACC-USR-7401', 'ACC-USR-9923',
  'ACC-TREASURY-01', 'ACC-CORP-4819', 'ACC-DISB-7210', 'ACC-PAYROLL-55'
];
const COUNTERPARTIES = [
  'ACC-MERCH-4912', 'ACC-MULE-8831', 'ACC-BEN-2204', 'ACC-EXIT-9102', 'ACC-VENDOR-631',
  'ACC-SETTLE-1102', 'ACC-RETAIL-4019', 'ACC-ESCROW-891'
];
const HIGH_RISK_REASONS = [
  'High velocity in 1 hour',
  'Rapid fan-out structuring pattern',
  'Mule account velocity spike',
  'Abnormal transaction amount for profile',
  'High-risk transfer hops observed'
];
const MED_RISK_REASONS = [
  'Elevated volume outside business hours',
  'New beneficiary counterparty',
  'First transfer to unverified VPA',
  'High transaction frequency in 24 hours'
];

function generateStreamTransaction(seq, isAutomationOn = false) {
  const channel = CHANNELS[seq % CHANNELS.length];
  const sender = USERS[(seq * 3) % USERS.length];
  const receiver = COUNTERPARTIES[(seq * 7 + 2) % COUNTERPARTIES.length];

  let amt;
  if (channel === 'UPI') {
    amt = Math.min(100000, 500 + ((seq * 3727) % 99000));
  } else if (channel === 'NEFT') {
    amt = Math.min(2500000, 10000 + ((seq * 93821) % 1840000));
  } else if (channel === 'IMPS') {
    amt = Math.min(500000, 2000 + ((seq * 41903) % 430000));
  } else {
    amt = Math.min(200000, 500 + ((seq * 19283) % 185000));
  }

  let riskScore = 15 + ((seq * 13) % 25);
  let reason = 'Normal routine transfer';
  if (seq % 8 === 0) {
    riskScore = 72 + ((seq * 7) % 24);
    reason = HIGH_RISK_REASONS[seq % HIGH_RISK_REASONS.length];
  } else if (seq % 4 === 0) {
    riskScore = 42 + ((seq * 5) % 24);
    reason = MED_RISK_REASONS[seq % MED_RISK_REASONS.length];
  }

  const actionCode = riskScore >= 85 ? 'FREEZE' : riskScore >= 70 ? 'ESCALATE_ANALYST_REVIEW' : riskScore >= 40 ? 'ENHANCED_MONITORING' : 'MONITOR';

  // Zero automatic action execution when Automation is OFF.
  // When Automation is ON: permitted non-freeze actions execute automatically.
  const isAutomatedExecution = Boolean(isAutomationOn) && actionCode !== 'FREEZE';

  const executionRecord = isAutomatedExecution ? {
    action_code: actionCode,
    execution_status: 'SUCCESS',
    resulting_account_state: 'ACTIVE',
    actor_type: 'AUTOMATION_ENGINE',
    actor_id: 'SENTINEL_AUTOMATION_SERVICE',
    automation_mode: 'AUTOMATE_ON'
  } : {
    action_code: actionCode,
    execution_status: actionCode === 'FREEZE' ? 'REQUIRES_OPERATOR_ACTION' : 'NOT_EXECUTED',
    resulting_account_state: 'ACTIVE',
    actor_type: null,
    actor_id: null,
    automation_mode: isAutomationOn ? 'AUTOMATE_ON' : 'AUTOMATE_OFF'
  };

  const responseDecision = {
    action: actionCode,
    action_status: isAutomatedExecution ? 'SUCCESS' : (actionCode === 'FREEZE' ? 'REQUIRES_HUMAN_APPROVAL' : 'RECOMMENDED'),
    requires_human_approval: !isAutomatedExecution,
    automated: isAutomatedExecution
  };

  return {
    tx_id: `TX-${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sender_account: sender,
    receiver_account: receiver,
    amount: amt,
    currency: 'INR',
    channel: channel,
    risk_score: riskScore,
    reason: reason,
    anomaly_indicator: reason,
    account_status: 'ACTIVE',
    response_decision: responseDecision,
    execution_record: executionRecord
  };
}

const INITIAL_STREAM_TRANSACTIONS = Array.from({ length: 15 }, (_, i) => {
  const tx = generateStreamTransaction(i + 1, false);
  const pastMs = (15 - i) * 45000;
  tx.timestamp = new Date(Date.now() - pastMs).toISOString();
  return tx;
});

const Feed = () => {
  const navigate = useNavigate();
  const { transactions: wsTransactions, cases, actions } = useWebSocket();
  const [activeTransactions, setActiveTransactions] = useState(INITIAL_STREAM_TRANSACTIONS);
  const [selectedTxRate, setSelectedTxRate] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const streamTimerRef = useRef(null);
  const streamSeqRef = useRef(16);

  const [sidebarState, setSidebarState] = useState({ isOpen: false, tx: null, case: null });
  const [selectedAuditTx, setSelectedAuditTx] = useState(null);
  const [newTxIds, setNewTxIds] = useState(new Set());
  const [freezingTxIds, setFreezingTxIds] = useState(new Set());
  const [freezeModalState, setFreezeModalState] = useState({ isOpen: false, tx: null });
  const [actionModalState, setActionModalState] = useState({ isOpen: false, tx: null, actionCode: '' });
  const [executingActionTxIds, setExecutingActionTxIds] = useState(new Set());
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autonomyMode, setAutonomyMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const previousTxIdsRef = useRef(new Set());
  const role = getRole();

  // ── Sync incoming WebSocket transactions ─────────────────────────────────────
  useEffect(() => {
    if (!wsTransactions || wsTransactions.length === 0) return;
    setActiveTransactions(prev => {
      const existingIds = new Set(prev.map(t => t.tx_id));
      const newItems = wsTransactions.filter(t => !existingIds.has(t.tx_id));
      if (newItems.length === 0) return prev;
      return [...newItems, ...prev].slice(0, 300);
    });
  }, [wsTransactions]);

  // ── Stream timer linked to selectedTxRate and isPaused ───────────────────────
  useEffect(() => {
    if (isPaused) {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      return;
    }

    const intervalMs = Math.round(60000 / selectedTxRate);
    streamTimerRef.current = setInterval(() => {
      const nextTx = generateStreamTransaction(streamSeqRef.current++, autonomyMode);
      setActiveTransactions(prev => [nextTx, ...prev].slice(0, 300));
      setNewTxIds(prev => new Set([...prev, nextTx.tx_id]));
      setTimeout(() => {
        setNewTxIds(prev => {
          const n = new Set(prev);
          n.delete(nextTx.tx_id);
          return n;
        });
      }, 1800);
    }, intervalMs);

    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [selectedTxRate, isPaused, autonomyMode]);

  // Rate change handler: changing rate while paused does NOT resume
  const handleRateChange = (newRate) => {
    setSelectedTxRate(newRate);
  };

  // ── Autonomy mode sync ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/automation-mode')
      .then(r => r.json())
      .then(d => { if (d?.automate_mode !== undefined) setAutonomyMode(Boolean(d.automate_mode)); })
      .catch(() => {});
    const h = (e) => { if (e.detail?.automate_mode !== undefined) setAutonomyMode(Boolean(e.detail.automate_mode)); };
    window.addEventListener('sentinel_automation_mode_changed', h);
    return () => window.removeEventListener('sentinel_automation_mode_changed', h);
  }, []);

  // ── New-tx flash ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTransactions.length === 0) return;
    const currentIds = new Set(activeTransactions.map(t => t.tx_id));
    const newlyArrived = new Set();
    currentIds.forEach(id => { if (!previousTxIdsRef.current.has(id)) newlyArrived.add(id); });
    if (newlyArrived.size > 0 && previousTxIdsRef.current.size > 0) {
      setNewTxIds(prev => new Set([...prev, ...newlyArrived]));
      const timer = setTimeout(() => {
        setNewTxIds(prev => { const n = new Set(prev); newlyArrived.forEach(id => n.delete(id)); return n; });
      }, 2000);
      return () => clearTimeout(timer);
    }
    previousTxIdsRef.current = currentIds;
  }, [activeTransactions]);

  // ── KPI Telemetry Metrics ────────────────────────────────────────────────────
  const calculatedVelocity = useMemo(() => {
    if (isPaused) return 0;
    const now = Date.now();
    const recent = activeTransactions.filter(tx => {
      const t = new Date(tx.timestamp).getTime();
      return !isNaN(t) && (now - t) <= 60000;
    });
    if (recent.length >= 3) {
      const times = recent.map(t => new Date(t.timestamp).getTime()).sort((a, b) => a - b);
      const spanSec = Math.max(1, (times[times.length - 1] - times[0]) / 1000);
      const measuredRate = Math.round((recent.length / spanSec) * 60);
      return Math.min(Math.max(measuredRate, Math.round(selectedTxRate * 0.92)), Math.round(selectedTxRate * 1.08));
    }
    return selectedTxRate;
  }, [activeTransactions, selectedTxRate, isPaused]);

  const totalAtRiskAmount = useMemo(() => {
    const caseTotal = cases.reduce((sum, c) => sum + (c.total_fraud_amount || 0), 0);
    const txRiskTotal = activeTransactions
      .filter(tx => (tx.risk_score || 0) >= 70)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return caseTotal + txRiskTotal;
  }, [cases, activeTransactions]);

  // ── Freeze action handlers ───────────────────────────────────────────────────
  const handleOpenFreezeModal = (e, tx) => {
    e.stopPropagation();
    setFreezeModalState({ isOpen: true, tx });
  };

  const handleCloseFreezeModal = () => {
    setFreezeModalState({ isOpen: false, tx: null });
  };

  const handleConfirmFreeze = async () => {
    const tx = freezeModalState.tx;
    if (!tx) return;
    const caseId = tx.case_id || 'CASE-SYSTEM';
    const txId = tx.tx_id;
    setFreezingTxIds(prev => new Set([...prev, txId]));
    handleCloseFreezeModal();

    try {
      let res;
      try {
        res = await fetch(`/cases/${caseId}/transactions/${txId}/freeze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_id: 'OPERATOR_ADMIN', reason: 'Operator executed account freeze' })
        });
      } catch {
        res = await fetch(`http://localhost:8000/cases/${caseId}/transactions/${txId}/freeze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_id: 'OPERATOR_ADMIN', reason: 'Operator executed account freeze' })
        });
      }
      let execRec = {};
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        execRec = data.execution_record || data.execution_result || {};
      }
      tx.account_status = 'FROZEN';
      tx.actor_type = 'HUMAN_OPERATOR';
      tx.execution_record = {
        ...execRec,
        action_code: 'FREEZE',
        execution_status: 'SUCCESS',
        resulting_account_state: 'FROZEN',
        actor_type: 'HUMAN_OPERATOR',
        actor_id: 'OPERATOR_ADMIN'
      };
      setActiveTransactions(prev => prev.map(t => t.tx_id === txId ? { ...t, account_status: 'FROZEN', actor_type: 'HUMAN_OPERATOR', execution_record: tx.execution_record } : t));
      window.dispatchEvent(new CustomEvent('sentinel_transaction_action', {
        detail: {
          transaction_id: txId,
          tx_id: txId,
          account_id: tx.sender_account,
          action: 'FREEZE',
          action_status: 'SUCCESS',
          actor_type: 'HUMAN_OPERATOR',
          execution_record: tx.execution_record
        }
      }));
    } catch (err) {
      console.error('Freeze execution failed:', err);
    } finally {
      setFreezingTxIds(prev => { const n = new Set(prev); n.delete(txId); return n; });
    }
  };

  // ── Manual action handlers ───────────────────────────────────────────────────
  const handleManualAction = async (e, tx, actionCode) => {
    e.stopPropagation();
    const consequential = ['BLOCK', 'REJECT_TRANSACTION', 'FILE_STR', 'CLOSE_ACCOUNT'];
    if (consequential.includes(actionCode)) {
      setActionModalState({ isOpen: true, tx, actionCode });
    } else {
      await executeManualAction(tx, actionCode);
    }
  };

  const executeManualAction = async (tx, actionCode) => {
    if (!tx) return;
    const txId = tx.tx_id;
    const caseId = tx.case_id || 'CASE-SYSTEM';
    setExecutingActionTxIds(prev => new Set([...prev, txId]));
    setActionModalState({ isOpen: false, tx: null, actionCode: '' });

    const endpointMap = {
      MONITOR: '/action/monitor',
      ENHANCED_MONITORING: '/action/enhanced_monitoring',
      MARK_FALSE_POSITIVE: '/action/close_fp',
      ESCALATE_ANALYST_REVIEW: '/action/flag',
      BLOCK: '/action/block',
      REJECT_TRANSACTION: '/action/reject',
      FILE_STR: '/action/file_str',
      CLOSE_ACCOUNT: '/action/close_account'
    };
    const endpoint = endpointMap[actionCode] || '/action/monitor';

    try {
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_id: caseId, target_id: txId, account_id: tx.sender_account, operator_id: 'HUMAN_OPERATOR' })
        });
      } catch {
        res = await fetch(`http://localhost:8000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_id: caseId, target_id: txId, account_id: tx.sender_account, operator_id: 'HUMAN_OPERATOR' })
        });
      }
      let execRec = {};
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        execRec = data.execution_record || data.execution_result || {};
      }
      tx.execution_record = {
        ...execRec,
        action_code: actionCode,
        execution_status: 'SUCCESS',
        actor_type: 'HUMAN_OPERATOR',
        actor_id: 'HUMAN_OPERATOR'
      };
      tx.action = actionCode;
      tx.actor_type = 'HUMAN_OPERATOR';
      setActiveTransactions(prev => prev.map(t => t.tx_id === txId ? { ...t, action: actionCode, actor_type: 'HUMAN_OPERATOR', execution_record: tx.execution_record } : t));
      window.dispatchEvent(new CustomEvent('sentinel_transaction_action', {
        detail: {
          transaction_id: txId,
          tx_id: txId,
          account_id: tx.sender_account,
          risk_score: tx.risk_score,
          action: actionCode,
          action_status: 'SUCCESS',
          actor_type: 'HUMAN_OPERATOR',
          execution_record: tx.execution_record
        }
      }));
    } catch (err) {
      console.error('Manual action failed:', err);
    } finally {
      setExecutingActionTxIds(prev => { const n = new Set(prev); n.delete(txId); return n; });
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--:--';
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? String(isoString).slice(0, 8) : d.toLocaleTimeString('en-IN', { hour12: false });
  };

  // ── Row visual styling matching friend's design ──────────────────────────────
  const getRowClass = (tx) => {
    const isNew = newTxIds.has(tx.tx_id);
    const score = Number(tx.risk_score || 0);
    const baseClass = 'cursor-pointer transition-colors duration-150 border-b border-border/40 hover:bg-muted/40 ';

    if (isNew) {
      return baseClass + 'bg-sky-500/10 border-l-2 border-l-sky-500 animate-pulse';
    }
    if (score >= 85) {
      return baseClass + 'border-l-2 border-l-rose-500 bg-rose-500/10';
    }
    if (score >= 70) {
      return baseClass + 'border-l-2 border-l-orange-500 bg-orange-500/5';
    }
    if (score >= 40) {
      return baseClass + 'border-l-2 border-l-amber-500/50';
    }

    return baseClass + 'border-l-2 border-l-transparent';
  };

  // ── Filtered + sorted transactions ───────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return [...activeTransactions]
      .filter(tx => {
        if (channelFilter !== 'ALL' && tx.channel !== channelFilter) return false;
        const score = tx.risk_score || 0;
        if (riskFilter === 'CRITICAL' && score < 85) return false;
        if (riskFilter === 'HIGH' && score < 70) return false;
        if (riskFilter === 'FLAGGED' && score < 40 && !tx.reason) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchId = (tx.tx_id || '').toLowerCase().includes(q);
          const matchSender = (tx.sender_account || '').toLowerCase().includes(q);
          const matchReceiver = (tx.receiver_account || '').toLowerCase().includes(q);
          const indicator = getAnomalyIndicator(tx).toLowerCase();
          const matchReason = (tx.reason || '').toLowerCase().includes(q) || indicator.includes(q);
          if (!matchId && !matchSender && !matchReceiver && !matchReason) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 150);
  }, [activeTransactions, channelFilter, riskFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [channelFilter, riskFilter, searchQuery]);

  const totalFilteredCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const startIdx = totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalFilteredCount);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handleTxClick = (tx) => {
    const relatedCase = cases.find(c => c.case_id === tx.case_id);
    const relatedActions = actions.filter(a => a.case_id === tx.case_id);
    setSidebarState({ isOpen: true, tx, case: relatedCase, actions: relatedActions });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden font-sans">

      {/* ══════ 1. TOP HEADER / KPI BAR (WITH TX RATE SELECTOR) ══════ */}
      <header className="px-8 py-5 border-b border-border/80 bg-card/60 backdrop-blur-md shrink-0">
        <div className="max-w-[1720px] w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 font-sans">
                Live Transaction Stream
              </h1>
              <button
                type="button"
                onClick={() => setIsPaused(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
                title={isPaused ? "Stream is paused. Click to resume." : "Stream is active. Click to pause."}
              >
                {isPaused ? (
                  <>
                    <Play className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>PAUSED</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>STREAMING</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Real-time payment scoring and anomaly evaluation pipeline
            </p>
          </div>

          {/* KPI Cards & TX Rate Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* TX Rate Selector & Stream Controls */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-xl border border-border/60">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">TX RATE</span>
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60">
                {[10, 20, 30, 40, 50, 100].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleRateChange(rate)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      selectedTxRate === rate
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {rate}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border/60" />
              <button
                type="button"
                onClick={() => setIsPaused(prev => !prev)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all border ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-muted/40 text-slate-300 border-border/60 hover:text-white hover:bg-slate-800/60'
                }`}
                title={isPaused ? "Resume transaction streaming" : "Pause transaction streaming"}
              >
                {isPaused ? <Play className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> : <Pause className="w-2.5 h-2.5 fill-slate-300 text-slate-300" />}
                <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
              </button>
            </div>

            {/* Throughput Card */}
            <div className="px-4 py-2 bg-muted/30 rounded-xl border border-border/60 min-w-[130px]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Throughput</span>
              <span className="text-lg font-mono font-bold text-slate-100">
                {selectedTxRate} <span className="text-xs text-slate-400 font-sans font-normal">tx/min</span>
              </span>
            </div>

            {/* Velocity Card */}
            <div className="px-4 py-2 bg-muted/30 rounded-xl border border-border/60 min-w-[140px]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-400 fill-sky-400/20" />
                Velocity
              </span>
              <span className="text-lg font-mono font-bold text-sky-400">
                {calculatedVelocity} <span className="text-xs text-slate-400 font-sans font-normal">tx/min</span>
              </span>
            </div>

            {/* At Risk Flagged Card */}
            <div className="px-4 py-2 bg-muted/30 rounded-xl border border-border/60 min-w-[160px]">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                At Risk Flagged
              </span>
              <span className="text-lg font-mono font-bold text-rose-400">
                ₹{totalAtRiskAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ══════ 2. MAIN TABLE CONTAINER ══════ */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-[1720px] w-full mx-auto space-y-4">

          {/* Controls & Filter Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/80 bg-card/80 backdrop-blur-md shadow-lg flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Channel Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2">Channel</span>
                {['ALL', 'UPI', 'IMPS', 'NEFT', 'CARD'].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
                      channelFilter === ch
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2">Severity</span>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'CRITICAL', label: 'Crit ≥85' },
                  { id: 'HIGH', label: 'High ≥70' },
                  { id: 'FLAGGED', label: 'Flagged' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRiskFilter(r.id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
                      riskFilter === r.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Row Count */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search account, TX ID, indicator..."
                  className="bg-muted/30 border border-border/60 hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/40 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 w-64 transition-all focus:outline-none"
                />
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono text-slate-300 font-semibold tabular-nums shrink-0">
                {filteredTransactions.length} <span className="text-slate-500 font-normal">Rows</span>
              </div>
            </div>
          </div>

          {/* Main Transaction Stream Table */}
          {filteredTransactions.length > 0 ? (
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1450px]">
                  <thead>
                    <tr className="bg-muted/60 text-[11px] uppercase tracking-wider font-semibold text-slate-400 border-b border-border/80 select-none">
                      <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Tx ID</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap min-w-[90px]">Time</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap min-w-[85px]">Channel</th>
                      <th className="py-3 px-4 whitespace-nowrap min-w-[210px]">Sender → Receiver</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap min-w-[110px]">Amount</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap min-w-[130px]">Risk Score</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap min-w-[200px]">Execution Status / Controls</th>
                      <th className="py-3 px-4 text-left whitespace-nowrap min-w-[300px]">Anomaly Indicator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((tx) => {
                      const dec = tx.response_decision || {};
                      const rec = tx.execution_record || {};
                      const rawScore = Number(tx.risk_score || 0);
                      const anomalyIndicator = getAnomalyIndicator(tx);

                      let actionCode = tx.action || rec.action_code || dec.action;
                      if (!actionCode) {
                        actionCode = rawScore >= 85 ? 'FREEZE' : rawScore >= 70 ? 'ESCALATE_ANALYST_REVIEW' : rawScore >= 40 ? 'ENHANCED_MONITORING' : 'MONITOR';
                      }
                      const actionText = actionCode.replace(/_/g, ' ');

                      const accountStatus = tx.account_status || rec.resulting_account_state || 'ACTIVE';
                      const isFrozen = accountStatus === 'FROZEN';
                      const isFreezeAction = actionCode === 'FREEZE';
                      const isFreezing = freezingTxIds.has(tx.tx_id);
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

                      return (
                        <tr
                          key={tx.tx_id}
                          onClick={() => handleTxClick(tx)}
                          className={getRowClass(tx)}
                        >
                          {/* TX ID */}
                          <td className="py-3.5 px-4 font-mono text-[14px] font-semibold text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{role === 'admin' ? tx.tx_id : '••••••••'}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const effCase = tx.case_id || 'CASE-' + String(tx.tx_id || '').slice(-8);
                                  navigate(`/graph/${effCase}?tx=${tx.tx_id}`);
                                }}
                                className="p-1 rounded bg-[#0A1628] border border-[#1E2E4A] hover:border-sky-400 text-sky-400 hover:text-white transition-all shadow-sm"
                                title="Investigate in Graph"
                              >
                                <Network className="w-3 h-3" />
                              </button>
                            </div>
                            {tx.total_hops && tx.total_hops > 1 && (
                              <div
                                title={`Pattern: ${tx.pattern_type || 'MULTI-HOP'} | Chain: ${tx.chain_id} | Hop ${tx.hop_number || 1}/${tx.total_hops}`}
                                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[10px] font-mono text-amber-300 font-bold"
                              >
                                <span>🔗 {tx.total_hops}-HOP CHAIN</span>
                              </div>
                            )}
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-4 text-center font-mono text-[14px] text-slate-400">
                            {formatTime(tx.timestamp)}
                          </td>

                          {/* Channel */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 uppercase">
                              {tx.channel || 'UPI'}
                            </span>
                          </td>

                          {/* Sender → Receiver */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 text-[14px] font-mono">
                              <span className="text-sky-400 font-medium truncate max-w-[100px]" title={tx.sender_account}>
                                {role === 'admin' ? tx.sender_account : maskAccount(tx.sender_account)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-sky-400 font-medium truncate max-w-[100px]" title={tx.receiver_account}>
                                {role === 'admin' ? tx.receiver_account : maskAccount(tx.receiver_account)}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-mono text-base font-semibold text-slate-100">
                            ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Risk Score */}
                          <td className="py-3.5 px-4 text-center">
                            <RiskBadge score={tx.risk_score} className="!text-[14px]" labelClassName="!text-[10px]" />
                          </td>

                          {/* Execution Status / Controls */}
                          <td className="py-3.5 px-4 text-center">
                            {isFreezeAction && !isFrozen ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                                  ACTION REQUIRED
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenFreezeModal(e, tx)}
                                  disabled={isFreezing}
                                  title="Operator approval required — account will be frozen."
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[14px] font-mono font-bold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-md shadow-rose-950/60 transition-all border border-rose-400/30 hover:border-rose-400/60 disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>{isFreezing ? 'FREEZING...' : 'Freeze'}</span>
                                </button>
                              </div>
                            ) : wasActuallyActedUpon ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span
                                  className={`text-[11px] font-mono font-extrabold px-2.5 py-0.5 rounded border uppercase ${
                                    isHumanOperator
                                      ? 'bg-purple-950/90 text-purple-300 border-purple-600/80'
                                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80'
                                  }`}
                                >
                                  ACTION TAKEN
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-medium">
                                  {isHumanOperator ? 'Human Operator' : '⚡ Automation Engine'}
                                </span>
                              </div>
                            ) : isFlagged ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                                  ACTION REQUIRED
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleManualAction(e, tx, actionCode)}
                                  disabled={executingActionTxIds.has(tx.tx_id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[14px] font-mono font-bold text-white shadow-md transition-all select-none ${
                                    actionCode === 'BLOCK' ? 'bg-rose-700 hover:bg-rose-600' :
                                    actionCode === 'REJECT_TRANSACTION' ? 'bg-rose-800 hover:bg-rose-700' :
                                    actionCode === 'FILE_STR' ? 'bg-purple-600 hover:bg-purple-500' :
                                    actionCode === 'CLOSE_ACCOUNT' ? 'bg-rose-900 hover:bg-rose-800' :
                                    actionCode === 'ESCALATE_ANALYST_REVIEW' ? 'bg-amber-600 hover:bg-amber-500' :
                                    actionCode === 'ENHANCED_MONITORING' ? 'bg-sky-700 hover:bg-sky-600' :
                                    actionCode === 'MARK_FALSE_POSITIVE' ? 'bg-slate-700 hover:bg-slate-600' :
                                    'bg-sky-600 hover:bg-sky-500'
                                  }`}
                                >
                                  <span>
                                    {executingActionTxIds.has(tx.tx_id)
                                      ? 'EXECUTING...'
                                      : actionCode === 'ESCALATE_ANALYST_REVIEW'
                                      ? 'Escalate'
                                      : actionCode === 'ENHANCED_MONITORING'
                                      ? 'Enhanced Monitoring'
                                      : actionCode === 'MARK_FALSE_POSITIVE'
                                      ? 'Mark False Positive'
                                      : actionCode === 'REJECT_TRANSACTION'
                                      ? 'Reject'
                                      : actionCode === 'CLOSE_ACCOUNT'
                                      ? 'Close Account'
                                      : actionCode === 'BLOCK'
                                      ? 'Block'
                                      : actionCode === 'FILE_STR'
                                      ? 'File STR'
                                      : 'Monitor'}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-slate-900/60 text-slate-400 border-slate-700/60 uppercase tracking-wider">
                                  NO ACTION REQUIRED
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 font-medium">
                                  Routine Baseline
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Anomaly Indicator (CRITICAL REQUIREMENT PRESERVED) */}
                          <td className="py-3.5 px-4 min-w-[300px]">
                            {anomalyIndicator && anomalyIndicator !== 'Routine clearing · Baseline verified' ? (
                              <span
                                className={`text-[14px] font-mono font-medium leading-relaxed whitespace-normal break-words max-w-[350px] block ${
                                  rawScore >= 85
                                    ? 'text-rose-400 font-semibold'
                                    : rawScore >= 70
                                    ? 'text-orange-400'
                                    : rawScore >= 40
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                                }`}
                                title={anomalyIndicator}
                              >
                                {anomalyIndicator}
                              </span>
                            ) : (
                              <span className="text-[14px] text-slate-500 italic font-mono" title={anomalyIndicator}>
                                Routine clearing · Baseline verified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-t border-border/80 text-xs font-mono text-slate-400 select-none flex-wrap gap-3">
                <div>
                  Showing <span className="text-slate-200 font-semibold">{startIdx}</span> to <span className="text-slate-200 font-semibold">{endIdx}</span> of <span className="text-slate-200 font-semibold">{totalFilteredCount}</span> transactions
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-mono"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg border text-xs font-mono transition-all ${
                          currentPage === page
                            ? 'bg-primary text-white border-primary font-bold shadow-sm'
                            : 'bg-slate-800/60 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-mono"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Professional Empty State matching friend's design */
            <div className="flex flex-col items-center justify-center p-16 border border-dashed border-border/80 rounded-2xl bg-card/40 text-center max-w-xl mx-auto my-12 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 shadow-inner">
                <Activity className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight mb-1">
                Waiting for incoming transactions...
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-4">
                The real-time fraud monitoring pipeline is active and scanning payment channels.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Listening on WebSocket live stream
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ FREEZE CONFIRMATION MODAL ══════ */}
      {freezeModalState.isOpen && freezeModalState.tx && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans relative">
            <button onClick={handleCloseFreezeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wide">Confirm Account Freeze</h3>
                <p className="text-xs text-slate-400 font-sans">Human Operator Authorization Required</p>
              </div>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-slate-400">Transaction ID:</span><span className="text-slate-100 font-bold">{freezeModalState.tx.tx_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Account:</span><span className="text-sky-300 font-bold">{freezeModalState.tx.sender_account}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Risk Score:</span><span className="text-rose-400 font-bold">{freezeModalState.tx.risk_score}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Policy Action:</span><span className="text-rose-300 font-bold">FREEZE ACCOUNT</span></div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Reason:</span>
                <span className="text-slate-300 text-xs">{getAnomalyIndicator(freezeModalState.tx)}</span>
              </div>
            </div>
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-2.5 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-semibold text-[11px]">Warning: This action will restrict account activity.</span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={handleCloseFreezeModal} className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700">Cancel</button>
              <button
                onClick={handleConfirmFreeze}
                disabled={freezingTxIds.has(freezeModalState.tx.tx_id)}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{freezingTxIds.has(freezeModalState.tx.tx_id) ? 'FREEZING...' : 'Confirm Freeze'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CONSEQUENTIAL ACTION CONFIRMATION MODAL ══════ */}
      {actionModalState.isOpen && actionModalState.tx && (
        <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans relative">
            <button onClick={() => setActionModalState({ isOpen: false, tx: null, actionCode: '' })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wide">Confirm Manual Action</h3>
                <p className="text-xs text-slate-400 font-sans">Human Operator Authorization Required</p>
              </div>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-slate-400">Action:</span><span className="text-amber-400 font-bold uppercase">{actionModalState.actionCode.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Transaction ID:</span><span className="text-slate-100 font-bold">{actionModalState.tx.tx_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Account:</span><span className="text-sky-300 font-bold">{actionModalState.tx.sender_account}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Risk Score:</span><span className="text-rose-400 font-bold">{actionModalState.tx.risk_score}</span></div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Policy Rationale:</span>
                <span className="text-slate-300 text-xs">{getAnomalyIndicator(actionModalState.tx)}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setActionModalState({ isOpen: false, tx: null, actionCode: '' })} className="px-4 py-2 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700">Cancel</button>
              <button
                onClick={() => executeManualAction(actionModalState.tx, actionModalState.actionCode)}
                disabled={executingActionTxIds.has(actionModalState.tx.tx_id)}
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg flex items-center gap-2"
              >
                <span>{executingActionTxIds.has(actionModalState.tx.tx_id) ? 'EXECUTING...' : `Confirm ${actionModalState.actionCode.replace(/_/g, ' ')}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ INVESTIGATION SIDEBAR ══════ */}
      <InvestigationSidebar
        isOpen={sidebarState.isOpen}
        selectedTransaction={sidebarState.tx}
        selectedCase={sidebarState.case}
        actions={sidebarState.actions}
        onClose={() => setSidebarState({ isOpen: false, tx: null, case: null })}
        role={role}
      />

      {/* ══════ AUTOMATION AUDIT DRAWER ══════ */}
      <AutomationAuditDrawer
        auditData={selectedAuditTx}
        onClose={() => setSelectedAuditTx(null)}
      />
    </div>
  );
};

export default Feed;
