import React, { useMemo, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { SwarmHealthSample, TransferSession } from '../types/torrent';
import {
  SWARM_STALL_THRESHOLD,
  isSwarmStallRisk,
  getViabilityBadgeDetails,
  getViabilityDiagnosis,
  getViabilityScore,
} from '../services/swarmHealth';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SwarmHealthSample }>;
  label?: string;
}

const SwarmPointTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const sample = payload[0]?.payload;
  if (!sample) return null;

  const sampleBadge = getViabilityBadgeDetails(sample.viability);
  const eqDiff = sample.ratio - 1.0;
  const isStallRisk = isSwarmStallRisk(sample.ratio);

  return (
    <div
      className={`bg-slate-950/95 backdrop-blur-md rounded-xl p-3 shadow-2xl text-xs font-mono tabular-nums min-w-[225px] border ${
        isStallRisk ? 'border-rose-500/80 ring-1 ring-rose-500/30' : 'border-slate-700/90'
      }`}
    >
      <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-800">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Clock className="w-3 h-3 text-sky-400 shrink-0" />
          <span>{sample.time}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border font-sans font-medium ${sampleBadge.bgColor} ${sampleBadge.textColor} ${sampleBadge.borderColor}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sampleBadge.dotColor}`} />
          <span>{sampleBadge.label}</span>
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-slate-400 font-sans text-[11px]">
            Seeder/Leecher Ratio:
          </span>
          <span className={`text-sm font-bold ${isStallRisk ? 'text-rose-400' : 'text-slate-100'}`}>
            {sample.ratio.toFixed(2)}x{' '}
            <span className="text-[10px] font-normal text-slate-400">
              ({sample.seeds}:{sample.peers})
            </span>
          </span>
        </div>

        {isStallRisk && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-sans text-[10px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
            <span>Stall Risk: Seed ratio &lt; 0.10x threshold</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="px-2 py-1 rounded bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] font-sans text-slate-400">Seeds</span>
            <span className="text-emerald-400 font-semibold">{sample.seeds}</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] font-sans text-slate-400">Leechers</span>
            <span className="text-sky-400 font-semibold">{sample.peers}</span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60">
          <span className="font-sans">vs 1.0x Equilibrium:</span>
          <span
            className={
              eqDiff >= 0 ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'
            }
          >
            {eqDiff >= 0 ? `+${eqDiff.toFixed(2)}x surplus` : `${eqDiff.toFixed(2)}x deficit`}
          </span>
        </div>
      </div>
    </div>
  );
};

interface SwarmHealthSparklineProps {
  session: TransferSession;
  compact?: boolean;
}

export const SwarmHealthSparkline: React.FC<SwarmHealthSparklineProps> = ({
  session,
  compact = false,
}) => {
  const [viewMetric, setViewMetric] = useState<'ratio' | 'breakdown'>('ratio');
  const [hoveredCompactIdx, setHoveredCompactIdx] = useState<number | null>(null);
  const [hoveredDetailSample, setHoveredDetailSample] =
    useState<SwarmHealthSample | null>(null);

  const history: SwarmHealthSample[] = useMemo(() => {
    if (session.swarmHealthHistory && session.swarmHealthHistory.length > 0) {
      return session.swarmHealthHistory;
    }
    const seeds = Math.max(1, Math.round(session.torrent.seeders * 0.12));
    const peers = Math.max(1, Math.round(session.torrent.leechers * 0.15));
    const ratio = Number((seeds / peers).toFixed(2));
    return [
      {
        time: 'Now',
        seeds,
        peers,
        ratio,
        viability: ratio >= 1.0 ? 'healthy' : 'moderate',
      },
    ];
  }, [session.swarmHealthHistory, session.torrent.seeders, session.torrent.leechers]);

  const latestSample = history[history.length - 1];
  const initialSample = history[0];

  const currentRatio = latestSample?.ratio ?? 1.0;
  const currentSeeds = latestSample?.seeds ?? session.torrent.seeders;
  const currentPeers = latestSample?.peers ?? session.torrent.leechers;
  const viability = latestSample?.viability ?? 'healthy';

  const badge = getViabilityBadgeDetails(viability);
  const score = getViabilityScore(currentRatio, currentSeeds);
  const diagnosis = getViabilityDiagnosis(
    viability,
    currentRatio,
    currentSeeds,
    currentPeers
  );

  // Compute ratio delta across session duration
  const ratioDelta = Number(
    (currentRatio - (initialSample?.ratio ?? currentRatio)).toFixed(2)
  );
  const isRatioTrendingUp = ratioDelta >= 0;

  // Compact micro-sparkline mode (used for Transfer Queue rows) with interactive hover point tooltip
  if (compact) {
    const minVal = Math.min(...history.map((h) => h.ratio), 0.05);
    const maxVal = Math.max(...history.map((h) => h.ratio), 1.5);
    const range = Math.max(0.001, maxVal - minVal);
    const width = 88;
    const height = 24;
    const isStalled = isSwarmStallRisk(currentRatio);

    const coords = history.map((h, i) => {
      const x = (i / Math.max(1, history.length - 1)) * width;
      const y = height - ((h.ratio - minVal) / range) * (height - 4) - 2;
      return { x, y, sample: h };
    });

    const points = coords
      .map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');

    const activeHoverPoint =
      hoveredCompactIdx !== null && coords[hoveredCompactIdx]
        ? coords[hoveredCompactIdx]
        : null;
    const activeHoverBadge = activeHoverPoint
      ? getViabilityBadgeDetails(activeHoverPoint.sample.viability)
      : badge;

    const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      if (history.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = Math.max(0, Math.min(width, e.clientX - rect.left));
      const idx = Math.round((relX / width) * Math.max(0, history.length - 1));
      setHoveredCompactIdx(idx);
    };

    return (
      <div
        className="relative flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visual Threshold Alert Pill for Compact Swarm */}
        {isStalled && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/25 text-rose-300 border border-rose-500/60 shadow-xs animate-pulse"
            title="Swarm Threshold Alert: Seed-to-peer ratio < 0.10x. Transfer at risk of stalling."
          >
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            <span>STALL RISK</span>
          </span>
        )}

        <svg
          width={width}
          height={height}
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredCompactIdx(null)}
          className="shrink-0 overflow-visible cursor-crosshair"
        >
          {/* 1.0x equilibrium guideline */}
          {minVal <= 1.0 && maxVal >= 1.0 && (
            <line
              x1="0"
              y1={height - ((1.0 - minVal) / range) * (height - 4) - 2}
              x2={width}
              y2={height - ((1.0 - minVal) / range) * (height - 4) - 2}
              stroke="#475569"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {/* 0.10x Stall Risk Threshold guideline */}
          {minVal <= SWARM_STALL_THRESHOLD && maxVal >= SWARM_STALL_THRESHOLD && (
            <line
              x1="0"
              y1={height - ((SWARM_STALL_THRESHOLD - minVal) / range) * (height - 4) - 2}
              x2={width}
              y2={height - ((SWARM_STALL_THRESHOLD - minVal) / range) * (height - 4) - 2}
              stroke="#f43f5e"
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.8"
            />
          )}

          <polyline
            fill="none"
            stroke={badge.strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Hovered point crosshair & marker */}
          {activeHoverPoint ? (
            <>
              <line
                x1={activeHoverPoint.x}
                y1={0}
                x2={activeHoverPoint.x}
                y2={height}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={activeHoverPoint.x}
                cy={activeHoverPoint.y}
                r="3.5"
                fill={activeHoverBadge.strokeColor}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </>
          ) : (
            coords.length > 0 && (
              <circle
                cx={coords[coords.length - 1].x}
                cy={coords[coords.length - 1].y}
                r="2.5"
                fill={badge.strokeColor}
              />
            )
          )}
        </svg>

        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            activeHoverPoint
              ? `${activeHoverBadge.bgColor} ${activeHoverBadge.textColor} ${activeHoverBadge.borderColor}`
              : isStalled
              ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 font-bold'
              : `${badge.bgColor} ${badge.textColor} ${badge.borderColor}`
          }`}
        >
          {(activeHoverPoint ? activeHoverPoint.sample.ratio : currentRatio).toFixed(
            2
          )}
          x
        </span>

        {/* Interactive Point-in-Time Hover Tooltip for Compact Sparkline */}
        {activeHoverPoint && (
          <div className="
            pointer-events-none absolute bottom-full right-0 mb-2 z-50
            w-56 bg-slate-950/95 backdrop-blur-md border border-slate-700/90
            rounded-xl p-2.5 shadow-2xl text-[11px] font-mono tabular-nums
          ">
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                {activeHoverPoint.sample.time}
              </span>
              <span className={`text-[10px] font-sans font-semibold ${activeHoverBadge.textColor}`}>
                {activeHoverBadge.label}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-slate-400 font-sans text-[10px]">
                Seed/Leech Ratio:
              </span>
              <span
                className={`text-xs font-bold ${
                  isSwarmStallRisk(activeHoverPoint.sample.ratio)
                    ? 'text-rose-400'
                    : 'text-slate-100'
                }`}
              >
                {activeHoverPoint.sample.ratio.toFixed(2)}x{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  ({activeHoverPoint.sample.seeds}:{activeHoverPoint.sample.peers})
                </span>
              </span>
            </div>
            {isSwarmStallRisk(activeHoverPoint.sample.ratio) && (
              <div className="mt-1.5 pt-1.5 border-t border-rose-900/60 flex items-center gap-1 text-[10px] text-rose-400 font-sans font-medium">
                <AlertTriangle className="w-3 h-3 shrink-0 animate-pulse" />
                <span>Below 0.10x stall risk threshold</span>
              </div>
            )}
            <div className="mt-1 pt-1 border-t border-slate-800/70 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400">
                {activeHoverPoint.sample.seeds} seeds
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-sky-400">
                {activeHoverPoint.sample.peers} leechers
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full detailed card visualization for TransferWorkspace
  const inspectedSample = hoveredDetailSample || latestSample;

  return (
    <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-5 mt-5">
      {/* Header and Telemetry */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Swarm Health & Viability Sparkline</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-normal">
                (Seed/Peer Ratio)
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-lg">
            Tracks seed-to-peer ratio across the download session. Hover any point on the sparkline to inspect the exact seeder/leecher ratio at that timestamp.
          </p>
        </div>

        {/* Viability Badge */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dotColor} animate-pulse`} />
            <span>{badge.label}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
            Session Viability Index:{' '}
            <span className="text-slate-200 font-semibold">{score}/100</span>
          </div>
        </div>
      </div>

      {/* Visual Threshold Alert Banner for Seed-to-Peer Ratio Below 0.1x */}
      {isSwarmStallRisk(currentRatio) && (
        <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-500/60 rounded-xl flex items-start gap-3 shadow-lg shadow-rose-950/30">
          <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                <span>Critical Threshold Alert: Download Stall Risk</span>
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/30 text-rose-200 border border-rose-500/50">
                Current {currentRatio.toFixed(2)}x &lt; 0.10x Limit
              </span>
            </div>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
              The seed-to-peer ratio has fallen below the <strong>0.10x stability threshold</strong> (fewer than 1 seed per 10 leechers). At this severe seeder deficit, piece requests cannot be satisfied, causing queue choking and high probability of download stalling.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 font-mono tabular-nums">
        <div
          className={`p-3 rounded-lg border transition-all ${
            isSwarmStallRisk(inspectedSample?.ratio ?? currentRatio)
              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/50'
              : 'bg-slate-950/70 border-slate-800/70'
          }`}
        >
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>
                {hoveredDetailSample
                  ? `Ratio @ ${hoveredDetailSample.time}`
                  : 'Seed/Peer Ratio'}
              </span>
              {isSwarmStallRisk(inspectedSample?.ratio ?? currentRatio) && (
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              )}
            </span>
            <span
              className={`flex items-center text-[10px] ${
                isRatioTrendingUp ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isRatioTrendingUp ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              )}
              {isRatioTrendingUp ? `+${ratioDelta}` : `${ratioDelta}`}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100 mt-1 flex items-baseline gap-1">
            <span
              className={
                isSwarmStallRisk(inspectedSample?.ratio ?? currentRatio)
                  ? 'text-rose-400 font-extrabold'
                  : 'text-slate-100'
              }
            >
              {(inspectedSample?.ratio ?? currentRatio).toFixed(2)}x
            </span>
            <span
              className={`text-xs font-normal font-sans ${
                isSwarmStallRisk(inspectedSample?.ratio ?? currentRatio)
                  ? 'text-rose-300 font-semibold'
                  : 'text-slate-500'
              }`}
            >
              {isSwarmStallRisk(inspectedSample?.ratio ?? currentRatio)
                ? 'stall risk'
                : (inspectedSample?.ratio ?? currentRatio) >= 1.0
                ? 'surplus'
                : 'deficit'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/70">
          <div className="text-[11px] text-slate-400">
            {hoveredDetailSample
              ? `Seeders @ ${hoveredDetailSample.time}`
              : 'Active Seeders (100%)'}
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1 flex items-baseline gap-1">
            <span>{inspectedSample?.seeds ?? currentSeeds}</span>
            <span className="text-xs font-normal text-slate-500 font-sans">
              of {session.torrent.seeders} in DHT
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/70">
          <div className="text-[11px] text-slate-400">
            {hoveredDetailSample
              ? `Leechers @ ${hoveredDetailSample.time}`
              : 'Active Leechers / Peers'}
          </div>
          <div className="text-lg font-bold text-sky-400 mt-1 flex items-baseline gap-1">
            <span>{inspectedSample?.peers ?? currentPeers}</span>
            <span className="text-xs font-normal text-slate-500 font-sans">
              of {session.torrent.leechers} in swarm
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/70">
          <div className="text-[11px] text-slate-400">Swarm Assessment</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
            {viability === 'thriving' && 'Excellent Redundancy'}
            {viability === 'healthy' && 'Stable Piece Flow'}
            {viability === 'moderate' && 'Peer Swapping Key'}
            {viability === 'at-risk' && 'Slower / Seed Choked'}
            {viability === 'critical' && 'Stall Risk (<0.10x)'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
            {isSwarmStallRisk(currentRatio)
              ? 'Imminent download stall'
              : currentRatio >= 1.0
              ? 'Optimal download rate'
              : 'May experience slow piece delivery'}
          </div>
        </div>
      </div>

      {/* Sparkline Visualizer Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 mb-2 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-300 font-sans font-medium flex items-center gap-1.5">
            <span>Ratio History</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({history.length} samples over session)
            </span>
          </span>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="w-2 h-0.5 bg-slate-500 border-b border-dashed border-slate-400 inline-block" />
              <span>1.0x Equilibrium</span>
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-500 border-b border-dashed border-rose-400 inline-block" />
              <span>0.10x Stall Threshold</span>
            </span>
          </div>

          {hoveredDetailSample && (
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] tabular-nums">
              Inspecting {hoveredDetailSample.time}:{' '}
              <strong className="text-slate-100">
                {hoveredDetailSample.ratio.toFixed(2)}x
              </strong>{' '}
              ({hoveredDetailSample.seeds} S / {hoveredDetailSample.peers} L)
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMetric('ratio')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMetric === 'ratio'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Seed/Peer Ratio
          </button>
          <button
            type="button"
            onClick={() => setViewMetric('breakdown')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMetric === 'breakdown'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Seeds vs Leechers
          </button>
        </div>
      </div>

      {/* Sparkline Graphic Canvas (Recharts) */}
      <div className="h-44 w-full bg-slate-950/90 border border-slate-800/90 rounded-lg p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history}
            margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (
                state &&
                state.activePayload &&
                state.activePayload.length > 0
              ) {
                setHoveredDetailSample(
                  state.activePayload[0].payload as SwarmHealthSample
                );
              }
            }}
            onMouseLeave={() => setHoveredDetailSample(null)}
          >
            <defs>
              <linearGradient id="swarmRatioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={badge.strokeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={badge.strokeColor} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="seedsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="peersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={viewMetric === 'ratio' ? [0, 'dataMax + 0.3'] : [0, 'auto']}
              tickFormatter={(v) => (viewMetric === 'ratio' ? `${v}x` : `${v}`)}
            />
            <Tooltip
              cursor={{
                stroke: '#38bdf8',
                strokeWidth: 1,
                strokeDasharray: '3 3',
              }}
              content={<SwarmPointTooltip />}
            />

            {/* 1.0x Equilibrium Reference Line */}
            {viewMetric === 'ratio' && (
              <ReferenceLine
                y={1.0}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: '1.0x Equilibrium',
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideTopRight',
                  offset: 8,
                }}
              />
            )}

            {/* 0.10x Stall Risk Threshold Reference Line */}
            {viewMetric === 'ratio' && (
              <ReferenceLine
                y={SWARM_STALL_THRESHOLD}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: '0.10x Stall Threshold',
                  fill: '#fb7185',
                  fontSize: 10,
                  position: 'insideBottomRight',
                  offset: 6,
                }}
              />
            )}

            {viewMetric === 'ratio' ? (
              <Area
                type="monotone"
                dataKey="ratio"
                name="ratio"
                stroke={badge.strokeColor}
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#swarmRatioGrad)"
                activeDot={{
                  r: 4.5,
                  stroke: '#0f172a',
                  strokeWidth: 2,
                  fill: badge.strokeColor,
                }}
                isAnimationActive={false}
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="seeds"
                  name="seeds"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#seedsGrad)"
                  activeDot={{
                    r: 4,
                    stroke: '#0f172a',
                    strokeWidth: 2,
                    fill: '#10b981',
                  }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="peers"
                  name="peers"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#peersGrad)"
                  activeDot={{
                    r: 4,
                    stroke: '#0f172a',
                    strokeWidth: 2,
                    fill: '#38bdf8',
                  }}
                  isAnimationActive={false}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Swarm Viability Diagnosis Callout for Slower Swarms */}
      <div className="mt-4 p-3.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded bg-slate-900 border border-slate-800 text-sky-400 shrink-0 mt-0.5">
            {viability === 'thriving' || viability === 'healthy' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : viability === 'moderate' ? (
              <Zap className="w-4 h-4 text-amber-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="font-semibold text-slate-200 flex flex-wrap items-center gap-2">
              <span>{diagnosis.summary}</span>
              {currentRatio < 1.0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Slower Swarm Telemetry
                </span>
              )}
            </div>
            <p className="text-slate-400 leading-relaxed font-sans">{diagnosis.detail}</p>
            <div className="text-[11px] font-mono text-slate-300 pt-1 flex items-center gap-1.5">
              <span className="text-sky-400 font-semibold font-sans">Recommendation:</span>
              <span>{diagnosis.recommendation}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
