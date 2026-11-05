import { SwarmHealthSample, SwarmViabilityLevel } from '../types/torrent';

export const SWARM_STALL_THRESHOLD = 0.1; // 0.1x seed-to-peer ratio threshold

export function isSwarmStallRisk(ratio: number): boolean {
  return ratio < SWARM_STALL_THRESHOLD;
}

export function calculateSwarmRatio(seeds: number, peers: number): number {
  if (seeds <= 0) return 0;
  const p = Math.max(1, peers);
  return Number((seeds / p).toFixed(2));
}

export function getSwarmViability(ratio: number, seeds: number): SwarmViabilityLevel {
  if (seeds <= 0 || ratio < SWARM_STALL_THRESHOLD) return 'critical';
  if (ratio >= 2.0) return 'thriving';
  if (ratio >= 1.0) return 'healthy';
  if (ratio >= 0.5) return 'moderate';
  return 'at-risk';
}

export function getViabilityScore(ratio: number, seeds: number): number {
  if (seeds <= 0 || ratio < SWARM_STALL_THRESHOLD) return Math.max(4, Math.round(ratio * 80));
  if (ratio >= 2.5) return 98;
  if (ratio >= 2.0) return 92;
  if (ratio >= 1.5) return 85;
  if (ratio >= 1.0) return 75;
  if (ratio >= 0.75) return 60;
  if (ratio >= 0.5) return 48;
  if (ratio >= 0.25) return 32;
  return 18;
}

export function getViabilityBadgeDetails(viability: SwarmViabilityLevel): {
  label: string;
  shortLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  strokeColor: string;
  dotColor: string;
} {
  switch (viability) {
    case 'thriving':
      return {
        label: 'Thriving Swarm (Abundant Seeds)',
        shortLabel: 'Thriving',
        textColor: 'text-emerald-300',
        bgColor: 'bg-emerald-500/15',
        borderColor: 'border-emerald-500/40',
        strokeColor: '#10b981',
        dotColor: 'bg-emerald-400',
      };
    case 'healthy':
      return {
        label: 'Healthy Swarm (Stable Seeds)',
        shortLabel: 'Healthy',
        textColor: 'text-sky-300',
        bgColor: 'bg-sky-500/15',
        borderColor: 'border-sky-500/40',
        strokeColor: 'var(--accent-400, #38bdf8)',
        dotColor: 'bg-sky-400',
      };
    case 'moderate':
      return {
        label: 'Moderate Swarm (Balanced)',
        shortLabel: 'Moderate',
        textColor: 'text-amber-300',
        bgColor: 'bg-amber-500/15',
        borderColor: 'border-amber-500/40',
        strokeColor: '#f59e0b',
        dotColor: 'bg-amber-400',
      };
    case 'at-risk':
      return {
        label: 'At Risk (Slower / Seeds Choked)',
        shortLabel: 'At Risk',
        textColor: 'text-rose-300',
        bgColor: 'bg-rose-500/15',
        borderColor: 'border-rose-500/40',
        strokeColor: '#f43f5e',
        dotColor: 'bg-rose-400',
      };
    case 'critical':
    default:
      return {
        label: 'Critical Stall Risk (<0.10x ratio)',
        shortLabel: 'Stall Risk',
        textColor: 'text-rose-400',
        bgColor: 'bg-rose-500/20',
        borderColor: 'border-rose-500/50',
        strokeColor: '#f43f5e',
        dotColor: 'bg-rose-500',
      };
  }
}

export function getViabilityDiagnosis(
  viability: SwarmViabilityLevel,
  ratio: number,
  seeds: number,
  peers: number
): {
  summary: string;
  detail: string;
  recommendation: string;
} {
  switch (viability) {
    case 'thriving':
      return {
        summary: `Optimal seed redundancy (${ratio.toFixed(2)}x ratio). Completion is highly guaranteed.`,
        detail: `The swarm hosts ${seeds} verified seeders against ${peers} active downloaders. Tit-for-tat piece availability is maximized across all blocks without choke latency.`,
        recommendation: 'Full pipeline bandwidth recommended. Sequential streaming is viable.',
      };
    case 'healthy':
      return {
        summary: `Balanced seeder presence (${ratio.toFixed(2)}x ratio). Good sustained throughput.`,
        detail: `Seeders outnumber or match downloaders (${seeds} seeds / ${peers} peers). Rarest piece frequency remains above minimum replication threshold.`,
        recommendation: 'Transfer should proceed steadily to 100% completion with minor peer choking.',
      };
    case 'moderate':
      return {
        summary: `Moderate swarm competition (${ratio.toFixed(2)}x ratio). Download may occasionally throttle.`,
        detail: `With ${seeds} seeds and ${peers} peers, downloaders compete for seeder upload slots. Throughput relies heavily on peer piece-swapping (PEX & DHT).`,
        recommendation: 'Viable for complete download, but expect intermittent rate dips during end-game piece requests.',
      };
    case 'at-risk':
      return {
        summary: `Slower swarm warning (${ratio.toFixed(2)}x ratio). Seeder shortage detected.`,
        detail: `Only ${seeds} seeders are serving ${peers} peers. Each seeder\'s bandwidth is split across multiple downloaders, causing queue backoff and slower piece distribution.`,
        recommendation: 'Leave transfer running in background; consider enabling DHT/PEX or device client handoff to discover unlisted seeds.',
      };
    case 'critical':
    default:
      if (ratio < SWARM_STALL_THRESHOLD && seeds > 0) {
        return {
          summary: `Severe seeder starvation (${ratio.toFixed(2)}x ratio < 0.10x threshold). Download stall imminent.`,
          detail: `Only ${seeds} seeders are attempting to feed ${peers} leechers (seed-to-peer ratio below 0.1x). Choking is critical, rarest pieces cannot replicate in time, and transfer progress will likely stall or stop.`,
          recommendation: 'Swarm health is critical. Prioritize connected seeders, enable DHT/PeX scrape, or source an alternative tracker with higher seed availability.',
        };
      }
      return {
        summary: 'No active seeders found in swarm (0.00x ratio). Transfer is stalled.',
        detail: `Zero peers have reported 100% piece completion. While connected peers can exchange mutual pieces, missing blocks cannot be resolved until a seed rejoins.`,
        recommendation: 'Keep session active in case an original seeder announces, or switch to an alternate indexer mirror.',
      };
  }
}

export function generateInitialSwarmHistory(
  totalSeeders: number,
  totalLeechers: number,
  sampleCount = 16,
  targetRatio?: number
): SwarmHealthSample[] {
  const samples: SwarmHealthSample[] = [];
  const now = Date.now();
  const stepMs = 900; // 900ms per sample point

  const baseSeeds = Math.max(1, Math.round(totalSeeders * 0.12));
  const baseLeechers = Math.max(1, Math.round(totalLeechers * 0.18));
  const desiredRatio = targetRatio ?? (baseSeeds / Math.max(1, baseLeechers));

  for (let i = 0; i < sampleCount; i++) {
    const ts = new Date(now - (sampleCount - 1 - i) * stepMs);
    const timeLabel = ts.toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    });

    // Natural fluctuation across the session duration
    const wave = Math.sin(i * 0.5) * 0.15;
    const currentRatio = Math.max(0.05, Number((desiredRatio * (1 + wave)).toFixed(2)));
    const currentPeers = Math.max(1, Math.round(baseLeechers * (1 - wave * 0.3)));
    const currentSeeds = Math.max(1, Math.round(currentPeers * currentRatio));

    samples.push({
      time: timeLabel,
      seeds: currentSeeds,
      peers: currentPeers,
      ratio: currentRatio,
      viability: getSwarmViability(currentRatio, currentSeeds),
    });
  }

  return samples;
}
