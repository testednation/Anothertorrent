import React, { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  Download,
  ExternalLink,
  Trash2,
  Film,
  FileText,
  HardDrive,
  Copy,
  Check,
  Radio,
  Users,
  FolderOpen,
  Link2,
  Link2Off,
  Globe2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Gauge,
  Percent,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { DeviceClientConfig, TorrentFileEntry, TransferSession } from '../types/torrent';
import { formatBytes } from '../data/defaultIndexers';
import {
  exportTorrentManifestFile,
  savePayloadFileToDisk,
  stripMagnetProtocol,
  triggerDeviceClientDownload,
} from '../services/torrentEngine';
import { PeerWorldMap } from './PeerWorldMap';
import { resolvePeerGeo } from '../services/peerGeoResolver';
import { SwarmHealthSparkline } from './SwarmHealthSparkline';
import { FileExtensionIcon, getFileExtensionMeta } from './FileExtensionIcon';
import { isSwarmStallRisk } from '../services/swarmHealth';

export type TransferSortField = 'speed' | 'progress' | 'startedAt';
export type TransferSortDirection = 'desc' | 'asc';

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch {
    return '';
  }
}

interface TransferWorkspaceProps {
  transfers: TransferSession[];
  selectedTransferId: string | null;
  onSelectTransfer: (id: string) => void;
  onTogglePause: (id: string) => void;
  onRemoveTransfer: (id: string) => void;
  onToggleFileSelection: (transferId: string, fileIndex: number) => void;
  deviceConfig: DeviceClientConfig;
  onNotify: (message: string) => void;
}

export const TransferWorkspace: React.FC<TransferWorkspaceProps> = ({
  transfers,
  selectedTransferId,
  onSelectTransfer,
  onTogglePause,
  onRemoveTransfer,
  onToggleFileSelection,
  deviceConfig,
  onNotify,
}) => {
  const [inspectorTab, setInspectorTab] = useState<'files' | 'stream' | 'peers' | 'trackers'>('files');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stripProtocol, setStripProtocol] = useState<boolean>(Boolean(deviceConfig.stripMagnetProtocol));
  const [peersViewMode, setPeersViewMode] = useState<'both' | 'map' | 'table'>('both');

  // Transfer queue sorting state
  const [sortBy, setSortBy] = useState<TransferSortField>('speed');
  const [sortDirection, setSortDirection] = useState<TransferSortDirection>('desc');

  const handleSortFieldClick = (field: TransferSortField) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedTransfers = useMemo(() => {
    return [...transfers].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'speed') {
        comparison =
          b.downloadSpeedBytes - a.downloadSpeedBytes ||
          b.uploadSpeedBytes - a.uploadSpeedBytes;
      } else if (sortBy === 'progress') {
        comparison = b.progress - a.progress;
      } else if (sortBy === 'startedAt') {
        const timeA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const timeB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        comparison = timeB - timeA;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });
  }, [transfers, sortBy, sortDirection]);

  const activeTransfer =
    sortedTransfers.find((t) => t.id === selectedTransferId) || sortedTransfers[0] || null;

  const handleCopyMagnet = (magnet: string, infoHash: string, id: string) => {
    const payload = stripProtocol ? infoHash : magnet;
    navigator.clipboard.writeText(payload);
    setCopiedId(id);
    onNotify(
      stripProtocol
        ? 'Copied raw BTIH InfoHash (Magnet protocol stripped)'
        : 'Magnet URI copied to clipboard'
    );
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleLaunchDevice = async (session: TransferSession) => {
    const res = await triggerDeviceClientDownload(session.torrent, deviceConfig);
    onNotify(`Launched in ${res.method}`);
  };

  const streamableFile: TorrentFileEntry | undefined = activeTransfer?.files.find(
    (f) => f.type === 'video' || Boolean(f.streamUrl)
  );

  if (transfers.length === 0) {
    return (
      <div className="border border-slate-800 bg-[#111827] rounded-xl p-12 text-center">
        <div className="w-12 h-12 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-4 text-sky-400">
          <HardDrive className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-2">
          No Active Transfers
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Select any torrent from the search index to download or stream directly in the browser via WebTorrent, or hand off to your device torrent client.
        </p>
      </div>
    );
  }

  const getSortDirectionLabel = () => {
    if (sortBy === 'speed') {
      return sortDirection === 'desc' ? 'Fastest first' : 'Slowest first';
    }
    if (sortBy === 'progress') {
      return sortDirection === 'desc' ? 'Highest first' : 'Lowest first';
    }
    return sortDirection === 'desc' ? 'Newest first' : 'Oldest first';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Active Transfer Queue */}
      <div className="lg:col-span-5 border border-slate-800 bg-[#111827] rounded-xl overflow-hidden">
        {/* Queue Header & Sort Controls */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Transfer Queue</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {transfers.length} {transfers.length === 1 ? 'session' : 'sessions'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                {formatBytes(
                  transfers.reduce((acc, t) => acc + t.downloadSpeedBytes, 0)
                )}
                /s aggregate
              </p>
            </div>

            {/* Direction toggle button */}
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
              title={`Current sort direction: ${getSortDirectionLabel()}. Click to reverse order.`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/70 hover:border-sky-500/50 hover:bg-slate-700/60 text-slate-200 transition-colors text-xs shrink-0 cursor-pointer"
            >
              {sortDirection === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-mono text-[11px] text-slate-300">
                {getSortDirectionLabel()}
              </span>
            </button>
          </div>

          {/* Sort Criteria Selector */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-sky-400" />
                <span>Sort by:</span>
              </span>
              <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSortFieldClick('speed')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    sortBy === 'speed'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Sort by current download speed"
                >
                  <Gauge className="w-3 h-3" />
                  <span>Speed</span>
                  {sortBy === 'speed' && (
                    <span className="text-[10px] text-sky-400 font-mono">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortFieldClick('progress')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    sortBy === 'progress'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Sort by download progress percentage"
                >
                  <Percent className="w-3 h-3" />
                  <span>Progress</span>
                  {sortBy === 'progress' && (
                    <span className="text-[10px] text-sky-400 font-mono">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSortFieldClick('startedAt')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    sortBy === 'startedAt'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Sort by transfer start time"
                >
                  <Clock className="w-3 h-3" />
                  <span>Start Time</span>
                  {sortBy === 'startedAt' && (
                    <span className="text-[10px] text-sky-400 font-mono">
                      {sortDirection === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Sorted by{' '}
              <span className="text-slate-300">
                {sortBy === 'speed'
                  ? 'Speed'
                  : sortBy === 'progress'
                  ? 'Progress'
                  : 'Start Time'}
              </span>{' '}
              ({sortDirection.toUpperCase()})
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
          {sortedTransfers.map((item) => {
            const isSelected = activeTransfer?.id === item.id;
            const statusLabel =
              item.status === 'downloading'
                ? 'Downloading'
                : item.status === 'seeding' || item.status === 'completed'
                ? 'Completed · Seeding'
                : item.status === 'paused'
                ? 'Paused'
                : item.status === 'handed-off'
                ? 'Device Client Handoff'
                : 'Connecting Swarm';

            const latestSwarm = item.swarmHealthHistory?.[item.swarmHealthHistory.length - 1];
            const hasStallRisk = Boolean(latestSwarm && isSwarmStallRisk(latestSwarm.ratio));

            return (
              <div
                key={item.id}
                onClick={() => onSelectTransfer(item.id)}
                className={`p-4 cursor-pointer transition-colors relative ${
                  isSelected
                    ? 'bg-slate-800/65'
                    : 'hover:bg-slate-800/30'
                } ${
                  hasStallRisk
                    ? 'border-l-2 border-l-rose-500 bg-rose-950/15'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-slate-100 truncate">
                        {item.torrent.title}
                      </h3>
                      {hasStallRisk && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/50 shrink-0 shadow-xs"
                          title="Threshold Alert: Seed-to-peer ratio < 0.10x. Transfer is at severe risk of stalling."
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0 animate-pulse" />
                          <span>Stall Risk (&lt;0.10x)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                      <span
                        className={
                          item.status === 'downloading'
                            ? 'text-sky-400'
                            : item.status === 'completed' || item.status === 'seeding'
                            ? 'text-emerald-400'
                            : item.status === 'paused'
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      >
                        {statusLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          sortBy === 'progress'
                            ? 'text-sky-300 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {item.progress.toFixed(1)}%
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.mode === 'web-client' ? 'WebTorrent' : 'Device App'}
                      </span>
                      {item.startedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`flex items-center gap-1 ${
                              sortBy === 'startedAt'
                                ? 'text-sky-300 font-semibold'
                                : 'text-slate-500'
                            }`}
                            title={`Started: ${new Date(item.startedAt).toLocaleString()}`}
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            {formatRelativeTime(item.startedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.mode === 'web-client' && (
                      <button
                        onClick={() => onTogglePause(item.id)}
                        title={item.status === 'paused' ? 'Resume Transfer' : 'Pause Transfer'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      >
                        {item.status === 'paused' ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveTransfer(item.id)}
                      title="Remove Transfer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-transform duration-150 origin-left ${
                      item.status === 'completed' || item.status === 'seeding'
                        ? 'bg-emerald-500'
                        : item.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(2, item.progress))}%`,
                    }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums gap-2">
                  <span className="truncate">
                    {formatBytes(item.downloadedBytes)} / {item.torrent.sizeFormatted}
                  </span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={
                        sortBy === 'speed' && item.downloadSpeedBytes > 0
                          ? 'text-sky-300 font-semibold'
                          : ''
                      }
                    >
                      {item.downloadSpeedBytes > 0
                        ? `${formatBytes(item.downloadSpeedBytes)}/s`
                        : `${item.connectedPeers} peers`}
                    </span>
                    <SwarmHealthSparkline session={item} compact />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Detailed WebTorrent Swarm & Media Inspector */}
      {activeTransfer && (
        <div className="lg:col-span-7 border border-slate-800 bg-[#111827] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums mb-1">
                  <span>BTIH: {activeTransfer.torrent.infoHash}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeTransfer.torrent.sourceName}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !stripProtocol;
                      setStripProtocol(next);
                      onNotify(
                        next
                          ? 'Magnet protocol stripped: Clean BTIH hash mode active'
                          : 'Magnet protocol enabled: Standard magnet:? URI active'
                      );
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans transition-colors ${
                      stripProtocol
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 font-medium'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                    }`}
                    title={
                      stripProtocol
                        ? 'Magnet protocol scheme stripped. Click to restore magnet:? URI'
                        : 'Take off magnet:? protocol scheme to get raw BTIH hash'
                    }
                  >
                    {stripProtocol ? (
                      <Link2Off className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Link2 className="w-3 h-3 text-slate-400" />
                    )}
                    {stripProtocol ? 'Protocol Taken Off (Raw Hash)' : 'Take off Magnet Protocol'}
                  </button>
                </div>
                <h2 className="text-lg font-semibold text-slate-100 leading-snug">
                  {activeTransfer.torrent.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {streamableFile && (
                  <button
                    onClick={() => setInspectorTab('stream')}
                    className="px-3.5 py-2 text-xs font-medium bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Film className="w-3.5 h-3.5" />
                    Stream Player
                  </button>
                )}
                <button
                  onClick={() => handleLaunchDevice(activeTransfer)}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Device Client
                </button>
                <button
                  onClick={() =>
                    handleCopyMagnet(
                      activeTransfer.torrent.magnetUri,
                      activeTransfer.torrent.infoHash,
                      activeTransfer.id
                    )
                  }
                  title={
                    stripProtocol
                      ? 'Copy raw 40-character BTIH hash without magnet: protocol scheme'
                      : 'Copy full magnet:?xt=urn:btih:... URI'
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedId === activeTransfer.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : stripProtocol ? (
                    <Link2Off className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {stripProtocol ? 'Copy Raw Hash' : 'Copy Magnet'}
                </button>
              </div>
            </div>

            {/* Key Transfer Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-800/80 font-mono tabular-nums">
              <div>
                <div className="text-xs text-slate-400">Download Rate</div>
                <div className="text-base font-semibold text-slate-100 mt-0.5">
                  {formatBytes(activeTransfer.downloadSpeedBytes)}/s
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Downloaded</div>
                <div className="text-base font-semibold text-slate-100 mt-0.5">
                  {formatBytes(activeTransfer.downloadedBytes)}{' '}
                  <span className="text-xs text-slate-400">
                    ({activeTransfer.progress.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Swarm Peers</div>
                <div className="text-base font-semibold text-slate-100 mt-0.5">
                  {activeTransfer.connectedPeers} / {activeTransfer.totalSwarmPeers}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Estimated Remaining</div>
                <div className="text-base font-semibold text-slate-100 mt-0.5">
                  {activeTransfer.progress >= 100
                    ? 'Complete'
                    : activeTransfer.etaSeconds
                    ? `${Math.floor(activeTransfer.etaSeconds / 60)}m ${
                        activeTransfer.etaSeconds % 60
                      }s`
                    : 'Calculating'}
                </div>
              </div>
            </div>

            {/* Real-Time Download & Upload Throughput Chart (Recharts) */}
            <div className="mt-5 pt-5 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 font-mono tabular-nums text-xs">
                <span className="text-slate-300 font-sans font-medium">
                  Real-Time Swarm Throughput (MB/s)
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sky-400">
                    Down: {formatBytes(activeTransfer.downloadSpeedBytes)}/s
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400">
                    Up: {formatBytes(activeTransfer.uploadSpeedBytes)}/s
                  </span>
                </div>
              </div>

              <div className="h-44 w-full bg-slate-950/90 border border-slate-800/90 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      activeTransfer.speedHistory && activeTransfer.speedHistory.length > 0
                        ? activeTransfer.speedHistory
                        : [
                            {
                              time: 'Now',
                              downloadBytesPerSec: activeTransfer.downloadSpeedBytes,
                              uploadBytesPerSec: activeTransfer.uploadSpeedBytes,
                              downloadMBps: Number(
                                (activeTransfer.downloadSpeedBytes / (1024 * 1024)).toFixed(2)
                              ),
                              uploadMBps: Number(
                                (activeTransfer.uploadSpeedBytes / (1024 * 1024)).toFixed(2)
                              ),
                            },
                          ]
                    }
                    margin={{ top: 6, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dlSpeedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-400)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--accent-400)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="ulSpeedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: '#f1f5f9',
                      }}
                      formatter={(value: any, name: any) => [
                        `${Number(value).toFixed(2)} MB/s`,
                        name === 'downloadMBps' ? 'Download' : 'Upload',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloadMBps"
                      name="downloadMBps"
                      stroke="var(--accent-400)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#dlSpeedGradient)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="uploadMBps"
                      name="uploadMBps"
                      stroke="#10b981"
                      strokeWidth={1.75}
                      fillOpacity={1}
                      fill="url(#ulSpeedGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Swarm Health & Seed-to-Peer Ratio Sparkline Telemetry */}
            <SwarmHealthSparkline session={activeTransfer} />

            {/* Piece Verification Map */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono tabular-nums">
                <span>
                  SHA-1 Piece Buffer Map ({activeTransfer.piecesCompleted.filter((p) => p === 2).length} /{' '}
                  {activeTransfer.piecesTotal} verified blocks)
                </span>
                <span>256 KB block size</span>
              </div>
              <div className="grid grid-cols-32 gap-1 p-2 bg-slate-950 rounded-lg border border-slate-800/90">
                {activeTransfer.piecesCompleted.map((pieceState, idx) => (
                  <div
                    key={idx}
                    className={`h-2.5 rounded-[2px] transition-colors ${
                      pieceState === 2
                        ? 'bg-sky-500'
                        : pieceState === 1
                        ? 'bg-sky-300/70'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Inspector Sub-Navigation */}
          <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setInspectorTab('files')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  inspectorTab === 'files'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Files ({activeTransfer.files.length})
              </button>
              {streamableFile && (
                <button
                  onClick={() => setInspectorTab('stream')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    inspectorTab === 'stream'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  WebStream Player
                </button>
              )}
              <button
                onClick={() => setInspectorTab('peers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  inspectorTab === 'peers'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Peers ({activeTransfer.peers.length})
              </button>
              <button
                onClick={() => setInspectorTab('trackers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  inspectorTab === 'trackers'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                WSS & UDP Trackers ({activeTransfer.trackerStatus.length})
              </button>
            </div>

            <button
              onClick={() => {
                exportTorrentManifestFile(activeTransfer.torrent);
                onNotify('Exported .torrent metadata file');
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap shrink-0"
            >
              Export .torrent File
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-6">
            {inspectorTab === 'files' && (
              <div className="divide-y divide-slate-800/80">
                {activeTransfer.files.map((file, idx) => {
                  const extMeta = getFileExtensionMeta(file.name, file.type);
                  return (
                    <div
                      key={file.path}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={file.selected}
                          onChange={() => onToggleFileSelection(activeTransfer.id, idx)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                        />
                        <FileExtensionIcon
                          filename={file.name}
                          fallbackType={file.type}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-200 truncate">{file.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded border text-[10px] ${extMeta.badgeClasses}`}
                            >
                              {extMeta.extension} · {extMeta.categoryLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {file.selected
                                ? `${Math.min(100, activeTransfer.progress).toFixed(0)}% buffered`
                                : 'Skipped'}
                            </span>
                          </div>
                        </div>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.streamUrl && (
                          <button
                            onClick={() => setInspectorTab('stream')}
                            className="px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            Stream
                          </button>
                        )}
                        <button
                          onClick={() => {
                            savePayloadFileToDisk(file, activeTransfer.torrent);
                            onNotify(`Saving ${file.name} to device downloads`);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Save to Disk
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {inspectorTab === 'stream' && streamableFile && (
              <div>
                <div className="rounded-lg overflow-hidden bg-black border border-slate-800 aspect-video">
                  <video
                    key={streamableFile.streamUrl || activeTransfer.id}
                    src={
                      streamableFile.streamUrl ||
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
                    }
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                  <span>Streaming: {streamableFile.name}</span>
                  <span>Sequential Piece Prioritization Active (WebTorrent + HTTP WebSeed)</span>
                </div>
              </div>
            )}

            {inspectorTab === 'peers' && (
              <div className="space-y-4">
                {/* View switcher between World Map and Peer Table */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Globe2 className="w-4 h-4 text-sky-400" />
                    <span>Swarm Peers & Geographic Map ({activeTransfer.peers.length})</span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPeersViewMode('both')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        peersViewMode === 'both'
                          ? 'bg-slate-800 text-slate-100 font-medium shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Map & Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeersViewMode('map')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        peersViewMode === 'map'
                          ? 'bg-slate-800 text-slate-100 font-medium shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Map Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeersViewMode('table')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        peersViewMode === 'table'
                          ? 'bg-slate-800 text-slate-100 font-medium shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Table Only
                    </button>
                  </div>
                </div>

                {/* D3-Geo World Map Visualization */}
                {(peersViewMode === 'both' || peersViewMode === 'map') && (
                  <PeerWorldMap
                    peers={activeTransfer.peers}
                    transferTitle={activeTransfer.torrent.title}
                    totalDownloadSpeed={activeTransfer.downloadSpeedBytes}
                    onSelectPeer={(p) => {
                      const geo = resolvePeerGeo(p.ip);
                      onNotify(`Peer ${p.ip} in ${geo.city}, ${geo.country}`);
                    }}
                  />
                )}

                {/* Peer Endpoint Details Table with Geo Metadata */}
                {(peersViewMode === 'both' || peersViewMode === 'table') && (
                  <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/60 p-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs text-slate-400">
                          <th className="pb-2.5 font-medium">Location</th>
                          <th className="pb-2.5 font-medium">Peer Endpoint</th>
                          <th className="pb-2.5 font-medium">Client</th>
                          <th className="pb-2.5 font-medium">Transport</th>
                          <th className="pb-2.5 font-medium text-right">Latency</th>
                          <th className="pb-2.5 font-medium text-right">Progress</th>
                          <th className="pb-2.5 font-medium text-right">Down Speed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                        {activeTransfer.peers.map((peer) => {
                          const geo = resolvePeerGeo(peer.ip);
                          return (
                            <tr key={peer.id} className="text-slate-300 hover:bg-slate-900/40">
                              <td className="py-2.5 whitespace-nowrap">
                                <span className="mr-1.5">{peer.flag || geo.flag}</span>
                                <span className="font-sans text-slate-200">
                                  {peer.city || geo.city}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-300 font-mono">{peer.ip}</td>
                              <td className="py-2.5 font-sans text-slate-300">{peer.client}</td>
                              <td className="py-2.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                    peer.transport === 'WebSeed HTTP'
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : peer.transport === 'WebRTC'
                                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                      : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                >
                                  {peer.transport}
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-emerald-400">
                                ~{peer.latencyMs || geo.latencyMs} ms
                              </td>
                              <td className="py-2.5 text-right">{peer.progress}%</td>
                              <td className="py-2.5 text-right text-sky-400 font-semibold">
                                {formatBytes(peer.downloadSpeed)}/s
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'trackers' && (
              <div className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                {activeTransfer.trackerStatus.map((tr) => (
                  <div
                    key={tr.url}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <span className="text-slate-300 truncate">{tr.url}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={
                          tr.status === 'peers-found'
                            ? 'text-emerald-400'
                            : 'text-sky-400'
                        }
                      >
                        {tr.status === 'peers-found' ? 'Announced OK' : 'Connecting'}
                      </span>
                      <span className="text-slate-400">{tr.peers} peers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
