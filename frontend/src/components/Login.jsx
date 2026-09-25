import React, { useState } from 'react';
import { setRoleGlobal } from '../roleStore';
import { Shield, User, KeyRound, ArrowRight } from 'lucide-react';
import FinancialNetworkAnimation from './FinancialNetworkAnimation';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulated validation delay for authentic operator feel
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        setRoleGlobal('admin');
      } else if (username === 'viewer' && password === 'viewer123') {
        setRoleGlobal('viewer');
      } else {
        setError('Invalid credentials. Access denied.');
        setLoading(false);
      }
    }, 500);
  };

  const handleQuickViewer = () => {
    setRoleGlobal('viewer');
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#05070D] flex flex-col lg:flex-row font-sans antialiased select-none">
      {/* LEFT 50%: AUTHENTICATION PANEL (Clean, centered, ~400px wide, matches screenshot) */}
      <section 
        className="w-full lg:w-1/2 h-full flex flex-col justify-center items-center px-6 sm:px-12 py-8 relative z-20 overflow-y-auto"
        aria-label="Operator Authentication Terminal"
      >
        {/* Subtle dark ambient glow behind the card */}
        <div className="absolute w-[360px] h-[360px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-[400px] p-8 sm:p-9 rounded-2xl border border-blue-500/25 bg-[#070D1E]/90 backdrop-blur-xl shadow-[0_0_50px_-10px_rgba(37,99,235,0.2)] relative overflow-hidden">
          {/* Header */}
          <header className="text-center flex flex-col items-center mb-6">
            {/* Shield Icon Badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#09152E] border border-blue-500/30 flex items-center justify-center text-[#38BDF8] shadow-inner mb-3">
              <Shield className="w-6 h-6 stroke-[1.5]" aria-hidden="true" />
            </div>
            
            {/* Live Threat Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1633] border border-blue-500/30 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
              <span className="text-[10px] font-mono tracking-widest text-[#7FD0FF] uppercase font-semibold">
                LIVE THREAT DEFENSE ENGINE
              </span>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SENTINEL
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enterprise Fraud & Financial Crime Intelligence
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label 
                htmlFor="terminal-identity" 
                className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 ml-0.5"
              >
                <User className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                Terminal Identity
              </label>
              <input 
                id="terminal-identity"
                type="text" 
                placeholder="Username (admin / viewer)" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#040814] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="access-cipher" 
                className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 ml-0.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                Access Cipher
              </label>
              <input 
                id="access-cipher"
                type="password" 
                placeholder="Password (admin123 / viewer123)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#040814] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div 
                className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs font-medium text-rose-400 text-center animate-in fade-in duration-200"
                role="alert"
              >
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 cursor-pointer mt-2 flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Authenticating...' : 'Establish Secure Link'}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>

          {/* Secondary Action & Footer */}
          <footer className="mt-5 pt-5 border-t border-slate-800/80 text-center space-y-3">
            <button 
              type="button"
              onClick={handleQuickViewer}
              className="text-xs text-[#38BDF8] hover:text-[#7FD0FF] font-medium transition-colors cursor-pointer"
            >
              Bypass with Public Viewer Access →
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>SENTINEL PROD-1.4.0 • 256-Bit Encrypted Link</span>
            </div>
          </footer>
        </div>
      </section>

      {/* RIGHT 50%: FINANCIAL NETWORK GRAPH (Clean, sparse, matches screenshot) */}
      <section 
        className="hidden lg:flex lg:w-1/2 h-full relative overflow-hidden bg-[#05070D] border-l border-slate-900/80 items-center justify-center"
        aria-label="Real-time Network Investigation & Autonomous Containment Engine"
      >
        <FinancialNetworkAnimation />
      </section>
    </div>
  );
};

export default Login;
