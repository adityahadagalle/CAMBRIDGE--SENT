import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DatabaseZap, 
  Radio, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Activity, 
  Info,
  Cpu,
  Share2,
  ShieldAlert,
  Binary
} from 'lucide-react';

import { 
  TOTAL_DATASET_RECORDS,
  getSyntheticTransaction 
} from '../data/syntheticGovernmentData';

// Mapping from internal channel enum to normal payment methods (UI presentation only)
const PAYMENT_METHOD_MAP = {
  'PFMS_DBT': 'UPI',
  'TREASURY_RTGS': 'NEFT',
  'NEFT_GOV': 'NET BANKING',
  'STATE_DISB_PORTAL': 'CARD'
};

// Simulated Organization API Client (Frontend Only)
// Simulates an authorized organization API endpoint: GET /api/transactions
const simulateOrganizationAPI = {
  endpoint: 'GET /api/transactions',
  getTransaction(index) {
    const tx = getSyntheticTransaction(index);
    return {
      transactionId: tx.raw_tx_id || `ORG-TX-${String(index).padStart(4, '0')}`,
      sourceAccount: tx.sender_account,
      beneficiaryAccount: tx.receiver_account,
      amount: tx.amount,
      transactionTimestamp: tx.timestamp,
      time: tx.time,
      channel: tx.channel,
      paymentMethod: tx.payment_method || PAYMENT_METHOD_MAP[tx.channel] || 'UPI',
      sentinelTxId: tx.tx_id
    };
  }
};

const REPRESENTATIVE_MAPPINGS = [
  { from: 'transactionId', to: 'transaction_id', delay: '0s' },
  { from: 'amount', to: 'transaction_amount', delay: '0.6s' },
  { from: 'channel', to: 'payment_channel', delay: '1.2s' }
];

const DataIntegration = () => {
  const navigate = useNavigate();
  // Connection Handshake State: 'DISCONNECTED' | 'REQUESTING' | 'RESPONDING' | 'AUTHENTICATING' | 'CONNECTED'
  const [apiConnectionState, setApiConnectionState] = useState('DISCONNECTED');
  const [handshakePacketPos, setHandshakePacketPos] = useState(0); // 0 = idle, 1 = outbound, 2 = inbound, 3 = locked

  // Analysis Pipeline Initialization: 'OFFLINE' | 'INIT_TRANSACTION' | 'INIT_RISK' | 'INIT_ML' | 'INIT_GRAPH' | 'LIVE'
  const [analysisState, setAnalysisState] = useState('OFFLINE');

  // Stream State Machine: 'IDLE' | 'DATASET_READY' | 'CONNECTED' | 'INGESTION_READY' | 'STREAMING' | 'PAUSED' | 'COMPLETE'
  const [streamState, setStreamState] = useState('DATASET_READY');
  const [receivedCount, setReceivedCount] = useState(0);
  const [streamedTransactions, setStreamedTransactions] = useState([]);
  const [streamSpeed, setStreamSpeed] = useState('5x');
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Timers and counters
  const timerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const countRef = useRef(0);

  // Cinematic API Connection Handshake Sequence
  // Phase A: Request packet travels from Org to Sentinel (GET /api/transactions)
  // Phase B: Response packet travels back from Sentinel to Org (200 OK)
  // Phase C: Authentication & Channel Lock
  const handleConnectAPI = () => {
    if (apiConnectionState === 'CONNECTED') {
      handleReset();
      return;
    }

    // Phase A: Outbound Request (Org -> Sentinel)
    setApiConnectionState('REQUESTING');
    setHandshakePacketPos(1);

    setTimeout(() => {
      // Phase B: Inbound Response (Sentinel -> Org: 200 OK)
      setApiConnectionState('RESPONDING');
      setHandshakePacketPos(2);
    }, 450);

    setTimeout(() => {
      // Phase C: Authenticating
      setApiConnectionState('AUTHENTICATING');
      setHandshakePacketPos(3);
    }, 850);

    setTimeout(() => {
      // Phase D: Connection Lock Established
      setApiConnectionState('CONNECTED');
      setStreamState((prev) => (prev === 'DATASET_READY' || prev === 'IDLE' ? 'INGESTION_READY' : prev));
    }, 1250);
  };

  // Start Transaction Stream & Initialize Analysis Pipeline
  const handleStartStream = () => {
    if (apiConnectionState !== 'CONNECTED') {
      handleConnectAPI();
      setTimeout(() => {
        initAnalysisAndStream();
      }, 1300);
      return;
    }

    if (streamState === 'COMPLETE') {
      countRef.current = 0;
      setReceivedCount(0);
      setStreamedTransactions([]);
      setDurationSeconds(0);
      initAnalysisAndStream();
      return;
    }

    if (streamState === 'PAUSED') {
      handleResumeStream();
      return;
    }

    if (analysisState === 'LIVE') {
      setStreamState('STREAMING');
      return;
    }

    initAnalysisAndStream();
  };

  const initAnalysisAndStream = () => {
    setStreamState('STREAMING');
    setAnalysisState('INIT_TRANSACTION');

    setTimeout(() => {
      setAnalysisState('INIT_RISK');
    }, 400);

    setTimeout(() => {
      setAnalysisState('INIT_ML');
    }, 800);

    setTimeout(() => {
      setAnalysisState('INIT_GRAPH');
    }, 1200);

    setTimeout(() => {
      setAnalysisState('LIVE');
    }, 1600);
  };

  // Pause Stream - immediately halts additions and freezes animations
  const handlePauseStream = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setStreamState('PAUSED');
  };

  // Resume Stream - continues from exactly the next transaction without restarting
  const handleResumeStream = () => {
    setStreamState('STREAMING');
  };

  // Reset Everything to Initial Dataset-Ready State
  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    countRef.current = 0;
    setApiConnectionState('DISCONNECTED');
    setHandshakePacketPos(0);
    setAnalysisState('OFFLINE');
    setStreamState('DATASET_READY');
    setReceivedCount(0);
    setStreamedTransactions([]);
    setDurationSeconds(0);
  };

  // Fast Forward helper
  const handleFastForward = () => {
    if (apiConnectionState !== 'CONNECTED') {
      setApiConnectionState('CONNECTED');
    }
    setAnalysisState('LIVE');

    const wasPaused = streamState === 'PAUSED';
    const finalCount = TOTAL_DATASET_RECORDS;
    countRef.current = finalCount;
    setReceivedCount(finalCount);

    const allRecords = [];
    for (let i = finalCount; i >= 1; i--) {
      allRecords.push(simulateOrganizationAPI.getTransaction(i));
    }

    setStreamedTransactions(allRecords);
    if (durationSeconds === 0) {
      setDurationSeconds(16);
    }

    // Preserve paused state if fast-forward is triggered while paused
    if (wasPaused) {
      setStreamState('PAUSED');
    } else {
      setStreamState('COMPLETE');
    }
  };

  // Stream interval timer
  useEffect(() => {
    if (streamState === 'STREAMING') {
      const intervalMs = streamSpeed === '10x' ? 60 : streamSpeed === '5x' ? 200 : 700;

      timerRef.current = setInterval(() => {
        if (countRef.current >= TOTAL_DATASET_RECORDS) {
          setStreamState('COMPLETE');
          return;
        }

        countRef.current += 1;
        const currentIdx = countRef.current;
        const nextTx = simulateOrganizationAPI.getTransaction(currentIdx);

        setReceivedCount(currentIdx);
        setStreamedTransactions((prevList) => {
          // Strictly prevent any duplicate entries
          if (prevList.length > 0 && prevList[0].sentinelTxId === nextTx.sentinelTxId) {
            return prevList;
          }
          return [nextTx, ...prevList];
        });

        if (currentIdx >= TOTAL_DATASET_RECORDS) {
          setStreamState('COMPLETE');
        }
      }, intervalMs);

      durationTimerRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);

    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [streamState, streamSpeed]);

  // Derived progress percentage
  const progressPercent = ((receivedCount / TOTAL_DATASET_RECORDS) * 100).toFixed(1);

  const isConnected = apiConnectionState === 'CONNECTED';
  const isConnecting = apiConnectionState === 'REQUESTING' || apiConnectionState === 'RESPONDING' || apiConnectionState === 'AUTHENTICATING';
  const isStreaming = streamState === 'STREAMING';
  const isPaused = streamState === 'PAUSED';
  const isComplete = streamState === 'COMPLETE';
  const isInitializing = analysisState !== 'OFFLINE' && analysisState !== 'LIVE';
  const streamStatus = streamState; // alias for compatibility

  // Dynamic particle speed duration linked to streamSpeed controls
  const particleFlowDuration = streamSpeed === '10x' ? '0.35s' : streamSpeed === '5x' ? '0.8s' : '2.0s';
  const animPlayState = isPaused ? 'paused' : 'running';

  return (
    <div className={`min-h-full bg-[#060D1A] text-slate-100 p-3 sm:p-4 lg:p-5 space-y-4 ${isPaused ? 'stream-paused' : ''}`}>
      
      {/* Scoped CSS animations for enterprise flow */}
      <style>{`
        @keyframes conduitBeam {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes packetTravelForward {
          0% { left: 0%; opacity: 0; transform: translateY(-50%) scale(0.7); }
          20% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          80% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          100% { left: 100%; opacity: 0; transform: translateY(-50%) scale(0.7); }
        }
        @keyframes packetTravelReverse {
          0% { left: 100%; opacity: 0; transform: translateY(-50%) scale(0.7); }
          20% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          80% { opacity: 1; transform: translateY(-50%) scale(1.15); }
          100% { left: 0%; opacity: 0; transform: translateY(-50%) scale(0.7); }
        }
        @keyframes rowSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes arrivalGlow {
          0% {
            background-color: rgba(6, 182, 212, 0.22);
            border-color: rgba(6, 182, 212, 0.55);
          }
          100% {
            background-color: rgba(15, 23, 42, 0.45);
            border-color: rgba(30, 41, 59, 0.8);
          }
        }
        @keyframes gatewayPortalPulse {
          0%, 100% { border-color: rgba(30, 41, 59, 0.9); box-shadow: 0 0 0 rgba(16, 185, 129, 0); }
          50% { border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 0 16px rgba(16, 185, 129, 0.25); }
        }
        @keyframes pulseEngineNode {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.35); }
        }
        @keyframes graphNodeGlow {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 10px #10b981; }
        }
        @keyframes completionWave {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .animate-conduit-flow {
          animation: conduitBeam linear infinite;
        }
        .animate-packet-forward {
          animation: packetTravelForward ease-in-out infinite;
        }
        .animate-packet-reverse {
          animation: packetTravelReverse ease-in-out infinite;
        }
        .animate-row-enter {
          animation: rowSlideIn 0.22s ease-out forwards;
        }
        .animate-arrival-glow {
          animation: arrivalGlow 0.65s ease-out forwards;
        }
        .animate-gateway-portal {
          animation: gatewayPortalPulse 2.2s infinite ease-in-out;
        }
        .animate-engine-pulse {
          animation: pulseEngineNode 1.2s infinite ease-in-out;
        }
        .animate-graph-node {
          animation: graphNodeGlow 1.8s infinite ease-in-out;
        }
        .animate-completion-wave {
          animation: completionWave 1.4s ease-out;
        }

        .stream-paused,
        .stream-paused * {
          animation-play-state: paused !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-conduit-flow, .animate-packet-forward, .animate-packet-reverse,
          .animate-row-enter, .animate-arrival-glow, .animate-gateway-portal,
          .animate-engine-pulse, .animate-graph-node, .animate-completion-wave,
          .animate-ping, .animate-pulse {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. TOP HEADER & STATUS BAR                                   */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/feed');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-mono font-bold tracking-wider transition-all duration-150 shadow-sm cursor-pointer mr-1"
              title="Return to previous page"
            >
              <span>← BACK</span>
            </button>
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <DatabaseZap className="w-4 h-4" />
            </div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white">
              Data Integration
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
              DEMONSTRATION MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect an organization's transaction system to SENTINEL
          </p>
        </div>

        {/* Right Header Status & Reset */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border flex items-center gap-1.5 transition-all ${
            isComplete
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 animate-completion-wave'
              : isStreaming
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
              : isInitializing
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              : isConnected
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              : isConnecting
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
            {isInitializing && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
            {isConnected && !isStreaming && !isComplete && !isInitializing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            <span>
              {isComplete
                ? 'COMPLETE'
                : isStreaming
                ? 'SENTINEL LIVE'
                : isInitializing
                ? 'INITIALIZING PIPELINE...'
                : streamStatus === 'PAUSED'
                ? 'PAUSED'
                : isConnected
                ? 'CONNECTED'
                : isConnecting
                ? apiConnectionState
                : 'OFFLINE'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-all"
            title="Reset simulation state"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ADVANCED MULTI-STAGE DATA CONDUIT RIBBON                  */}
      {/* ============================================================ */}
      <div className={`bg-[#0B1120] border border-slate-800/80 rounded-lg p-2.5 shadow-sm transition-all ${
        isComplete ? 'animate-completion-wave' : ''
      }`}>
        <div className="flex items-center justify-between text-xs font-mono gap-1 overflow-x-auto">
          
          {/* ① SOURCE */}
          <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-blue-950/30 text-blue-300 border border-blue-600/30">
            <span className="font-bold">① SOURCE</span>
            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
          </div>

          {/* Conduit 1 -> 2: SOURCE to CONNECT (Blue Packet) */}
          <div className="flex-1 min-w-[20px] h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
            {isConnected && (
              <>
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-conduit-flow"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-packet-forward"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState, animationDelay: '0s' }}
                />
              </>
            )}
          </div>

          {/* ② CONNECT */}
          <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded border transition-all ${
            isConnected
              ? 'bg-blue-950/30 text-blue-300 border-blue-600/30'
              : isConnecting
              ? 'bg-amber-950/30 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/60 text-slate-500 border-slate-800'
          }`}>
            <span className="font-bold">② CONNECT</span>
            {isConnected ? (
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
            ) : isConnecting ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            ) : null}
          </div>

          {/* Conduit 2 -> 3: CONNECT to MAP (Purple Packet) */}
          <div className="flex-1 min-w-[20px] h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
            {isConnected && (
              <>
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-conduit-flow"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] animate-packet-forward"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState, animationDelay: '0.2s' }}
                />
              </>
            )}
          </div>

          {/* ③ MAP */}
          <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded border transition-all ${
            isConnected
              ? 'bg-indigo-950/30 text-indigo-300 border-indigo-600/30'
              : 'bg-slate-900/60 text-slate-500 border-slate-800'
          }`}>
            <span className="font-bold">③ MAP</span>
            {isConnected && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
          </div>

          {/* Conduit 3 -> 4: MAP to INGEST (Cyan Packet) */}
          <div className="flex-1 min-w-[20px] h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
            {isConnected && (
              <>
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-conduit-flow"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8] animate-packet-forward"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState, animationDelay: '0.4s' }}
                />
              </>
            )}
          </div>

          {/* ④ INGEST */}
          <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded border transition-all ${
            isConnected
              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-600/30'
              : 'bg-slate-900/60 text-slate-500 border-slate-800'
          }`}>
            <span className="font-bold">④ INGEST</span>
            {isConnected && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
          </div>

          {/* Conduit 4 -> 5: INGEST to ENGINE (Amber & Emerald) */}
          <div className="flex-1 min-w-[20px] h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
            {(isStreaming || isInitializing) && (
              <>
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-conduit-flow"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399] animate-packet-forward"
                  style={{ animationDuration: particleFlowDuration, animationPlayState: animPlayState, animationDelay: '0.6s' }}
                />
              </>
            )}
          </div>

          {/* ⑤ STREAM */}
          <div className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded border transition-all ${
            isComplete
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500'
              : isStreaming
              ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
              : 'bg-slate-900/60 text-slate-500 border-slate-800'
          }`}>
            <span className="font-bold">⑤ STREAM</span>
            {isComplete ? (
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
            ) : isStreaming ? (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            ) : null}
          </div>

        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. COMPACT 4-CARD INTEGRATION FLOW WITH BIDIRECTIONAL HANDSHAKE */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* CARD 1: ORGANIZATION SYSTEM */}
        <div className={`bg-[#0B1120] border rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 transition-all ${
          isConnecting ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-slate-800/90'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase">
                ORGANIZATION SYSTEM
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                isConnected
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isConnected ? '● ACTIVE PRODUCER' : '● OFFLINE / DISCONNECTED'}
              </span>
            </div>
            <div className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <span>5,000 synthetic transactions</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={handleConnectAPI}
              disabled={isConnecting}
              className={`w-full py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isConnected
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  : isConnecting
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>{isConnected ? 'API CONNECTED ✓' : isConnecting ? 'CONNECTING...' : 'CONNECT TO API'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: AUTHORIZED API (BIDIRECTIONAL HANDSHAKE SIMULATION) */}
        <div className={`bg-[#0B1120] border rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 transition-all ${
          isConnected ? 'border-blue-600/30' : 'border-slate-800/90'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase">
                AUTHORIZED API
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                SIMULATED API
              </span>
            </div>
            
            {/* Visual Bidirectional Handshake Corridor */}
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Request:</span>
                <span className={`transition-all font-semibold ${handshakePacketPos >= 1 ? 'text-cyan-300' : 'text-slate-600'}`}>
                  GET /api/transactions
                </span>
              </div>

              {/* Handshake line animation showing actual bidirectional exchange */}
              <div className="h-1 bg-slate-800 rounded-full relative overflow-hidden">
                {apiConnectionState === 'REQUESTING' && (
                  <div className="absolute top-0 bottom-0 w-2.5 bg-cyan-400 rounded-full shadow-[0_0_6px_#38bdf8] animate-packet-forward" style={{ animationDuration: '0.45s' }} />
                )}
                {apiConnectionState === 'RESPONDING' && (
                  <div className="absolute top-0 bottom-0 w-2.5 bg-emerald-400 rounded-full shadow-[0_0_6px_#34d399] animate-packet-reverse" style={{ animationDuration: '0.45s' }} />
                )}
                {isConnected && (
                  <div className="absolute inset-0 bg-emerald-500/40" />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Response:</span>
                <span className={`transition-all font-bold ${isConnected || handshakePacketPos >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {isConnected || handshakePacketPos >= 2 ? '200 OK (Authorized)' : 'Awaiting Request'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Channel Lock:</span>
            <span className={isConnected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isConnected ? 'LOCKED & SYNCED ✓' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* CARD 3: VALIDATION + MAPPING (SEQUENCED FIELD NORMALIZATION) */}
        <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase">
                FIELD MAPPING
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition-all ${
                isConnected ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500'
              }`}>
                {isConnected ? 'SCHEMA VALIDATED ✓' : 'AWAITING SYNC'}
              </span>
            </div>

            {/* 3 Representative Mappings with Sequential Field Normalization Beam */}
            <div className="font-mono text-[10px] space-y-0.5 text-slate-300">
              {REPRESENTATIVE_MAPPINGS.map((m) => (
                <div 
                  key={m.from} 
                  className={`flex items-center justify-between py-0.5 px-1 rounded transition-all ${
                    isConnected ? 'hover:bg-slate-900/60' : ''
                  }`}
                >
                  <span className={`transition-all ${isConnected ? 'text-slate-300' : 'text-slate-500'}`}>{m.from}</span>
                  <span 
                    className={`font-bold px-1 transition-all ${
                      isConnected ? 'text-cyan-400 animate-conduit-flow' : 'text-slate-600'
                    }`}
                    style={{ animationDuration: '1.8s', animationDelay: m.delay }}
                  >
                    &rarr;
                  </span>
                  <span className={`font-semibold transition-all ${isConnected ? 'text-emerald-300' : 'text-slate-600'}`}>{m.to}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">RAW &rarr; NORMALIZED</span>
            <span className="text-emerald-400 font-semibold">6 FIELDS TOTAL</span>
          </div>
        </div>

        {/* CARD 4: SENTINEL INGESTION GATEWAY */}
        <div className={`bg-[#0B1120] border rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 transition-all ${
          isStreaming 
            ? 'animate-gateway-portal border-emerald-500/50' 
            : isConnected 
            ? 'border-blue-600/30' 
            : 'border-slate-800/90'
        }`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase">
                INGESTION GATE
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                isStreaming
                  ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
                  : isPaused
                  ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30'
                  : isConnected 
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-slate-500'
              }`}>
                {isStreaming ? 'GATEWAY ACTIVE' : isPaused ? 'GATEWAY PAUSED' : isConnected ? 'STATUS: READY' : 'STANDBY'}
              </span>
            </div>

            <div className="text-[10px] text-slate-400">
              External &rarr; Normalization Boundary &rarr; SENTINEL Engine
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={
                !isConnected
                  ? handleStartStream
                  : isStreaming
                  ? handlePauseStream
                  : isPaused
                  ? handleResumeStream
                  : handleStartStream
              }
              disabled={!isConnected}
              className={`w-full py-1.5 rounded-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                !isConnected
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
                  : isStreaming
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3 h-3 fill-white" />
                  <span>PAUSE STREAM</span>
                </>
              ) : isPaused ? (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>RESUME STREAM</span>
                </>
              ) : isComplete ? (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>RE-STREAM</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>START TRANSACTION STREAM</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 4. SENTINEL ANALYSIS ENGINE STARTUP & MULTI-STAGE TELEMETRY  */}
      {/* ============================================================ */}
      <div className={`bg-[#0B1120] border rounded-xl p-3.5 space-y-2.5 transition-all ${
        analysisState === 'LIVE' ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/10' : 'border-slate-800/90'
      }`}>
        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px]">
              ANALYSIS PIPELINE — SIMULATED STARTUP
            </span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
            analysisState === 'LIVE'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : analysisState !== 'OFFLINE'
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-500'
          }`}>
            {analysisState === 'LIVE' ? '● ENGINES ACTIVE & SYNCED' : analysisState !== 'OFFLINE' ? 'INITIALIZING STAGES...' : 'ENGINES STANDBY'}
          </span>
        </div>

        {/* 4 Engine Modules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          
          {/* Module 1: Transaction Engine */}
          <div className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
            analysisState === 'LIVE' || analysisState === 'INIT_RISK' || analysisState === 'INIT_ML' || analysisState === 'INIT_GRAPH'
              ? 'bg-blue-950/20 border-blue-500/40 text-blue-200'
              : analysisState === 'INIT_TRANSACTION'
              ? 'bg-blue-900/30 border-blue-400 text-blue-300 animate-engine-pulse'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">Transaction Engine</span>
            </div>
            {analysisState !== 'OFFLINE' && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
          </div>

          {/* Module 2: Risk Engine */}
          <div className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
            analysisState === 'LIVE' || analysisState === 'INIT_ML' || analysisState === 'INIT_GRAPH'
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
              : analysisState === 'INIT_RISK'
              ? 'bg-amber-900/30 border-amber-400 text-amber-300 animate-engine-pulse'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">Risk Engine</span>
            </div>
            {(analysisState === 'LIVE' || analysisState === 'INIT_ML' || analysisState === 'INIT_GRAPH') && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
          </div>

          {/* Module 3: ML Analysis (Features -> Model -> Risk Signal) */}
          <div className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
            analysisState === 'LIVE' || analysisState === 'INIT_GRAPH'
              ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
              : analysisState === 'INIT_ML'
              ? 'bg-purple-900/30 border-purple-400 text-purple-300 animate-engine-pulse'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px]">ML Analysis</span>
            </div>
            {(analysisState === 'LIVE' || analysisState === 'INIT_GRAPH') && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
          </div>

          {/* Module 4: Graph Analysis (Network Nodes) */}
          <div className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
            analysisState === 'LIVE'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : analysisState === 'INIT_GRAPH'
              ? 'bg-emerald-900/30 border-emerald-400 text-emerald-300 animate-engine-pulse'
              : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Graph Analysis</span>
            </div>
            {analysisState === 'LIVE' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-graph-node" />
            ) : (
              <span className="text-[10px] text-slate-600">●──●</span>
            )}
          </div>

        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. HERO LIVE TRANSACTION STREAM (VISUAL FOCUS & MOTION)      */}
      {/* ============================================================ */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-lg space-y-3">
        
        {/* Stream Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                TRANSACTION STREAM
              </h3>
              {isStreaming && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              )}
            </div>
            <div className="text-xs font-mono text-cyan-300 font-semibold mt-0.5">
              Received: <span className="text-white font-bold">{receivedCount.toLocaleString()}</span> / {TOTAL_DATASET_RECORDS.toLocaleString()}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Speed Multipliers */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-xs font-mono">
              {['1x', '5x', '10x'].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setStreamSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    streamSpeed === spd
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>

            {/* Play/Pause/Resume */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handlePauseStream}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm shadow-amber-500/20"
              >
                <Pause className="w-3 h-3 fill-white" />
                <span>Pause</span>
              </button>
            ) : isPaused ? (
              <button
                type="button"
                onClick={handleResumeStream}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm shadow-emerald-500/20"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartStream}
                disabled={!isConnected}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
                  !isConnected
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                }`}
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{isComplete ? 'Re-stream' : 'Stream'}</span>
              </button>
            )}

            {/* Fast-Forward */}
            {!isComplete && (
              <button
                type="button"
                onClick={handleFastForward}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all"
                title="Fast forward all 5,000 transactions"
              >
                <FastForward className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline text-[11px]">Fast-Forward</span>
              </button>
            )}

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-all"
              title="Reset stream"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Progress Bar with glowing leading edge */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 relative">
          <div 
            className={`h-full transition-all duration-200 rounded-full relative ${
              isComplete
                ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Glowing leading edge light beam */}
            {!isComplete && (
              <div 
                className="absolute right-0 top-0 bottom-0 w-3 bg-white opacity-80 blur-[2px] shadow-[0_0_8px_#38bdf8]"
                style={{ animationPlayState: animPlayState }}
              />
            )}
          </div>
        </div>

        {/* Completion Banner */}
        {isComplete && (
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs animate-row-enter animate-completion-wave">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="font-bold text-emerald-300 text-xs">
                TRANSACTION STREAM COMPLETE · 5,000 / 5,000 TRANSACTIONS RECEIVED
              </div>
            </div>
            <div className="font-mono text-xs text-slate-400">
              Elapsed: <strong className="text-slate-200">{durationSeconds}s</strong>
            </div>
          </div>
        )}

        {/* Stream Table */}
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            {/* Table Column Headers */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800">
              <div className="col-span-3">TRANSACTION ID</div>
              <div className="col-span-3">SOURCE / ACCOUNT</div>
              <div className="col-span-2 text-right">AMOUNT</div>
              <div className="col-span-2 text-center">METHOD</div>
              <div className="col-span-2 text-right">TIME</div>
            </div>

            {/* Transaction Rows Container */}
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 mt-1">
              {streamedTransactions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg mt-2">
                  {!isConnected ? (
                    <p>Click <strong className="text-blue-400">CONNECT TO API</strong> above to initialize the simulated connection.</p>
                  ) : (
                    <p>Click <strong className="text-emerald-400">START TRANSACTION STREAM</strong> to initialize the analysis pipeline and begin streaming transactions.</p>
                  )}
                </div>
              ) : (
                streamedTransactions.map((tx, idx) => (
                  <div
                    key={tx.sentinelTxId}
                    className={`grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg border transition-all text-xs font-mono ${
                      idx === 0
                        ? 'animate-row-enter animate-arrival-glow shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/30'
                    }`}
                  >
                    {/* 1. TRANSACTION ID */}
                    <div className={`col-span-3 font-bold truncate ${idx === 0 ? 'text-white' : 'text-cyan-300'}`}>
                      {tx.sentinelTxId}
                    </div>

                    {/* 2. SOURCE / ACCOUNT */}
                    <div className="col-span-3 text-slate-300 truncate" title={tx.sourceAccount}>
                      {tx.sourceAccount}
                    </div>

                    {/* 3. AMOUNT */}
                    <div className="col-span-2 text-right font-bold text-white whitespace-nowrap">
                      ₹{tx.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>

                    {/* 4. METHOD */}
                    <div className="col-span-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/90 text-slate-200 border border-slate-700/80 inline-block">
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {/* 5. TIME */}
                    <div className="col-span-2 text-right text-slate-400 font-mono text-[11px]">
                      {tx.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 6. CONCISE PRODUCTION & REGULATORY SPECIFICATIONS            */}
      {/* ============================================================ */}
      <div className="bg-[#0B1120] border border-slate-800/80 rounded-lg p-3 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] block">
              DEMONSTRATION MODE & PAYMENT RAIL SPECIFICATIONS
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              SYNTHETIC DATASET · 5,000 RECORDS
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            This page simulates an authorized organization API using synthetic transaction data. In production, the simulated source can be replaced by an organization's authorized API, secure transaction stream, or approved system connector.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 pt-1.5 text-[10px] text-slate-400 border-t border-slate-800/60 font-mono">
            <div>• <strong className="text-slate-300">UPI:</strong> UPI demo transactions use the standard ₹1 lakh P2P ceiling. Certain permitted UPI categories may have higher NPCI limits.</div>
            <div>• <strong className="text-slate-300">NEFT:</strong> NEFT has no RBI-imposed transaction ceiling; participating banks may apply their own limits.</div>
            <div>• <strong className="text-slate-300">NET BANKING:</strong> Transaction amounts reflect institution- and account-profile specific transaction thresholds.</div>
            <div>• <strong className="text-slate-300">CARD:</strong> Retail/commercial payment card amounts are governed by cardholder credit limits and issuing bank parameters.</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DataIntegration;
