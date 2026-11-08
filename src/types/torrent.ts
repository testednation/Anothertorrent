export type TorrentCategory =
  | 'All'
  | 'Movies'
  | 'TV'
  | 'Software'
  | 'Audio'
  | 'Books'
  | 'Games'
  | 'Other';

export type IndexerProtocol =
  | 'archive-api'
  | 'yts-api'
  | 'apibay-api'
  | 'rss-feed'
  | 'html-magnet'
  | 'torznab-json'
  | 'rutracker-scraper'
  | 'ruboard-scraper'
  | 'gnutella-network'
  | 'edonkey-kad'
  | 'frostwire-p2p';

export interface IndexerAuth {
  mode: 'credentials' | 'cookie' | 'guest-mirror';
  username?: string;
  password?: string;
  cookie?: string; // e.g. bb_data for RuTracker, z_pass_hash for Ru-Board
  sessionExpires?: string;
  authenticated: boolean;
  statusMessage?: string;
}

export interface ProwlarrSyncState {
  lastSync: string;
  autoUpdateIntervalHours: number;
  status: 'synced' | 'updating' | 'error';
  indexersAvailable: number;
  upstreamBranch: string;
  message?: string;
  autoUpdateEnabled: boolean;
}

export interface IndexerSite {
  id: string;
  name: string;
  baseUrl: string;
  searchUrlTemplate: string;
  protocol: IndexerProtocol;
  categories: TorrentCategory[];
  enabled: boolean;
  isCustom: boolean;
  latencyMs?: number;
  lastStatus?: 'healthy' | 'relay-active' | 'unreachable' | 'untested';
  description: string;
  apiKey?: string;
  auth?: IndexerAuth;
  requiresAuth?: boolean;
  prowlarrId?: string;
  privacy?: 'public' | 'semi-private' | 'private';
  language?: string;
  version?: string;
  lastUpdated?: string;
}

export interface RssFeedSubscription {
  id: string;
  name: string;
  feedUrl: string;
  category: Exclude<TorrentCategory, 'All'>;
  filterPattern: string;
  refreshIntervalMinutes: number;
  autoInjectSearch: boolean;
  enabled: boolean;
  lastChecked?: string;
  matchedCount?: number;
  status: 'active' | 'syncing' | 'error';
}

export interface TorrentFileEntry {
  name: string;
  originalName?: string;
  path: string;
  sizeBytes: number;
  type: 'video' | 'audio' | 'archive' | 'document' | 'iso' | 'other';
  selected: boolean;
  progress: number;
  streamUrl?: string;
}

export interface BatchRenameConfig {
  prefix: string;
  suffix: string;
  scope: 'all' | 'media-only';
}

export interface TorrentItem {
  id: string;
  title: string;
  infoHash: string;
  magnetUri: string;
  sizeBytes: number;
  sizeFormatted: string;
  seeders: number;
  leechers: number;
  category: Exclude<TorrentCategory, 'All'>;
  sourceId: string;
  sourceName: string;
  uploadDate: string;
  verified: boolean;
  webSeedUrls?: string[];
  resolution?: string;
  codec?: string;
  files: TorrentFileEntry[];
  pageUrl?: string;
  p2pNetwork?: 'BitTorrent' | 'Gnutella' | 'eDonkey2000' | 'FrostWire' | 'Hybrid';
  ed2kUri?: string;
  ed2kHash?: string;
  urnSha1?: string;
  networkNodes?: number;
}

export type DownloadTargetMode = 'web-client' | 'device-client';

export type TransferStatus =
  | 'connecting-swarm'
  | 'downloading'
  | 'seeding'
  | 'paused'
  | 'completed'
  | 'handed-off';

export interface PeerConnectionInfo {
  id: string;
  ip: string;
  client: string;
  transport: 'WebRTC' | 'WebSeed HTTP' | 'WSS Tracker' | 'uTP/TCP';
  downloadSpeed: number;
  progress: number;
  city?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  latencyMs?: number;
}

export type SwarmViabilityLevel =
  | 'thriving'
  | 'healthy'
  | 'moderate'
  | 'at-risk'
  | 'critical';

export interface SwarmHealthSample {
  time: string;
  seeds: number;
  peers: number;
  ratio: number;
  viability: SwarmViabilityLevel;
}

export interface SpeedSample {
  time: string;
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
  downloadMBps: number;
  uploadMBps: number;
}

export interface TransferSession {
  id: string;
  torrent: TorrentItem;
  mode: DownloadTargetMode;
  status: TransferStatus;
  progress: number; // 0 to 100
  downloadedBytes: number;
  uploadedBytes: number;
  downloadSpeedBytes: number; // bytes/sec
  uploadSpeedBytes: number;
  etaSeconds: number | null;
  connectedPeers: number;
  totalSwarmPeers: number;
  piecesTotal: number;
  piecesCompleted: number[]; // array of 0 | 1 | 2 (0: empty, 1: active, 2: verified)
  startedAt: string;
  files: TorrentFileEntry[];
  peers: PeerConnectionInfo[];
  trackerStatus: { url: string; status: 'announcing' | 'connected' | 'peers-found'; peers: number }[];
  activeStreamFileIndex?: number;
  speedHistory?: SpeedSample[];
  swarmHealthHistory?: SwarmHealthSample[];
}

export interface CustomWssTrackerEntry {
  url: string;
  enabled: boolean;
  addedAt?: string;
  lastTested?: string;
  status?: 'online' | 'offline' | 'untested';
  latencyMs?: number;
  label?: string;
}

export interface DeviceClientConfig {
  preferredApp: 'default-magnet' | 'qbittorrent' | 'transmission' | 'deluge' | 'aria2';
  autoAppendTrackers: boolean;
  customTrackers: string[];
  customWssTrackers?: string[];
  autoAppendWssTrackers?: boolean;
  customWssTrackerEntries?: CustomWssTrackerEntry[];
  rpcEnabled: boolean;
  rpcEndpoint: string;
  rpcToken: string;
  stripMagnetProtocol?: boolean;
  disableMagnetProtocol?: boolean;
}

export type AccentThemeId =
  | 'sky'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet';

export interface AccentThemePreset {
  id: AccentThemeId;
  label: string;
  description: string;
  accent300: string;
  accent400: string;
  accent500: string;
  accent600: string;
}

export const ACCENT_THEME_PRESETS: AccentThemePreset[] = [
  {
    id: 'sky',
    label: 'Sky',
    description: 'High-craft cyan & sky blue primary telemetry accent',
    accent300: '#7dd3fc',
    accent400: '#38bdf8',
    accent500: '#0ea5e9',
    accent600: '#0284c7',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    description: 'Deep electric indigo for low-glare night indexing',
    accent300: '#a5b4fc',
    accent400: '#818cf8',
    accent500: '#6366f1',
    accent600: '#4f46e5',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Swarm seeder emerald with high-contrast terminal clarity',
    accent300: '#6ee7b7',
    accent400: '#34d399',
    accent500: '#10b981',
    accent600: '#059669',
  },
  {
    id: 'amber',
    label: 'Amber',
    description: 'Warm precision amber for high-visibility transfer controls',
    accent300: '#fcd34d',
    accent400: '#fbbf24',
    accent500: '#f59e0b',
    accent600: '#d97706',
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Crisp crimson rose accent for dark studio environments',
    accent300: '#fda4af',
    accent400: '#fb7185',
    accent500: '#f43f5e',
    accent600: '#e11d48',
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Vibrant ultraviolet tone for media streaming workspaces',
    accent300: '#c4b5fd',
    accent400: '#a78bfa',
    accent500: '#8b5cf6',
    accent600: '#7c3aed',
  },
];

