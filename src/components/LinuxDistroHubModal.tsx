import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Globe,
  HardDrive,
  Monitor,
  Search,
  ShieldCheck,
  Terminal,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  VERIFIED_LINUX_DISTROS,
  VerifiedLinuxDistro,
} from '../data/verifiedLinuxDistros';
import { DownloadTargetMode, TorrentItem } from '../types/torrent';

interface LinuxDistroHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDownload: (torrent: TorrentItem, mode: DownloadTargetMode) => void;
  onNotify: (msg: string) => void;
}

export const LinuxDistroHubModal: React.FC<LinuxDistroHubModalProps> = ({
  isOpen,
  onClose,
  onStartDownload,
  onNotify,
}) => {
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHashDistroId, setCopiedHashDistroId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDistros = VERIFIED_LINUX_DISTROS.filter((distro) => {
    if (filterFamily !== 'all' && distro.family !== filterFamily) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      distro.name.toLowerCase().includes(q) ||
      distro.tagline.toLowerCase().includes(q) ||
      distro.description.toLowerCase().includes(q) ||
      distro.edition.toLowerCase().includes(q) ||
      distro.version.toLowerCase().includes(q)
    );
  });

  const handleCopySha256 = (distro: VerifiedLinuxDistro) => {
    navigator.clipboard.writeText(distro.sha256);
    setCopiedHashDistroId(distro.id);
    onNotify(`Copied verified SHA-256 hash for ${distro.name}`);
    setTimeout(() => {
      setCopiedHashDistroId((prev) => (prev === distro.id ? null : prev));
    }, 2000);
  };

  const handleCopyMagnet = (distro: VerifiedLinuxDistro) => {
    navigator.clipboard.writeText(distro.magnetUri);
    onNotify(`Copied official magnet URI for ${distro.name}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-800 bg-[#111827] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">
                  Verified Linux & FOSS Distribution Hub
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  SHA-256 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official release torrents with cryptographic checksums, high-seed swarms, and HTTP WebSeeds.
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

        {/* Toolbar & Filter */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/20 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search distros by name, kernel, or desktop environment..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Distros' },
              { id: 'debian', label: 'Debian / Ubuntu' },
              { id: 'arch', label: 'Arch' },
              { id: 'fedora', label: 'Fedora' },
              { id: 'nixos', label: 'NixOS' },
              { id: 'hypervisor', label: 'Hypervisors' },
              { id: 'security', label: 'Security / Tails' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterFamily(f.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterFamily === f.id
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distro Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDistros.map((distro) => {
            const hasCopied = copiedHashDistroId === distro.id;
            return (
              <div
                key={distro.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-base">
                          {distro.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${distro.accentColor}`}>
                          {distro.version}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">
                        {distro.edition} · {distro.architecture}
                      </div>
                    </div>

                    <a
                      href={distro.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Official download page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {distro.tagline}
                  </p>

                  {/* Telemetry / Swarm Info */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                    <span className="text-slate-200 font-semibold">
                      {distro.sizeFormatted}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-medium">
                      {distro.seeders} seeders
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-400 flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      WebSeed Active
                    </span>
                  </div>

                  {/* SHA-256 Box */}
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-[11px] font-mono">
                    <div className="truncate text-slate-400">
                      <span className="text-slate-500 mr-1 select-none">SHA256:</span>
                      <span className="text-slate-300">{distro.sha256}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopySha256(distro)}
                      className="p-1 text-slate-400 hover:text-sky-400 transition-colors shrink-0 cursor-pointer"
                      title="Copy SHA-256 hash"
                    >
                      {hasCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyMagnet(distro)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Magnet</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onStartDownload(distro.torrentItem, 'device-client');
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Send magnet to local client (qBittorrent / Deluge)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Device Client</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onStartDownload(distro.torrentItem, 'web-client');
                        onClose();
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Download or inspect in browser via WebTorrent"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>WebTorrent</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {filteredDistros.length} verified official Linux & FOSS torrent releases
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
