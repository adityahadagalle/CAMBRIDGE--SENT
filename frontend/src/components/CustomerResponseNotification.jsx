import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { useWebSocket, dismissNotification } from '../hooks/useWebSocket';

/**
 * Persistent in-app notification stack for customer verification responses
 * received while the associated account is FROZEN. Purely informational --
 * clicking a button navigates the analyst to the case for a manual decision;
 * nothing here ever freezes or releases an account itself.
 */
const CustomerResponseNotification = () => {
  const { notifications } = useWebSocket();
  const navigate = useNavigate();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 w-[360px] font-sans">
      {notifications.slice(0, 3).map((n) => (
        <div
          key={n.id}
          className="bg-[#0B132B] border border-violet-500/40 rounded-xl shadow-2xl p-4 space-y-2.5 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">🔔</span>
              <span className="text-xs font-mono font-bold text-violet-300 uppercase tracking-wider">
                Customer Confirmation Received
              </span>
            </div>
            <button
              onClick={() => dismissNotification(n.id)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 space-y-1">
            <div>Case: <span className="text-slate-200 font-semibold">{n.case_id}</span></div>
            <div className="flex items-center gap-1.5">
              Customer response:
              {n.decision === 'RESPONDED_YES' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ThumbsUp className="w-3 h-3" /> YES — CUSTOMER_AUTHORIZED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <ThumbsDown className="w-3 h-3" /> NO — CUSTOMER_NOT_AUTHORIZED
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Lock className="w-3 h-3" /> Current status: FROZEN BY ANALYST
            </div>
          </div>

          <p className="text-[11px] text-slate-300">
            Customer has confirmed this payment. Human review required before any release.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                dismissNotification(n.id);
                navigate(`/cases?case=${encodeURIComponent(n.case_id)}`);
              }}
              className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-[#1E293B] hover:bg-[#334155] text-slate-200"
            >
              VIEW CASE
            </button>
            <button
              onClick={() => {
                dismissNotification(n.id);
                navigate(`/cases?case=${encodeURIComponent(n.case_id)}&review=release`);
              }}
              className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-violet-600 hover:bg-violet-500 text-white"
            >
              REVIEW & RELEASE
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomerResponseNotification;
