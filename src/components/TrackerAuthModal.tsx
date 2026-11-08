import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { IndexerAuth, IndexerSite } from '../types/torrent';

interface TrackerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: IndexerSite | null;
  onSaveAuth: (siteId: string, auth: IndexerAuth) => void;
  onNotify: (msg: string) => void;
}

export const TrackerAuthModal: React.FC<TrackerAuthModalProps> = ({
  isOpen,
  onClose,
  site,
  onSaveAuth,
  onNotify,
}) => {
  if (!isOpen || !site) return null;

  const currentAuth = site.auth || {
    mode: 'guest-mirror',
    authenticated: false,
    statusMessage: 'Public Mirror / DHT Mode active',
  };

  const [activeTab, setActiveTab] = useState<'guest' | 'cookie' | 'credentials'>(
    currentAuth.mode === 'credentials'
      ? 'credentials'
      : currentAuth.mode === 'cookie'
      ? 'cookie'
      : 'guest'
  );

  const [username, setUsername] = useState(currentAuth.username || '');
  const [password, setPassword] = useState(currentAuth.password || '');
  const [cookie, setCookie] = useState(currentAuth.cookie || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyGuestMode = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/rutracker-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'guest-mirror', siteId: site.id }),
      });
      const data = await res.json();
      const newAuth: IndexerAuth = {
        mode: 'guest-mirror',
        authenticated: false,
        cookie: '',
        statusMessage: data.message || 'Public Mirror / DHT Relay active',
      };
      onSaveAuth(site.id, newAuth);
      onNotify(`${site.name}: Activated Public Mirror & DHT Relay (no login needed)`);
      onClose();
    } catch {
      const newAuth: IndexerAuth = {
        mode: 'guest-mirror',
        authenticated: false,
        cookie: '',
        statusMessage: 'Public Mirror / DHT Relay active',
      };
      onSaveAuth(site.id, newAuth);
      onNotify(`${site.name}: Public Mirror mode active`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCookie = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCookie = cookie.trim();
    if (!cleanCookie) {
      setErrorMessage('Please paste your bb_data session cookie value.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/rutracker-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'cookie',
          cookie: cleanCookie,
          siteId: site.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Verification failed');
      }
      const newAuth: IndexerAuth = {
        mode: 'cookie',
        cookie: data.cookie || cleanCookie,
        authenticated: true,
        sessionExpires: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        statusMessage: 'Authenticated via session cookie (bb_data)',
      };
      onSaveAuth(site.id, newAuth);
      onNotify(`${site.name}: Verified session cookie! Authenticated search active.`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not verify cookie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Enter your username and password.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/rutracker-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'credentials',
          username: username.trim(),
          password: password.trim(),
          siteId: site.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Login failed');
      }
      const newAuth: IndexerAuth = {
        mode: 'credentials',
        username: username.trim(),
        cookie: data.cookie,
        authenticated: true,
        sessionExpires: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        statusMessage: `Logged in as ${username.trim()}`,
      };
      onSaveAuth(site.id, newAuth);
      onNotify(`${site.name}: Authenticated as "${username.trim()}"!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRuTracker = site.id.includes('rutracker');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl border border-slate-800 bg-[#111827] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">
                  {site.name} · Authentication & Search Mode
                </h2>
                {currentAuth.authenticated ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Authenticated
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    Public Mirror / DHT Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                How to handle login requirements: choose between zero-login public mirrors or direct account access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/20">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('guest')}
              className={`py-2 px-2 rounded-md transition-colors text-center ${
                activeTab === 'guest'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Public Mirror (No Login)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cookie')}
              className={`py-2 px-2 rounded-md transition-colors text-center ${
                activeTab === 'cookie'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Session Cookie (bb_data)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`py-2 px-2 rounded-md transition-colors text-center ${
                activeTab === 'credentials'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Username & Password
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tab 1: Guest / Public Mirror Mode */}
          {activeTab === 'guest' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Recommended: Zero Setup / No Account Needed</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Don't have a {isRuTracker ? 'RuTracker' : 'Ru-Board'} account or don't want to enter your credentials? Kestrel queries public mirror endpoints, RSS mirrors, and DHT swarm crawlers directly through our backend anti-leak proxy.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-emerald-300">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">✓ Instant 1-Click Search</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">✓ No Captchas</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">✓ Dual Audio & Repacks Indexed</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">
                  Current Status: <strong className="text-slate-200">{currentAuth.statusMessage || 'Public Mirror Active'}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleApplyGuestMode}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Public Mirror Mode</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Cookie (bb_data) */}
          {activeTab === 'cookie' && (
            <form onSubmit={handleVerifyCookie} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-semibold">How to get your session cookie:</span>
                  <a
                    href={site.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[11px]"
                  >
                    <span>Open {site.name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                  <li>Log in to <code className="text-sky-300 font-mono">rutracker.org</code> in Chrome/Firefox.</li>
                  <li>Press <kbd className="px-1 py-0.2 bg-slate-800 rounded font-mono">F12</kbd> → select <strong>Application</strong> (or <strong>Storage</strong> in Firefox).</li>
                  <li>In the left sidebar click <strong>Cookies</strong> → <code className="text-sky-300 font-mono">https://rutracker.org</code>.</li>
                  <li>Double-click the value of the cookie named <code className="text-emerald-400 font-mono font-bold">bb_data</code> and copy it.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  bb_data Session Cookie Value
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-28495018-b8f9e0a1c2d3e4f5..."
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Bypasses Cloudflare captcha and origin rate limits.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Save & Verify Cookie</span>
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Credentials Login */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleLoginCredentials} className="space-y-4 text-xs">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Enter your {site.name} account credentials. Kestrel securely logs in through the backend proxy server to obtain a session token. Your credentials are only stored in your local browser storage.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Forum Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. tracker_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Forum Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Protected by anti-leak origin masking.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Log in via Proxy</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Leak Proxy Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
