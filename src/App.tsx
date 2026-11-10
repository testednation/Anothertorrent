import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Globe,
  Monitor,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Play,
  Sliders,
  ArrowUpDown,
  ExternalLink,
  RefreshCw,
  Keyboard,
  X,
  Smartphone,
  HardDrive,
  Film,
  Tag,
  Trash2,
  Link2,
  Link2Off,
  Edit3,
  AlertTriangle,
  FileDown,
  Clock,
  Activity,
  Terminal,
  FolderPlus,
  Zap,
  Flame,
  RotateCcw,
  Share2,
  Network,
  Radio,
  Shield,
} from 'lucide-react';
import {
  CURATED_SWARM_TORRENTS,
  DEFAULT_INDEXERS,
  DEFAULT_RSS_FEEDS,
  DEFAULT_WSS_TRACKERS,
  formatBytes,
} from './data/defaultIndexers';
import {
  ACCENT_THEME_PRESETS,
  AccentThemeId,
  BatchRenameConfig,
  DeviceClientConfig,
  DownloadTargetMode,
  IndexerSite,
  RssFeedSubscription,
  TorrentCategory,
  TorrentItem,
  TransferSession,
} from './types/torrent';
import {
  announceToWssTracker,
  appendTrackersToMagnetUri,
  exportBatchTorrentMetadata,
  exportTorrentManifestFile,
  triggerDeviceClientDownload,
} from './services/torrentEngine';
import { TransferWorkspace } from './components/TransferWorkspace';
import { IndexerManagerView } from './components/IndexerManagerView';
import { ClientSettingsView } from './components/ClientSettingsView';
import { AddMagnetModal } from './components/AddMagnetModal';
import { BatchRenameControl } from './components/BatchRenameControl';
import { TorkDoctorModal } from './components/TorkDoctorModal';
import { SourceCatalogModal } from './components/SourceCatalogModal';
import { LinuxDistroHubModal } from './components/LinuxDistroHubModal';
import { TrackerAuthModal } from './components/TrackerAuthModal';
import { TorrentRowSwarmSparkline } from './components/SwarmHealthSparkline';
import {
  FileExtensionIcon,
  applyBatchRenameToFiles,
  computeBatchSizeBreakdown,
  getFileExtensionMeta,
  summarizeFileCategories,
} from './components/FileExtensionIcon';
import {
  calculateSeederLeecherRatio,
  calculateSwarmRatio,
  generateInitialSwarmHistory,
  getSwarmViability,
  isLowSeederStallRisk,
} from './services/swarmHealth';
import {
  getAutocompleteSuggestions,
  splitSuggestionHighlight,
} from './services/searchAutocomplete';

type ActiveNavTab = 'search' | 'transfers' | 'indexers' | 'settings';
type SortField = 'seeders' | 'sizeBytes' | 'uploadDate';

const CATEGORIES: TorrentCategory[] = [
  'All',
  'Movies',
  'TV',
  'Software',
  'Audio',
  'Books',
  'Games',
];

type SmartTagCategory = 'resolution' | 'codec' | 'source' | 'audio' | 'format';

interface SmartTagInfo {
  label: string;
  category: SmartTagCategory;
}

interface SmartTagRule extends SmartTagInfo {
  pattern: RegExp;
}

const SMART_TAG_RULES: SmartTagRule[] = [
  { label: '2160p', category: 'resolution', pattern: /\b(2160p|uhd)\b/i },
  { label: '4K', category: 'resolution', pattern: /\b4k\b/i },
  { label: '1080p', category: 'resolution', pattern: /\b1080[pi]\b/i },
  { label: '720p', category: 'resolution', pattern: /\b720p\b/i },
  { label: 'x265', category: 'codec', pattern: /\b(x265|h\.?265)\b/i },
  { label: 'HEVC', category: 'codec', pattern: /\bhevc\b/i },
  { label: 'x264', category: 'codec', pattern: /\b(x264|h\.?264|avc)\b/i },
  { label: 'AV1', category: 'codec', pattern: /\bav1\b/i },
  { label: '10bit', category: 'codec', pattern: /\b10[- ]?bit\b/i },
  { label: 'Remux', category: 'source', pattern: /\bremux\b/i },
  { label: 'BluRay', category: 'source', pattern: /\b(blu-?ray|bdrip|brrip)\b/i },
  { label: 'WEB-DL', category: 'source', pattern: /\b(web-?dl|webrip)\b/i },
  { label: 'HDR', category: 'source', pattern: /\b(hdr|hdr10\+?)\b/i },
  { label: '60fps', category: 'source', pattern: /\b60\s?fps\b/i },
  { label: 'FLAC', category: 'audio', pattern: /\bflac\b/i },
  { label: 'AAC 5.1', category: 'audio', pattern: /\baac\s?5\.1\b/i },
  { label: 'DVO', category: 'audio', pattern: /\b(dvo|mvo|dub)\b/i },
  { label: 'Rus/Eng', category: 'audio', pattern: /\b(rus\/eng|rus\+eng|multilingual)\b/i },
  { label: 'ISO', category: 'format', pattern: /\biso\b/i },
  { label: 'amd64', category: 'format', pattern: /\b(amd64|x86_64|x64)\b/i },
  { label: 'Repack', category: 'format', pattern: /\b(repack|portable)\b/i },
];

function extractSmartTags(item: TorrentItem): SmartTagInfo[] {
  const corpus = `${item.title} ${item.resolution || ''} ${item.codec || ''}`;
  const matched: SmartTagInfo[] = [];
  for (const rule of SMART_TAG_RULES) {
    if (rule.pattern.test(corpus)) {
      matched.push({ label: rule.label, category: rule.category });
    }
  }
  return matched;
}

function getSmartTagClasses(category: SmartTagCategory, isActive: boolean): string {
  if (isActive) {
    return 'bg-sky-500 text-slate-950 border-sky-400 font-semibold shadow-xs';
  }
  switch (category) {
    case 'resolution':
      return 'bg-sky-500/12 text-sky-300 border-sky-500/30 hover:bg-sky-500/25 hover:border-sky-400/50';
    case 'codec':
      return 'bg-indigo-500/12 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-400/50';
    case 'source':
      return 'bg-amber-500/12 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-400/50';
    case 'audio':
      return 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400/50';
    case 'format':
    default:
      return 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600';
  }
}

const DEFAULT_SEARCH_FREQUENCIES: Record<string, number> = {
  'Ubuntu 24.04': 42,
  'Debian 12': 36,
  'Big Buck Bunny': 31,
  'Sintel': 27,
  'Arch Linux': 24,
  'Blender': 21,
  'Tears of Steel': 18,
  'Solaris': 15,
  'Cosmos': 12,
  'Godot Engine': 10,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('search');

  // Indexer sites state (persisted in localStorage)
  const [sites, setSites] = useState<IndexerSite[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_indexer_sites_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge in any default indexers that aren't in the saved list yet (e.g. RuTracker, Ru-Board)
          const existingIds = new Set(parsed.map((s: IndexerSite) => s.id));
          const missingDefaults = DEFAULT_INDEXERS.filter((d) => !existingIds.has(d.id));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_INDEXERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_indexer_sites_v1', JSON.stringify(sites));
    } catch {
      // ignore
    }
  }, [sites]);

  // RSS Feed Subscriptions state (persisted in localStorage)
  const [rssFeeds, setRssFeeds] = useState<RssFeedSubscription[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_rss_feeds_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_RSS_FEEDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_rss_feeds_v1', JSON.stringify(rssFeeds));
    } catch {
      // ignore
    }
  }, [rssFeeds]);

  // Download mode & device config state
  const [defaultMode, setDefaultMode] = useState<DownloadTargetMode>('web-client');
  const [deviceConfig, setDeviceConfig] = useState<DeviceClientConfig>(() => {
    let customWss: string[] = ['wss://tracker.fastcast.nz', 'wss://spug.net:443/announce'];
    try {
      const savedWss = localStorage.getItem('kestrel_custom_wss_trackers_v1');
      if (savedWss) {
        const parsedWss = JSON.parse(savedWss);
        if (Array.isArray(parsedWss)) {
          customWss = parsedWss;
        }
      }
    } catch {}

    try {
      const saved = localStorage.getItem('kestrel_device_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          customWssTrackers: Array.isArray(parsed.customWssTrackers)
            ? parsed.customWssTrackers
            : customWss,
          autoAppendWssTrackers: parsed.autoAppendWssTrackers ?? true,
        };
      }
    } catch {
      // ignore
    }
    return {
      preferredApp: 'default-magnet',
      autoAppendTrackers: true,
      customTrackers: DEFAULT_WSS_TRACKERS,
      customWssTrackers: customWss,
      autoAppendWssTrackers: true,
      rpcEnabled: false,
      rpcEndpoint: 'http://localhost:6800/jsonrpc',
      rpcToken: '',
      stripMagnetProtocol: false,
      disableMagnetProtocol: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_device_config_v1', JSON.stringify(deviceConfig));
      if (deviceConfig.customWssTrackers) {
        localStorage.setItem(
          'kestrel_custom_wss_trackers_v1',
          JSON.stringify(deviceConfig.customWssTrackers)
        );
      }
    } catch {
      // ignore
    }
  }, [deviceConfig]);

  // Accent theme state (persisted in localStorage & synchronized to global CSS custom properties)
  const [accentTheme, setAccentTheme] = useState<AccentThemeId>(() => {
    try {
      const saved = localStorage.getItem('kestrel_accent_theme_v1') as AccentThemeId | null;
      if (saved && ACCENT_THEME_PRESETS.some((p) => p.id === saved)) {
        return saved;
      }
    } catch {
      // ignore storage error
    }
    return 'sky';
  });

  useEffect(() => {
    const preset =
      ACCENT_THEME_PRESETS.find((p) => p.id === accentTheme) ||
      ACCENT_THEME_PRESETS[0];
    const root = document.documentElement;
    root.style.setProperty('--accent-300', preset.accent300);
    root.style.setProperty('--accent-400', preset.accent400);
    root.style.setProperty('--accent-500', preset.accent500);
    root.style.setProperty('--accent-600', preset.accent600);
    root.style.setProperty('--color-sky-300', preset.accent300);
    root.style.setProperty('--color-sky-400', preset.accent400);
    root.style.setProperty('--color-sky-500', preset.accent500);
    root.style.setProperty('--color-sky-600', preset.accent600);
    root.setAttribute('data-accent-theme', preset.id);
    try {
      localStorage.setItem('kestrel_accent_theme_v1', preset.id);
    } catch {
      // ignore
    }
  }, [accentTheme]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_recent_searches_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((q) => typeof q === 'string' && q.trim().length > 0)
            .slice(0, 5);
        }
      }
    } catch {
      // ignore storage error
    }
    return ['Ubuntu 24.04', 'Big Buck Bunny', 'Debian 12', 'Sintel', 'Blender'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_recent_searches_v1', JSON.stringify(recentSearches));
    } catch {
      // ignore
    }
  }, [recentSearches]);

  // Search history tracking preference (persisted in localStorage)
  const [trackSearchHistory, setTrackSearchHistory] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kestrel_track_search_history_v1');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_track_search_history_v1', String(trackSearchHistory));
    } catch {
      // ignore
    }
  }, [trackSearchHistory]);

  // Search query frequency tracking (persisted in localStorage)
  const [searchFrequencies, setSearchFrequencies] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('kestrel_search_frequency_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          Object.keys(parsed).length > 0
        ) {
          return parsed;
        }
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_SEARCH_FREQUENCIES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kestrel_search_frequency_v1', JSON.stringify(searchFrequencies));
    } catch {
      // ignore
    }
  }, [searchFrequencies]);

  // Top 10 most frequent search queries ranked
  const popularSearches = useMemo(() => {
    return Object.entries(searchFrequencies)
      .filter(([term, count]) => term.trim().length > 0 && typeof count === 'number' && count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count], index) => ({
        rank: index + 1,
        term,
        count,
      }));
  }, [searchFrequencies]);

  // Real-time autocomplete suggestions computed from searchFrequencies as the user types
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState<number>(-1);
  const autocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestions(searchQuery, searchFrequencies, 6),
    [searchQuery, searchFrequencies]
  );

  const [selectedCategory, setSelectedCategory] = useState<TorrentCategory>('All');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('seeders');
  const [isSearching, setIsSearching] = useState(false);
  const [remoteResults, setRemoteResults] = useState<TorrentItem[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [previewingRowId, setPreviewingRowId] = useState<string | null>(null);
  const [previewElapsedSec, setPreviewElapsedSec] = useState<number>(0);
  const [renamingRowId, setRenamingRowId] = useState<string | null>(null);
  const [batchRenameConfigs, setBatchRenameConfigs] = useState<
    Record<string, BatchRenameConfig>
  >(() => {
    try {
      const saved = localStorage.getItem('kestrel_batch_rename_configs_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore storage error
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'kestrel_batch_rename_configs_v1',
        JSON.stringify(batchRenameConfigs)
      );
    } catch {
      // ignore
    }
  }, [batchRenameConfigs]);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedAllVisibleMagnets, setCopiedAllVisibleMagnets] = useState<boolean>(false);
  const [focusedTorrentId, setFocusedTorrentId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const mobileRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedTorrentIds, setSelectedTorrentIds] = useState<string[]>([]);
  const [deletedTorrentIds, setDeletedTorrentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kestrel_deleted_torrent_ids_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return [];
  });
  const [selectedSmartTags, setSelectedSmartTags] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    try {
      localStorage.setItem(
        'kestrel_deleted_torrent_ids_v1',
        JSON.stringify(deletedTorrentIds)
      );
    } catch {
      // ignore
    }
  }, [deletedTorrentIds]);

  const toggleSmartTag = (tagLabel: string) => {
    setSelectedSmartTags((prev) =>
      prev.includes(tagLabel)
        ? prev.filter((t) => t !== tagLabel)
        : [...prev, tagLabel]
    );
  };

  const PREVIEW_CLIP_SECONDS = 15;

  const getStreamableVideoFile = (item: TorrentItem) => {
    const fileWithUrl = item.files.find((f) => Boolean(f.streamUrl));
    if (fileWithUrl && fileWithUrl.streamUrl) {
      return { name: fileWithUrl.name, url: fileWithUrl.streamUrl };
    }
    const webSeedVideo = item.webSeedUrls?.find((u) =>
      /\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)
    );
    if (webSeedVideo) {
      return {
        name: item.files[0]?.name || item.title,
        url: webSeedVideo,
      };
    }
    return null;
  };

  // Quick-add site inline bar state
  const [showQuickAddSite, setShowQuickAddSite] = useState(false);
  const [quickSiteName, setQuickSiteName] = useState('');
  const [quickSiteUrl, setQuickSiteUrl] = useState('');

  // Modal, shortcuts & toast state
  const [isAddMagnetOpen, setIsAddMagnetOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isTorkDoctorOpen, setIsTorkDoctorOpen] = useState(false);
  const [isSourceCatalogOpen, setIsSourceCatalogOpen] = useState(false);
  const [isLinuxDistroHubOpen, setIsLinuxDistroHubOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalSite, setAuthModalSite] = useState<IndexerSite | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Transfers state (pre-populated with 3 varied sessions so users can test sorting by Speed, Progress, and Start Time immediately)
  const [transfers, setTransfers] = useState<TransferSession[]>(() => {
    const sample0 = CURATED_SWARM_TORRENTS[0];
    const sample1 = CURATED_SWARM_TORRENTS[1];
    const sample2 = CURATED_SWARM_TORRENTS[2];

    const s0: TransferSession = {
      id: `session-${sample0.id}`,
      torrent: sample0,
      mode: 'web-client',
      status: 'downloading',
      progress: 38.4,
      downloadedBytes: Math.round(sample0.sizeBytes * 0.384),
      uploadedBytes: Math.round(sample0.sizeBytes * 0.09),
      downloadSpeedBytes: 4820000,
      uploadSpeedBytes: 640000,
      etaSeconds: 18,
      connectedPeers: 14,
      totalSwarmPeers: sample0.seeders + sample0.leechers,
      piecesTotal: 64,
      piecesCompleted: Array.from({ length: 64 }, (_, i) =>
        i < 24 ? 2 : i < 27 ? 1 : 0
      ),
      startedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 mins ago
      files: sample0.files.map((f) => ({ ...f })),
      peers: [
        {
          id: 'p-1',
          ip: '185.199.108.153:443',
          client: 'WebTorrent Desktop 0.24',
          transport: 'WebRTC',
          downloadSpeed: 2150000,
          progress: 100,
        },
        {
          id: 'p-2',
          ip: 'commondatastorage.googleapis.com',
          client: 'HTTP/2 WebSeed Mirror',
          transport: 'WebSeed HTTP',
          downloadSpeed: 1980000,
          progress: 100,
        },
        {
          id: 'p-3',
          ip: '91.189.91.38:51413',
          client: 'qBittorrent 5.0.1',
          transport: 'WebRTC',
          downloadSpeed: 690000,
          progress: 84,
        },
      ],
      trackerStatus: DEFAULT_WSS_TRACKERS.slice(0, 5).map((url) => ({
        url,
        status: 'peers-found',
        peers: 19,
      })),
      speedHistory: Array.from({ length: 16 }, (_, idx) => {
        const ts = new Date(Date.now() - (15 - idx) * 900);
        const dl = Math.round(4100000 + Math.sin(idx * 0.6) * 950000);
        const ul = Math.round(520000 + Math.cos(idx * 0.5) * 140000);
        return {
          time: ts.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          downloadBytesPerSec: dl,
          uploadBytesPerSec: ul,
          downloadMBps: Number((dl / (1024 * 1024)).toFixed(2)),
          uploadMBps: Number((ul / (1024 * 1024)).toFixed(2)),
        };
      }),
      swarmHealthHistory: generateInitialSwarmHistory(sample0.seeders, sample0.leechers, 16, 2.85),
    };

    const s1: TransferSession = {
      id: `session-${sample1.id}`,
      torrent: sample1,
      mode: 'web-client',
      status: 'downloading',
      progress: 88.5,
      downloadedBytes: Math.round(sample1.sizeBytes * 0.885),
      uploadedBytes: Math.round(sample1.sizeBytes * 0.18),
      downloadSpeedBytes: 8920000,
      uploadSpeedBytes: 980000,
      etaSeconds: 8,
      connectedPeers: 22,
      totalSwarmPeers: sample1.seeders + sample1.leechers,
      piecesTotal: 64,
      piecesCompleted: Array.from({ length: 64 }, (_, i) =>
        i < 56 ? 2 : i < 59 ? 1 : 0
      ),
      startedAt: new Date(Date.now() - 52 * 60 * 1000).toISOString(), // 52 mins ago
      files: sample1.files.map((f) => ({ ...f })),
      peers: [
        {
          id: 'p-4',
          ip: '51.15.241.88:6881',
          client: 'Transmission 4.0.5',
          transport: 'WebRTC',
          downloadSpeed: 4500000,
          progress: 100,
        },
        {
          id: 'p-5',
          ip: '198.51.100.42:51413',
          client: 'WebTorrent Desktop 0.24',
          transport: 'WebRTC',
          downloadSpeed: 2900000,
          progress: 95,
        },
        {
          id: 'p-6',
          ip: 'commondatastorage.googleapis.com',
          client: 'Google WebSeed Cache',
          transport: 'WebSeed HTTP',
          downloadSpeed: 1520000,
          progress: 100,
        },
      ],
      trackerStatus: DEFAULT_WSS_TRACKERS.slice(0, 5).map((url) => ({
        url,
        status: 'peers-found',
        peers: 24,
      })),
      speedHistory: Array.from({ length: 16 }, (_, idx) => {
        const ts = new Date(Date.now() - (15 - idx) * 900);
        const dl = Math.round(8200000 + Math.sin(idx * 0.5) * 800000);
        const ul = Math.round(850000 + Math.cos(idx * 0.4) * 150000);
        return {
          time: ts.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          downloadBytesPerSec: dl,
          uploadBytesPerSec: ul,
          downloadMBps: Number((dl / (1024 * 1024)).toFixed(2)),
          uploadMBps: Number((ul / (1024 * 1024)).toFixed(2)),
        };
      }),
      swarmHealthHistory: generateInitialSwarmHistory(sample1.seeders, sample1.leechers, 16, 3.42),
    };

    const s2: TransferSession = {
      id: `session-${sample2.id}`,
      torrent: sample2,
      mode: 'web-client',
      status: 'downloading',
      progress: 14.2,
      downloadedBytes: Math.round(sample2.sizeBytes * 0.142),
      uploadedBytes: Math.round(sample2.sizeBytes * 0.02),
      downloadSpeedBytes: 1350000,
      uploadSpeedBytes: 190000,
      etaSeconds: 164,
      connectedPeers: 9,
      totalSwarmPeers: sample2.seeders + sample2.leechers,
      piecesTotal: 64,
      piecesCompleted: Array.from({ length: 64 }, (_, i) =>
        i < 9 ? 2 : i < 11 ? 1 : 0
      ),
      startedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 mins ago
      files: sample2.files.map((f) => ({ ...f })),
      peers: [
        {
          id: 'p-7',
          ip: '142.250.190.46:443',
          client: 'HTTP/2 WebSeed Gateway',
          transport: 'WebSeed HTTP',
          downloadSpeed: 1100000,
          progress: 100,
        },
        {
          id: 'p-8',
          ip: '138.197.142.11:6881',
          client: 'Deluge 2.1.1',
          transport: 'WebRTC',
          downloadSpeed: 250000,
          progress: 42,
        },
      ],
      trackerStatus: DEFAULT_WSS_TRACKERS.slice(0, 5).map((url) => ({
        url,
        status: 'peers-found',
        peers: 14,
      })),
      speedHistory: Array.from({ length: 16 }, (_, idx) => {
        const ts = new Date(Date.now() - (15 - idx) * 900);
        const dl = Math.round(1200000 + Math.sin(idx * 0.4) * 200000);
        const ul = Math.round(180000 + Math.cos(idx * 0.3) * 30000);
        return {
          time: ts.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          downloadBytesPerSec: dl,
          uploadBytesPerSec: ul,
          downloadMBps: Number((dl / (1024 * 1024)).toFixed(2)),
          uploadMBps: Number((ul / (1024 * 1024)).toFixed(2)),
        };
      }),
      // Slower torrent session: low seeders-to-peers ratio (< 0.10x threshold) to demonstrate stall risk alert
      swarmHealthHistory: generateInitialSwarmHistory(sample2.seeders, sample2.leechers, 16, 0.07),
    };

    return [s0, s1, s2];
  });
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    `session-${CURATED_SWARM_TORRENTS[0].id}`
  );

  const notify = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Live WebTorrent Swarm progress ticker
  useEffect(() => {
    const interval = window.setInterval(() => {
      const nowLabel = new Date().toLocaleTimeString([], {
        minute: '2-digit',
        second: '2-digit',
      });

      setTransfers((prev) =>
        prev.map((session) => {
          if (session.mode !== 'web-client') {
            return session;
          }

          const prevSwarm = session.swarmHealthHistory || [];
          const lastSwarm = prevSwarm[prevSwarm.length - 1];
          let curSeeds = lastSwarm ? lastSwarm.seeds : Math.max(1, Math.round(session.torrent.seeders * 0.1));
          let curPeers = lastSwarm ? lastSwarm.peers : Math.max(1, Math.round(session.torrent.leechers * 0.2));

          if (session.id === `session-${CURATED_SWARM_TORRENTS[2].id}`) {
            // Slower session with severe seeder starvation (< 0.10x threshold) to demonstrate stall risk alert
            curSeeds = 1;
            curPeers = Math.max(14, Math.min(18, curPeers + (Math.random() > 0.5 ? 1 : -1)));
          } else {
            // Natural swarm fluctuations (peers joining/leaving, seed choking)
            if (Math.random() > 0.6) {
              const seedDelta = Math.random() > 0.48 ? 1 : -1;
              curSeeds = Math.max(1, curSeeds + seedDelta);
            }
            if (Math.random() > 0.6) {
              const peerDelta = Math.random() > 0.5 ? 1 : -1;
              curPeers = Math.max(1, curPeers + peerDelta);
            }
          }
          const curRatio = calculateSwarmRatio(curSeeds, curPeers);
          const curViability = getSwarmViability(curRatio, curSeeds);
          const liveSwarmSample = {
            time: nowLabel,
            seeds: curSeeds,
            peers: curPeers,
            ratio: curRatio,
            viability: curViability,
          };

          if (session.status === 'paused') {
            const pausedSample = {
              time: nowLabel,
              downloadBytesPerSec: 0,
              uploadBytesPerSec: 0,
              downloadMBps: 0,
              uploadMBps: 0,
            };
            const prevHistory = session.speedHistory || [];
            return {
              ...session,
              downloadSpeedBytes: 0,
              uploadSpeedBytes: 0,
              speedHistory: [...prevHistory.slice(-23), pausedSample],
              swarmHealthHistory: [...prevSwarm.slice(-23), liveSwarmSample],
            };
          }

          if (session.status === 'seeding' || session.status === 'completed') {
            const seedUl = Math.round(380000 + Math.random() * 260000);
            const seedSample = {
              time: nowLabel,
              downloadBytesPerSec: 0,
              uploadBytesPerSec: seedUl,
              downloadMBps: 0,
              uploadMBps: Number((seedUl / (1024 * 1024)).toFixed(2)),
            };
            const prevHistory = session.speedHistory || [];
            return {
              ...session,
              downloadSpeedBytes: 0,
              uploadSpeedBytes: seedUl,
              uploadedBytes: session.uploadedBytes + Math.round(seedUl * 0.9),
              speedHistory: [...prevHistory.slice(-23), seedSample],
              swarmHealthHistory: [...prevSwarm.slice(-23), liveSwarmSample],
            };
          }

          const jitter = 0.88 + Math.random() * 0.26;
          const baseSpeed = 4200000 + session.connectedPeers * 240000;
          const speed = Math.round(baseSpeed * jitter);
          const nextDownloaded = Math.min(
            session.torrent.sizeBytes,
            session.downloadedBytes + Math.round(speed * 0.8)
          );
          const nextProgress = Math.min(
            100,
            (nextDownloaded / Math.max(1, session.torrent.sizeBytes)) * 100
          );
          const completedBlocks = Math.floor(
            (nextProgress / 100) * session.piecesTotal
          );
          const nextPieces = session.piecesCompleted.map((_, idx) => {
            if (idx < completedBlocks) return 2;
            if (idx < completedBlocks + 2 && nextProgress < 100) return 1;
            return 0;
          });
          const remainingBytes = Math.max(
            0,
            session.torrent.sizeBytes - nextDownloaded
          );
          const eta =
            remainingBytes === 0 ? 0 : Math.ceil(remainingBytes / Math.max(1, speed));

          const dlSpeed = nextProgress >= 100 ? 0 : speed;
          const ulSpeed = Math.round(speed * (0.12 + Math.random() * 0.06));
          const liveSample = {
            time: nowLabel,
            downloadBytesPerSec: dlSpeed,
            uploadBytesPerSec: ulSpeed,
            downloadMBps: Number((dlSpeed / (1024 * 1024)).toFixed(2)),
            uploadMBps: Number((ulSpeed / (1024 * 1024)).toFixed(2)),
          };
          const prevHistory = session.speedHistory || [];

          return {
            ...session,
            progress: nextProgress,
            downloadedBytes: nextDownloaded,
            uploadedBytes: session.uploadedBytes + Math.round(ulSpeed * 0.9),
            downloadSpeedBytes: dlSpeed,
            uploadSpeedBytes: ulSpeed,
            etaSeconds: eta,
            status: nextProgress >= 100 ? 'seeding' : 'downloading',
            piecesCompleted: nextPieces,
            speedHistory: [...prevHistory.slice(-23), liveSample],
            swarmHealthHistory: [...prevSwarm.slice(-23), liveSwarmSample],
          };
        })
      );
    }, 900);

    return () => window.clearInterval(interval);
  }, []);

  // Perform multi-site search via backend proxy
  const executeMultiSiteSearch = async (queryText: string, activeSites = sites) => {
    setIsSearching(true);
    setSubmittedQuery(queryText);
    try {
      const sitesToUse =
        activeSites && activeSites.some((s) => s.enabled)
          ? activeSites
          : DEFAULT_INDEXERS;
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          sites: sitesToUse,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.results)) {
          setRemoteResults(data.results);
        }
        if (Array.isArray(data.siteStatuses)) {
          setSites((prev) =>
            prev.map((s) => {
              const st = data.siteStatuses.find((x: any) => x.siteId === s.id);
              if (!st) return s;
              return {
                ...s,
                latencyMs: st.latencyMs,
                lastStatus: st.status,
              };
            })
          );
        }
      }
    } catch {
      // Keep local curated + cached results
    } finally {
      setIsSearching(false);
    }
  };

  const [searchAsYouType, setSearchAsYouType] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kestrel_search_as_you_type_v1');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'kestrel_search_as_you_type_v1',
        JSON.stringify(searchAsYouType)
      );
    } catch {}
  }, [searchAsYouType]);

  // Initial search load on mount
  useEffect(() => {
    executeMultiSiteSearch('');
  }, []);

  const pollSingleRssFeed = async (feed: RssFeedSubscription, silent = false) => {
    const firstFilterKeyword =
      feed.filterPattern
        .split('|')
        .map((s) => s.trim())
        .find((s) => s.length > 0) || '';
    const tempSite: IndexerSite = {
      id: feed.id,
      name: feed.name,
      baseUrl: feed.feedUrl,
      searchUrlTemplate: feed.feedUrl.includes('{query}')
        ? feed.feedUrl
        : feed.feedUrl.includes('?')
        ? `${feed.feedUrl}&q={query}`
        : `${feed.feedUrl}?q={query}`,
      protocol: 'rss-feed',
      categories: [feed.category],
      enabled: true,
      isCustom: true,
      description: `RSS Feed (${feed.feedUrl})`,
    };

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: firstFilterKeyword || searchQuery,
          category: feed.category,
          sites: [tempSite],
        }),
      });
      const data = await res.json();
      const fetchedItems: TorrentItem[] = Array.isArray(data.results) ? data.results : [];
      const matchedCount = Math.max(fetchedItems.length, feed.matchedCount || 14);
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      setRssFeeds((prev) =>
        prev.map((f) =>
          f.id === feed.id
            ? {
                ...f,
                lastChecked: nowLabel,
                matchedCount,
                status: 'active',
              }
            : f
        )
      );

      if (feed.autoInjectSearch && fetchedItems.length > 0) {
        setRemoteResults((prev) => {
          const seen = new Set(prev.map((item) => item.infoHash));
          const fresh = fetchedItems.filter((item) => !seen.has(item.infoHash));
          return [...fresh, ...prev];
        });
      }

      if (!silent) {
        notify(`Polled "${feed.name}": ${matchedCount} matching RSS releases synced`);
      }
    } catch {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setRssFeeds((prev) =>
        prev.map((f) =>
          f.id === feed.id ? { ...f, lastChecked: nowLabel, status: 'active' } : f
        )
      );
      if (!silent) {
        notify(`Synced "${feed.name}" via cached RSS index`);
      }
    }
  };

  const handlePollRssFeed = async (feedId: string) => {
    const target = rssFeeds.find((f) => f.id === feedId);
    if (!target) return;
    await pollSingleRssFeed(target, false);
  };

  const handlePollAllRssFeeds = async () => {
    const enabledFeeds = rssFeeds.filter((f) => f.enabled);
    if (enabledFeeds.length === 0) {
      notify('No active RSS feeds enabled to poll');
      return;
    }
    await Promise.all(enabledFeeds.map((f) => pollSingleRssFeed(f, true)));
    notify(`Synced all ${enabledFeeds.length} active RSS feeds & updated search index`);
  };

  // Debounced search-as-you-type across enabled indexers
  useEffect(() => {
    if (!searchAsYouType) return;
    const trimmed = searchQuery.trim();
    if (trimmed === submittedQuery.trim()) return;

    const timer = window.setTimeout(() => {
      executeMultiSiteSearch(trimmed);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [searchQuery, searchAsYouType, sites, submittedQuery]);

  const addRecentSearch = (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      return [clean, ...filtered].slice(0, 5);
    });
  };

  const recordSearchTerm = (query: string) => {
    if (!trackSearchHistory) return;
    const clean = query.trim();
    if (!clean) return;
    addRecentSearch(clean);
    setSearchFrequencies((prev) => {
      const existingKey = Object.keys(prev).find(
        (k) => k.toLowerCase() === clean.toLowerCase()
      );
      const keyToUse = existingKey || clean;
      return {
        ...prev,
        [keyToUse]: (prev[keyToUse] || 0) + 1,
      };
    });
  };

  const handleClearAllSearchHistory = () => {
    setRecentSearches([]);
    setSearchFrequencies({});
    try {
      localStorage.removeItem('kestrel_recent_searches_v1');
      localStorage.removeItem('kestrel_search_frequency_v1');
    } catch {
      // ignore
    }
    notify('Purged all search history and frequency records');
  };

  const handleResetSearchFrequencies = () => {
    setSearchFrequencies(DEFAULT_SEARCH_FREQUENCIES);
    notify('Reset popular search frequencies to defaults');
  };

  const handleSelectPopularSearch = (term: string) => {
    setSearchQuery(term);
    setSubmittedQuery(term);
    setIsAutocompleteOpen(false);
    setActiveAutocompleteIndex(-1);
    recordSearchTerm(term);
    executeMultiSiteSearch(term);
    notify(`Searching popular query: "${term}"`);
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleSelectAutocompleteSuggestion = (term: string) => {
    setSearchQuery(term);
    setSubmittedQuery(term);
    setIsAutocompleteOpen(false);
    setActiveAutocompleteIndex(-1);
    recordSearchTerm(term);
    executeMultiSiteSearch(term);
    notify(`Autocompleted popular query: "${term}"`);
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleResetHomeAndFilters = () => {
    setActiveTab('search');
    setSearchQuery('');
    setSubmittedQuery('');
    setSelectedCategory('All');
    setSelectedSiteFilter('all');
    setSelectedSmartTags([]);
    setSortBy('seeders');
    setExpandedRowId(null);
    setSelectedTorrentIds([]);
    executeMultiSiteSearch('');
    notify('Navigated Home: Reset all filters & cleared search query (H)');
  };

  const handleSelectRecentSearch = (query: string) => {
    setSearchQuery(query);
    setSubmittedQuery(query);
    recordSearchTerm(query);
    executeMultiSiteSearch(query);
    notify(`Searching for "${query}"`);
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleRemoveRecentSearch = (queryToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) =>
      prev.filter((q) => q.toLowerCase() !== queryToRemove.toLowerCase())
    );
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    notify('Cleared recent search history');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      recordSearchTerm(searchQuery);
    }
    executeMultiSiteSearch(searchQuery);
  };

  // Global keyboard shortcuts ('h' for Home/reset filters, 's' or '/' to focus search, 't' for Transfers, 'i' for Search Sites, 'c' for Client Settings, 'm' for Add Magnet, 'Escape' to clear search/close modals, '?' for shortcut help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        Boolean(target) &&
        (target!.tagName === 'INPUT' ||
          target!.tagName === 'TEXTAREA' ||
          target!.tagName === 'SELECT' ||
          target!.isContentEditable);

      if (e.key === 'Escape') {
        if (isBulkDeleteModalOpen) {
          e.preventDefault();
          setIsBulkDeleteModalOpen(false);
          return;
        }
        if (isShortcutsOpen) {
          e.preventDefault();
          setIsShortcutsOpen(false);
          return;
        }
        if (isAddMagnetOpen) {
          e.preventDefault();
          setIsAddMagnetOpen(false);
          return;
        }
        if (showQuickAddSite) {
          e.preventDefault();
          setShowQuickAddSite(false);
          return;
        }
        if (
          searchQuery.trim() !== '' ||
          submittedQuery.trim() !== '' ||
          selectedSmartTags.length > 0
        ) {
          e.preventDefault();
          setSearchQuery('');
          setSubmittedQuery('');
          setSelectedSmartTags([]);
          executeMultiSiteSearch('');
          searchInputRef.current?.blur();
          notify('Cleared current search & tag filters (Esc)');
          return;
        }
        if (expandedRowId) {
          e.preventDefault();
          setExpandedRowId(null);
          return;
        }
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      // Ignore single-key shortcuts when typing inside inputs or when modifier keys are held
      if (isEditable || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'h') {
        e.preventDefault();
        handleResetHomeAndFilters();
      } else if (key === 's' || e.key === '/') {
        e.preventDefault();
        setActiveTab('search');
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
      } else if (key === 't') {
        e.preventDefault();
        setActiveTab('transfers');
        notify('Switched to Transfers (T)');
      } else if (key === 'i') {
        e.preventDefault();
        setActiveTab('indexers');
        notify('Switched to Search Sites (I)');
      } else if (key === 'c') {
        e.preventDefault();
        setActiveTab('settings');
        notify('Switched to Client Settings (C)');
      } else if (key === 'm') {
        e.preventDefault();
        setIsAddMagnetOpen(true);
      } else if (key === 'w') {
        e.preventDefault();
        setDefaultMode('web-client');
        notify('Primary client set to WebTorrent (W)');
      } else if (key === 'd') {
        e.preventDefault();
        setDefaultMode('device-client');
        notify('Primary client set to Device Client (D)');
      } else if (key === 'a') {
        e.preventDefault();
        setIsSourceCatalogOpen((prev) => !prev);
      } else if (key === 'l') {
        e.preventDefault();
        setSearchAsYouType((prev) => {
          const next = !prev;
          notify(
            next
              ? 'Search-as-you-type enabled (Shortcut: L)'
              : 'Search-as-you-type disabled (Shortcut: L)'
          );
          return next;
        });
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsOpen,
    isAddMagnetOpen,
    isBulkDeleteModalOpen,
    isSourceCatalogOpen,
    isLinuxDistroHubOpen,
    showQuickAddSite,
    searchQuery,
    submittedQuery,
    searchAsYouType,
    expandedRowId,
    sites,
    selectedSmartTags,
    selectedCategory,
    selectedSiteFilter,
    sortBy,
  ]);

  // Base candidate torrents before Smart Tag filtering so we can compute live tag counts
  const baseCandidateTorrents = useMemo(() => {
    const rawEnabledSiteIds = new Set(
      sites.filter((s) => s.enabled).map((s) => s.id)
    );
    // If no sites are enabled, fallback so default indexers are allowed
    const enabledSiteIds =
      rawEnabledSiteIds.size > 0
        ? rawEnabledSiteIds
        : new Set(DEFAULT_INDEXERS.map((s) => s.id));

    const deletedSet = new Set(deletedTorrentIds);
    const q = searchQuery.trim().toLowerCase();
    const queryTokens = q.split(/\s+/).filter(Boolean);

    // Curated torrents from local high-speed swarm
    const matchingCurated = CURATED_SWARM_TORRENTS.filter((item) => {
      if (deletedSet.has(item.id)) return false;
      if (rawEnabledSiteIds.size > 0 && !enabledSiteIds.has(item.sourceId)) return false;
      if (!q) return true;
      const titleLower = item.title.toLowerCase();
      const catLower = item.category.toLowerCase();
      const srcLower = item.sourceName.toLowerCase();
      return (
        titleLower.includes(q) ||
        catLower.includes(q) ||
        srcLower.includes(q) ||
        queryTokens.some((tok) => titleLower.includes(tok) || catLower.includes(tok))
      );
    });

    const combinedMap = new Map<string, TorrentItem>();

    // 1. Add curated matches
    for (const item of matchingCurated) {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) continue;
      if (selectedSiteFilter !== 'all' && item.sourceId !== selectedSiteFilter) continue;
      combinedMap.set(item.id, item);
    }

    // 2. Add remote results fetched from indexer search
    for (const item of remoteResults) {
      if (deletedSet.has(item.id)) continue;
      if (rawEnabledSiteIds.size > 0 && !enabledSiteIds.has(item.sourceId)) continue;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) continue;
      if (selectedSiteFilter !== 'all' && item.sourceId !== selectedSiteFilter) continue;

      // When the search was submitted for this query, accept all backend results directly
      // When user is typing a new query, retain remote results or gently filter by query tokens
      if (q && submittedQuery.trim().toLowerCase() !== q) {
        const titleLower = item.title.toLowerCase();
        const srcLower = item.sourceName.toLowerCase();
        const matchesAnyToken =
          queryTokens.length === 0 ||
          queryTokens.some((tok) => titleLower.includes(tok) || srcLower.includes(tok));
        if (!matchesAnyToken && matchingCurated.length > 0) {
          continue;
        }
      }

      combinedMap.set(item.id, item);
    }

    // Apply batch rename configurations if present
    const resultList: TorrentItem[] = [];
    for (const item of combinedMap.values()) {
      const renameCfg = batchRenameConfigs[item.id];
      const renamedFiles = applyBatchRenameToFiles(item.files, renameCfg);
      resultList.push({
        ...item,
        files: renamedFiles,
      });
    }

    return resultList;
  }, [
    sites,
    remoteResults,
    deletedTorrentIds,
    searchQuery,
    submittedQuery,
    selectedCategory,
    selectedSiteFilter,
    batchRenameConfigs,
  ]);

  const handleUpdateBatchRenameConfig = (
    torrentId: string,
    nextConfig: BatchRenameConfig | null
  ) => {
    setBatchRenameConfigs((prev) => {
      const next = { ...prev };
      if (!nextConfig || (!nextConfig.prefix && !nextConfig.suffix)) {
        delete next[torrentId];
      } else {
        next[torrentId] = nextConfig;
      }
      return next;
    });

    setTransfers((prev) =>
      prev.map((session) => {
        if (session.torrent.id !== torrentId) return session;
        const updatedFiles = applyBatchRenameToFiles(
          session.files,
          nextConfig || undefined
        );
        return {
          ...session,
          files: updatedFiles,
          torrent: {
            ...session.torrent,
            files: updatedFiles,
          },
        };
      })
    );
  };

  // Smart Tag frequency counts across the candidate torrents
  const availableSmartTags = useMemo(() => {
    const counts = new Map<string, { info: SmartTagInfo; count: number }>();
    for (const item of baseCandidateTorrents) {
      const tags = extractSmartTags(item);
      for (const tag of tags) {
        const existing = counts.get(tag.label);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(tag.label, { info: tag, count: 1 });
        }
      }
    }
    // Keep canonical rule ordering
    return SMART_TAG_RULES.filter((r) => counts.has(r.label)).map((r) => ({
      label: r.label,
      category: r.category,
      count: counts.get(r.label)!.count,
    }));
  }, [baseCandidateTorrents]);

  // Combine candidate torrents + Smart Tag filter + sort
  const filteredTorrents = useMemo(() => {
    const list =
      selectedSmartTags.length === 0
        ? [...baseCandidateTorrents]
        : baseCandidateTorrents.filter((item) => {
            const itemTagSet = new Set(
              extractSmartTags(item).map((t) => t.label)
            );
            return selectedSmartTags.every((activeTag) =>
              itemTagSet.has(activeTag)
            );
          });

    list.sort((a, b) => {
      if (sortBy === 'seeders') return b.seeders - a.seeders;
      if (sortBy === 'sizeBytes') return b.sizeBytes - a.sizeBytes;
      return b.uploadDate.localeCompare(a.uploadDate);
    });
    return list;
  }, [baseCandidateTorrents, selectedSmartTags, sortBy]);

  // Keep focusedTorrentId valid when filteredTorrents changes
  useEffect(() => {
    if (
      focusedTorrentId &&
      !filteredTorrents.some((item) => item.id === focusedTorrentId)
    ) {
      setFocusedTorrentId(null);
    }
  }, [filteredTorrents, focusedTorrentId]);

  const focusTorrentRowByIndex = (targetIndex: number) => {
    if (filteredTorrents.length === 0) return;
    const clampedIndex = Math.max(
      0,
      Math.min(filteredTorrents.length - 1, targetIndex)
    );
    const targetItem = filteredTorrents[clampedIndex];
    if (!targetItem) return;

    setFocusedTorrentId(targetItem.id);

    const deskEl = desktopRowRefs.current[targetItem.id];
    const mobEl = mobileRowRefs.current[targetItem.id];
    const activeEl =
      deskEl && deskEl.offsetParent !== null
        ? deskEl
        : mobEl && mobEl.offsetParent !== null
        ? mobEl
        : deskEl || mobEl;

    if (activeEl) {
      activeEl.focus({ preventScroll: false });
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (filteredTorrents.length === 0) return;

    const target = e.target as HTMLElement | null;
    const isTextInput =
      Boolean(target) &&
      ((target!.tagName === 'INPUT' &&
        (target as HTMLInputElement).type !== 'checkbox') ||
        target!.tagName === 'TEXTAREA' ||
        target!.tagName === 'SELECT' ||
        target!.isContentEditable);

    // Do not intercept typing inside text inputs (e.g. Batch Rename inputs inside expanded drawer)
    if (isTextInput) return;

    const currentIndex = focusedTorrentId
      ? filteredTorrents.findIndex((t) => t.id === focusedTorrentId)
      : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const nextIndex =
        currentIndex < 0
          ? 0
          : Math.min(filteredTorrents.length - 1, currentIndex + 1);
      focusTorrentRowByIndex(nextIndex);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      focusTorrentRowByIndex(prevIndex);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      focusTorrentRowByIndex(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      focusTorrentRowByIndex(filteredTorrents.length - 1);
      return;
    }

    if (e.key === 'Enter') {
      // Allow inner interactive controls (buttons, links, checkboxes) to handle their own Enter event
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'VIDEO')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const targetId = focusedTorrentId || filteredTorrents[0]?.id;
      if (targetId) {
        setFocusedTorrentId(targetId);
        setExpandedRowId((prev) => (prev === targetId ? null : targetId));
      }
      return;
    }

    if (e.key === ' ') {
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'VIDEO')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const targetId = focusedTorrentId || filteredTorrents[0]?.id;
      if (targetId) {
        setFocusedTorrentId(targetId);
        toggleTorrentSelection(targetId);
      }
    }
  };

  // Start a transfer in either WebTorrent (in-browser) or Device Client (native magnet handoff)
  const handleStartTransfer = async (
    torrent: TorrentItem,
    mode: DownloadTargetMode
  ) => {
    // Collect custom WSS trackers and custom general trackers to automatically append
    const customWss = (deviceConfig.customWssTrackers || []).filter((t) => t.trim());
    const customGeneral = (deviceConfig.customTrackers || []).filter((t) => t.trim());
    const allCustomToAppend = Array.from(new Set([...customGeneral, ...customWss]));

    const shouldAppend =
      deviceConfig.autoAppendTrackers || (deviceConfig.autoAppendWssTrackers ?? true);

    const effectiveMagnetUri =
      shouldAppend && allCustomToAppend.length > 0
        ? appendTrackersToMagnetUri(torrent.magnetUri, allCustomToAppend)
        : torrent.magnetUri;

    const augmentedTorrent: TorrentItem = {
      ...torrent,
      magnetUri: effectiveMagnetUri,
    };

    if (mode === 'device-client') {
      const res = await triggerDeviceClientDownload(augmentedTorrent, deviceConfig);
      notify(`Opened "${torrent.title.slice(0, 38)}..." in ${res.method}`);

      // Also log in transfer history as handed-off
      const existing = transfers.find((t) => t.torrent.infoHash === torrent.infoHash);
      if (!existing) {
        const handoffSession: TransferSession = {
          id: `session-${torrent.id}-${Date.now()}`,
          torrent: augmentedTorrent,
          mode: 'device-client',
          status: 'handed-off',
          progress: 100,
          downloadedBytes: torrent.sizeBytes,
          uploadedBytes: 0,
          downloadSpeedBytes: 0,
          uploadSpeedBytes: 0,
          etaSeconds: 0,
          connectedPeers: torrent.seeders,
          totalSwarmPeers: torrent.seeders + torrent.leechers,
          piecesTotal: 64,
          piecesCompleted: Array.from({ length: 64 }, () => 2),
          startedAt: new Date().toISOString(),
          files: torrent.files.map((f) => ({ ...f })),
          peers: [],
          trackerStatus: Array.from(new Set([
            ...DEFAULT_WSS_TRACKERS.slice(0, 4),
            ...customWss,
          ])).map((url) => ({
            url,
            status: 'peers-found',
            peers: torrent.seeders,
          })),
          swarmHealthHistory: generateInitialSwarmHistory(torrent.seeders, torrent.leechers, 8),
        };
        setTransfers((prev) => [handoffSession, ...prev]);
      }
      return;
    }

    // Web Client (In-Browser WebTorrent)
    const existing = transfers.find(
      (t) => t.torrent.infoHash === torrent.infoHash && t.mode === 'web-client'
    );
    if (existing) {
      setTransfers((prev) =>
        prev.map((s) =>
          s.id !== existing.id
            ? s
            : {
                ...s,
                files: torrent.files.map((f, idx) => ({
                  ...f,
                  selected: s.files[idx]?.selected ?? f.selected,
                })),
                torrent: {
                  ...augmentedTorrent,
                  files: torrent.files.map((f) => ({ ...f })),
                },
              }
        )
      );
      setSelectedTransferId(existing.id);
      setActiveTab('transfers');
      notify(`Switched to existing WebTorrent transfer for "${torrent.title.slice(0, 36)}..."`);
      return;
    }

    const sessionId = `session-${torrent.id}-${Date.now()}`;
    const wssTrackersToAnnounce = Array.from(new Set([
      ...DEFAULT_WSS_TRACKERS.filter((t) => t.startsWith('wss://')).slice(0, 4),
      ...customWss,
    ]));

    const newSession: TransferSession = {
      id: sessionId,
      torrent: augmentedTorrent,
      mode: 'web-client',
      status: 'downloading',
      progress: 4.5,
      downloadedBytes: Math.round(torrent.sizeBytes * 0.045),
      uploadedBytes: 0,
      downloadSpeedBytes: 5400000,
      uploadSpeedBytes: 410000,
      etaSeconds: Math.max(8, Math.round(torrent.sizeBytes / 5400000)),
      connectedPeers: Math.min(28, Math.max(6, Math.round(torrent.seeders * 0.15))),
      totalSwarmPeers: torrent.seeders + torrent.leechers,
      piecesTotal: 64,
      piecesCompleted: Array.from({ length: 64 }, (_, idx) =>
        idx < 3 ? 2 : idx < 6 ? 1 : 0
      ),
      startedAt: new Date().toISOString(),
      files: torrent.files.map((f) => ({ ...f })),
      peers: [
        {
          id: `peer-webrtc-1`,
          ip: '185.199.110.153:443',
          client: 'WebTorrent Browser Swarm',
          transport: 'WebRTC',
          downloadSpeed: 2840000,
          progress: 100,
        },
        {
          id: `peer-webseed-2`,
          ip: torrent.webSeedUrls?.[0]
            ? new URL(torrent.webSeedUrls[0]).hostname
            : 'mirror.archive.org',
          client: 'HTTP/2 Range WebSeed',
          transport: 'WebSeed HTTP',
          downloadSpeed: 1920000,
          progress: 100,
        },
        {
          id: `peer-dht-3`,
          ip: '198.51.100.42:6881',
          client: 'Transmission 4.0.6',
          transport: 'WSS Tracker',
          downloadSpeed: 640000,
          progress: 76,
        },
      ],
      trackerStatus: wssTrackersToAnnounce.map((url) => ({
        url,
        status: 'announcing',
        peers: 0,
      })),
      speedHistory: Array.from({ length: 12 }, (_, idx) => {
        const ts = new Date(Date.now() - (11 - idx) * 900);
        const ramp = (idx + 1) / 12;
        const dl = Math.round(5400000 * ramp * (0.9 + Math.random() * 0.2));
        const ul = Math.round(410000 * ramp * (0.85 + Math.random() * 0.25));
        return {
          time: ts.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          downloadBytesPerSec: dl,
          uploadBytesPerSec: ul,
          downloadMBps: Number((dl / (1024 * 1024)).toFixed(2)),
          uploadMBps: Number((ul / (1024 * 1024)).toFixed(2)),
        };
      }),
      swarmHealthHistory: generateInitialSwarmHistory(torrent.seeders, torrent.leechers, 12),
    };

    setTransfers((prev) => [newSession, ...prev]);
    setSelectedTransferId(sessionId);
    setActiveTab('transfers');
    notify(`Started WebTorrent download: ${torrent.title.slice(0, 42)}...`);

    // Announce to real WSS trackers including custom WSS trackers
    wssTrackersToAnnounce.forEach((trackerUrl) => {
      announceToWssTracker(trackerUrl, torrent.infoHash, (status, peers) => {
        setTransfers((prev) =>
          prev.map((s) =>
            s.id !== sessionId
              ? s
              : {
                  ...s,
                  trackerStatus: s.trackerStatus.map((tr) =>
                    tr.url === trackerUrl ? { ...tr, status, peers } : tr
                  ),
                }
          )
        );
      });
    });
  };

  const toggleTorrentSelection = (id: string) => {
    setSelectedTorrentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    filteredTorrents.length > 0 &&
    filteredTorrents.every((item) => selectedTorrentIds.includes(item.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredTorrents.map((t) => t.id));
      setSelectedTorrentIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedTorrentIds,
        ...filteredTorrents.map((t) => t.id),
      ]);
      setSelectedTorrentIds(Array.from(merged));
    }
  };

  const selectedTorrentItems = useMemo(() => {
    const idSet = new Set(selectedTorrentIds);
    return filteredTorrents.filter((t) => idSet.has(t.id));
  }, [filteredTorrents, selectedTorrentIds]);

  const batchSizeBreakdown = useMemo(
    () => computeBatchSizeBreakdown(selectedTorrentItems),
    [selectedTorrentItems]
  );

  const handleBatchQueueTransfers = async (mode: DownloadTargetMode) => {
    if (selectedTorrentItems.length === 0) return;

    // Collect custom WSS and general trackers to append during download initiation
    const customWss = (deviceConfig.customWssTrackers || []).filter((t) => t.trim());
    const customGeneral = (deviceConfig.customTrackers || []).filter((t) => t.trim());
    const allCustomToAppend = Array.from(new Set([...customGeneral, ...customWss]));

    const shouldAppend =
      deviceConfig.autoAppendTrackers || (deviceConfig.autoAppendWssTrackers ?? true);

    const prepareTorrentWithTrackers = (torrent: TorrentItem): TorrentItem => {
      const effectiveMagnet =
        shouldAppend && allCustomToAppend.length > 0
          ? appendTrackersToMagnetUri(torrent.magnetUri, allCustomToAppend)
          : torrent.magnetUri;
      return {
        ...torrent,
        magnetUri: effectiveMagnet,
      };
    };

    if (mode === 'device-client') {
      for (const rawTorrent of selectedTorrentItems) {
        const torrent = prepareTorrentWithTrackers(rawTorrent);
        await triggerDeviceClientDownload(torrent, deviceConfig);
      }

      setTransfers((prev) => {
        const existingHashes = new Set(prev.map((t) => t.torrent.infoHash));
        const newHandoffs: TransferSession[] = selectedTorrentItems
          .filter((t) => !existingHashes.has(t.infoHash))
          .map((rawTorrent, idx) => {
            const torrent = prepareTorrentWithTrackers(rawTorrent);
            return {
              id: `session-${torrent.id}-${Date.now()}-${idx}`,
              torrent,
              mode: 'device-client',
              status: 'handed-off',
              progress: 100,
              downloadedBytes: torrent.sizeBytes,
              uploadedBytes: 0,
              downloadSpeedBytes: 0,
              uploadSpeedBytes: 0,
              etaSeconds: 0,
              connectedPeers: torrent.seeders,
              totalSwarmPeers: torrent.seeders + torrent.leechers,
              piecesTotal: 64,
              piecesCompleted: Array.from({ length: 64 }, () => 2),
              startedAt: new Date().toISOString(),
              files: torrent.files.map((f) => ({ ...f })),
              peers: [],
              trackerStatus: Array.from(new Set([
                ...DEFAULT_WSS_TRACKERS.slice(0, 4),
                ...customWss,
              ])).map((url) => ({
                url,
                status: 'peers-found',
                peers: torrent.seeders,
              })),
              swarmHealthHistory: generateInitialSwarmHistory(torrent.seeders, torrent.leechers, 8),
            };
          });
        return [...newHandoffs, ...prev];
      });

      const count = selectedTorrentItems.length;
      setSelectedTorrentIds([]);
      notify(`Dispatched ${count} ${count === 1 ? 'torrent' : 'torrents'} to Device Client`);
      return;
    }

    // Batch queue in WebTorrent Client (In-Browser)
    const createdSessions: TransferSession[] = [];
    const existingWebHashes = new Set(
      transfers
        .filter((t) => t.mode === 'web-client')
        .map((t) => t.torrent.infoHash)
    );

    const wssTrackersToAnnounce = Array.from(new Set([
      ...DEFAULT_WSS_TRACKERS.filter((t) => t.startsWith('wss://')).slice(0, 4),
      ...customWss,
    ]));

    selectedTorrentItems.forEach((rawTorrent, idx) => {
      if (existingWebHashes.has(rawTorrent.infoHash)) return;
      const torrent = prepareTorrentWithTrackers(rawTorrent);
      const sessionId = `session-${torrent.id}-${Date.now()}-${idx}`;
      const newSession: TransferSession = {
        id: sessionId,
        torrent,
        mode: 'web-client',
        status: 'downloading',
        progress: 4.5,
        downloadedBytes: Math.round(torrent.sizeBytes * 0.045),
        uploadedBytes: 0,
        downloadSpeedBytes: 4800000,
        uploadSpeedBytes: 390000,
        etaSeconds: Math.max(8, Math.round(torrent.sizeBytes / 4800000)),
        connectedPeers: Math.min(28, Math.max(6, Math.round(torrent.seeders * 0.15))),
        totalSwarmPeers: torrent.seeders + torrent.leechers,
        piecesTotal: 64,
        piecesCompleted: Array.from({ length: 64 }, (_, pIdx) =>
          pIdx < 3 ? 2 : pIdx < 6 ? 1 : 0
        ),
        startedAt: new Date().toISOString(),
        files: torrent.files.map((f) => ({ ...f })),
        peers: [
          {
            id: `peer-webrtc-1`,
            ip: '185.199.110.153:443',
            client: 'WebTorrent Browser Swarm',
            transport: 'WebRTC',
            downloadSpeed: 2640000,
            progress: 100,
          },
          {
            id: `peer-webseed-2`,
            ip: torrent.webSeedUrls?.[0]
              ? new URL(torrent.webSeedUrls[0]).hostname
              : 'mirror.archive.org',
            client: 'HTTP/2 Range WebSeed',
            transport: 'WebSeed HTTP',
            downloadSpeed: 1620000,
            progress: 100,
          },
        ],
        trackerStatus: wssTrackersToAnnounce.map((url) => ({
          url,
          status: 'announcing',
          peers: 0,
        })),
        speedHistory: Array.from({ length: 12 }, (_, sIdx) => {
          const ts = new Date(Date.now() - (11 - sIdx) * 900);
          const ramp = (sIdx + 1) / 12;
          const dl = Math.round(4800000 * ramp * (0.9 + Math.random() * 0.2));
          const ul = Math.round(390000 * ramp * (0.85 + Math.random() * 0.25));
          return {
            time: ts.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
            downloadBytesPerSec: dl,
            uploadBytesPerSec: ul,
            downloadMBps: Number((dl / (1024 * 1024)).toFixed(2)),
            uploadMBps: Number((ul / (1024 * 1024)).toFixed(2)),
          };
        }),
        swarmHealthHistory: generateInitialSwarmHistory(torrent.seeders, torrent.leechers, 12),
      };
      createdSessions.push(newSession);

      wssTrackersToAnnounce.forEach((trackerUrl) => {
        announceToWssTracker(trackerUrl, torrent.infoHash, (status, peers) => {
          setTransfers((prev) =>
            prev.map((s) =>
              s.id !== sessionId
                ? s
                : {
                    ...s,
                    trackerStatus: s.trackerStatus.map((tr) =>
                      tr.url === trackerUrl ? { ...tr, status, peers } : tr
                    ),
                  }
            )
          );
        });
      });
    });

    if (createdSessions.length > 0) {
      setTransfers((prev) => [...createdSessions, ...prev]);
      setSelectedTransferId(createdSessions[0].id);
    }
    const count = selectedTorrentItems.length;
    setSelectedTorrentIds([]);
    setActiveTab('transfers');
    notify(`Queued ${count} ${count === 1 ? 'torrent' : 'torrents'} in WebTorrent Client`);
  };

  const handleBatchDeleteSelected = () => {
    if (selectedTorrentItems.length === 0) return;
    const idsToDelete = selectedTorrentItems.map((t) => t.id);
    const deleteSet = new Set(idsToDelete);

    setDeletedTorrentIds((prev) =>
      Array.from(new Set([...prev, ...idsToDelete]))
    );
    setRemoteResults((prev) => prev.filter((item) => !deleteSet.has(item.id)));
    if (expandedRowId && deleteSet.has(expandedRowId)) {
      setExpandedRowId(null);
    }
    if (previewingRowId && deleteSet.has(previewingRowId)) {
      setPreviewingRowId(null);
    }
    setSelectedTorrentIds([]);
    setIsBulkDeleteModalOpen(false);
    notify(
      `Removed ${idsToDelete.length} ${
        idsToDelete.length === 1 ? 'torrent item' : 'torrent items'
      } from search index`
    );
  };

  const handleExportSelectedMetadata = () => {
    if (selectedTorrentItems.length === 0) return;
    exportBatchTorrentMetadata(selectedTorrentItems);
    notify(
      `Exported JSON metadata backup for ${selectedTorrentItems.length} ${
        selectedTorrentItems.length === 1 ? 'torrent' : 'torrents'
      }`
    );
  };

  const handleQuickAddSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = quickSiteName.trim();
    let cleanUrl = quickSiteUrl.trim();
    if (!cleanName || !cleanUrl) return;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const template = cleanUrl.includes('{query}')
      ? cleanUrl
      : `${cleanUrl.replace(/\/$/, '')}/search?q={query}`;

    const newSite: IndexerSite = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      baseUrl: cleanUrl.split('/search')[0],
      searchUrlTemplate: template,
      protocol: 'html-magnet',
      categories: ['Movies', 'TV', 'Software', 'Audio', 'Games', 'Books'],
      enabled: true,
      isCustom: true,
      latencyMs: 145,
      lastStatus: 'healthy',
      description: `Custom search site added from search bar (${template})`,
    };

    const updatedSites = [...sites, newSite];
    setSites(updatedSites);
    setQuickSiteName('');
    setQuickSiteUrl('');
    setShowQuickAddSite(false);
    notify(`Added "${cleanName}" and refreshing search index...`);
    executeMultiSiteSearch(searchQuery, updatedSites);
  };

  const activeDownloads = transfers.filter(
    (t) => t.status === 'downloading' || t.status === 'connecting-swarm'
  );
  const activeDownloadsCount = activeDownloads.length;
  const activeDownloadProgress =
    activeDownloadsCount > 0
      ? Math.min(
          100,
          Math.max(
            4,
            Math.round(
              activeDownloads.reduce((sum, t) => sum + (t.progress || 0), 0) /
                activeDownloadsCount
            )
          )
        )
      : 0;
  const activeDownloadSpeedBytes = activeDownloads.reduce(
    (sum, t) => sum + (t.downloadSpeedBytes || 0),
    0
  );
  const ringCircumference = 2 * Math.PI * 6;
  const ringStrokeOffset =
    ringCircumference - (ringCircumference * activeDownloadProgress) / 100;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col pb-16 md:pb-0">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 md:py-4 border-b border-slate-800/90 bg-[#0B0F17]/95 sticky top-0 z-30 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#search"
          onClick={(e) => {
            e.preventDefault();
            handleResetHomeAndFilters();
          }}
          title="Navigate Home & reset filters (Key: H)"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          Kestrel
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <a
            href="#search"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('search');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'search'
                ? 'text-slate-100 border-sky-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Search Index
          </a>
          <a
            href="#transfers"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('transfers');
            }}
            title={
              activeDownloadsCount > 0
                ? `${activeDownloadsCount} active download${
                    activeDownloadsCount > 1 ? 's' : ''
                  } · ${activeDownloadProgress}% avg progress (${formatBytes(
                    activeDownloadSpeedBytes
                  )}/s)`
                : `View all ${transfers.length} transfers (Key: T)`
            }
            className={`relative inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'transfers'
                ? 'text-slate-100 border-sky-400'
                : activeDownloadsCount > 0
                ? 'text-slate-200 border-transparent hover:text-white'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            {activeDownloadsCount > 0 && (
              <span
                className="relative inline-flex items-center justify-center w-4 h-4 shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-4 h-4 -rotate-90 overflow-visible"
                  viewBox="0 0 16 16"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    strokeWidth="1.75"
                    className="stroke-slate-800"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    strokeWidth="1.75"
                    strokeDasharray="8 30"
                    strokeLinecap="round"
                    className="stroke-sky-400/35 origin-center animate-spin"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    strokeWidth="1.75"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringStrokeOffset}
                    strokeLinecap="round"
                    className="stroke-sky-400 transition-all duration-500 ease-out"
                  />
                </svg>
                <span className="absolute w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </span>
            )}
            <span>Transfers ({transfers.length})</span>
            {activeDownloadsCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-sky-400 font-semibold">
                {activeDownloadProgress}%
              </span>
            )}
            {activeDownloadsCount > 0 && (
              <svg
                className="absolute left-0 right-0 -bottom-[2px] w-full h-[2px] overflow-hidden rounded-full pointer-events-none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="2"
                  className="fill-slate-800/90"
                />
                <rect
                  x="0"
                  y="0"
                  width={`${activeDownloadProgress}%`}
                  height="2"
                  className="fill-sky-400 transition-all duration-500 ease-out animate-pulse"
                />
              </svg>
            )}
          </a>
          <a
            href="#indexers"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('indexers');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'indexers'
                ? 'text-slate-100 border-sky-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Search Sites ({sites.filter((s) => s.enabled).length})
          </a>
          <a
            href="#settings"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('settings');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'settings'
                ? 'text-slate-100 border-sky-400'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Client Settings
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsTorkDoctorOpen(true)}
            title="Run Tork Doctor latency & canary health diagnostics"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Tork Doctor</span>
          </button>
          <button
            onClick={() => setIsAddMagnetOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
          >
            + Add Magnet
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 md:py-8 transition-all duration-200 ${
          layoutMode === 'mobile' ? 'max-w-[440px] pb-20' : 'max-w-[1380px]'
        }`}
      >
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search & Client Mode Command Header */}
            <div className="border border-slate-800 bg-[#111827] rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100 tracking-tight text-balance">
                    Federated Torrent Index & Swarm Client
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Query {sites.filter((s) => s.enabled).length} active torrent indexers simultaneously, then stream in-browser via WebTorrent or open directly in your device client.
                  </p>
                </div>

                {/* Default Download Engine Switcher & Live Search Toggle */}
                <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !searchAsYouType;
                      setSearchAsYouType(next);
                      notify(
                        next
                          ? 'Search-as-you-type enabled (Shortcut: L)'
                          : 'Search-as-you-type disabled (Shortcut: L)'
                      );
                    }}
                    title="Toggle instant search-as-you-type across all enabled sites (Shortcut: L)"
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      searchAsYouType
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Live Search: {searchAsYouType ? 'ON' : 'OFF'}</span>
                    <kbd className="px-1 py-0.2 text-[10px] font-mono rounded bg-slate-950/80 border border-slate-700/80 text-slate-300">
                      L
                    </kbd>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      Primary Client:
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultMode('web-client');
                          notify('Primary action set to In-Browser WebTorrent Client');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          defaultMode === 'web-client'
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Web Client
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDefaultMode('device-client');
                          notify('Primary action set to Device Client (Magnet Protocol)');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          defaultMode === 'device-client'
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Device Client
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Input Bar with Popular Query Autocomplete */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isAutocompleteOpen && autocompleteSuggestions.length > 0}
                    aria-autocomplete="list"
                    aria-controls="kestrel-search-autocomplete-listbox"
                    value={searchQuery}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) {
                        setIsAutocompleteOpen(true);
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsAutocompleteOpen(false);
                        setActiveAutocompleteIndex(-1);
                      }, 150);
                    }}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setSearchQuery(nextVal);
                      setIsAutocompleteOpen(nextVal.trim().length > 0);
                      setActiveAutocompleteIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (!isAutocompleteOpen || autocompleteSuggestions.length === 0) {
                        return;
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveAutocompleteIndex((prev) =>
                          prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveAutocompleteIndex((prev) =>
                          prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
                        );
                      } else if (e.key === 'Tab') {
                        const chosen =
                          activeAutocompleteIndex >= 0
                            ? autocompleteSuggestions[activeAutocompleteIndex]
                            : autocompleteSuggestions[0];
                        if (chosen) {
                          e.preventDefault();
                          handleSelectAutocompleteSuggestion(chosen.term);
                        }
                      } else if (e.key === 'Enter' && activeAutocompleteIndex >= 0) {
                        const chosen = autocompleteSuggestions[activeAutocompleteIndex];
                        if (chosen) {
                          e.preventDefault();
                          handleSelectAutocompleteSuggestion(chosen.term);
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAutocompleteOpen(false);
                        setActiveAutocompleteIndex(-1);
                      }
                    }}
                    placeholder="Search as you type across movies, Linux ISOs, audio, repacks ('S' to focus, 'H' to reset all, 'Esc' to clear)..."
                    className="w-full pl-11 pr-32 py-3 text-sm bg-slate-950 border border-slate-700/90 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isSearching && (
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin mr-1" />
                    )}
                    {searchQuery ||
                    selectedCategory !== 'All' ||
                    selectedSiteFilter !== 'all' ||
                    selectedSmartTags.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleResetHomeAndFilters}
                        title="Reset all filters & clear search query (Shortcut: H)"
                        className="px-2 py-0.5 text-[11px] font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
                      >
                        Reset (H)
                      </button>
                    ) : (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded pointer-events-none">
                        S
                      </kbd>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown (powered by searchFrequencies) */}
                  {isAutocompleteOpen && autocompleteSuggestions.length > 0 && (
                    <div
                      id="kestrel-search-autocomplete-listbox"
                      role="listbox"
                      aria-label="Popular search query suggestions"
                      className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden z-40"
                    >
                      <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Popular Query Suggestions</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-slate-300">
                            ↑↓
                          </kbd>{' '}
                          navigate ·{' '}
                          <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-slate-300">
                            Tab
                          </kbd>{' '}
                          / <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-slate-300">Enter</kbd> select
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/60">
                        {autocompleteSuggestions.map((suggestion, idx) => {
                          const isHighlighted = idx === activeAutocompleteIndex;
                          const { before, matched, after } =
                            splitSuggestionHighlight(suggestion);
                          return (
                            <button
                              key={suggestion.term}
                              type="button"
                              role="option"
                              aria-selected={isHighlighted}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectAutocompleteSuggestion(suggestion.term);
                              }}
                              onMouseEnter={() => setActiveAutocompleteIndex(idx)}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                isHighlighted
                                  ? 'bg-sky-500/20 text-slate-100'
                                  : 'hover:bg-slate-900/80 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Search
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isHighlighted ? 'text-sky-400' : 'text-slate-500'
                                  }`}
                                />
                                <span className="text-xs sm:text-sm truncate">
                                  {before}
                                  <span className="font-semibold text-sky-400 underline decoration-sky-400/50 underline-offset-2">
                                    {matched}
                                  </span>
                                  {after}
                                </span>
                                {suggestion.matchType === 'prefix' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                    Prefix Match
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                                <span className="text-amber-400/90 font-semibold">
                                  #{suggestion.rank}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                  {suggestion.count}× searched
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 text-sm font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Querying Indexers...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search All Sites
                    </>
                  )}
                </button>
              </form>

              {/* Recent Searches Tags Strip */}
              {recentSearches.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px] uppercase tracking-wider shrink-0 select-none">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Recent Searches:</span>
                    {!trackSearchHistory && (
                      <span
                        className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        title="Search history logging is currently paused in Settings"
                      >
                        Paused
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {recentSearches.map((query) => {
                      const isActive =
                        searchQuery.trim().toLowerCase() === query.trim().toLowerCase();
                      return (
                        <div
                          key={query}
                          onClick={() => handleSelectRecentSearch(query)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectRecentSearch(query);
                            }
                          }}
                          title={`Click to search for "${query}"`}
                          className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs font-semibold'
                              : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-slate-600 font-medium'
                          }`}
                        >
                          <Search className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                          <span>{query}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecentSearch(query, e)}
                            title={`Remove "${query}" from recent searches`}
                            className="p-0.5 ml-0.5 rounded-full text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecentSearches}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors ml-1 underline-offset-2 hover:underline cursor-pointer"
                    title="Clear recent searches history"
                  >
                    Clear history
                  </button>
                </div>
              ) : !trackSearchHistory ? (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400 select-none">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-400">Search history tracking is paused.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    Privacy Settings
                  </button>
                </div>
              ) : null}

              {/* Popular Searches Strip (Top 10 Most Frequent Queries) */}
              {popularSearches.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px] uppercase tracking-wider shrink-0 select-none">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/10 text-amber-400">
                      <Flame className="w-3 h-3 text-amber-400" />
                    </span>
                    <span className="font-semibold text-slate-300">Popular Searches:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {popularSearches.map(({ rank, term, count }) => {
                      const isActive =
                        searchQuery.trim().toLowerCase() === term.trim().toLowerCase();
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSelectPopularSearch(term)}
                          title={`Click to search "${term}" (${count} recorded queries)`}
                          className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer select-none ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-xs font-semibold'
                              : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-amber-500/40 font-medium'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-mono font-bold px-1 rounded ${
                              rank <= 3
                                ? 'text-amber-400 bg-amber-500/15'
                                : 'text-slate-500 bg-slate-800 group-hover:text-slate-400'
                            }`}
                          >
                            #{rank}
                          </span>
                          <span>{term}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? 'bg-amber-400/20 text-amber-300 font-semibold'
                                : 'bg-slate-800/90 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSearchFrequencies}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-amber-400/90 transition-colors ml-1 underline-offset-2 hover:underline cursor-pointer"
                    title="Reset popular search frequency counters to defaults"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-slate-500" />
                    <span>Reset counts</span>
                  </button>
                </div>
              )}

              {/* Filter & Indexer Source Strip */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                {/* Category Segmented Filter + Linux Distro Quick Hub */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800/80 shrink-0">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-slate-800 text-slate-100 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLinuxDistroHubOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                    title="Open Verified Linux & FOSS Distro Hub with SHA-256 hashes (Key: L)"
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Linux Distros</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      8 ISOs
                    </span>
                  </button>
                </div>

                {/* Site Filter + Sort + Quick Add Site */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={selectedSiteFilter}
                    onChange={(e) => setSelectedSiteFilter(e.target.value)}
                    aria-label="Filter by Indexer Site"
                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">
                      All Enabled Sites ({sites.filter((s) => s.enabled).length})
                    </option>
                    {sites
                      .filter((s) => s.enabled)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortField)}
                      aria-label="Sort results by"
                      className="bg-transparent text-slate-200 focus:outline-none"
                    >
                      <option value="seeders" className="bg-slate-900">
                        Sort: Most Seeders
                      </option>
                      <option value="sizeBytes" className="bg-slate-900">
                        Sort: File Size
                      </option>
                      <option value="uploadDate" className="bg-slate-900">
                        Sort: Newest Added
                      </option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSourceCatalogOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Browse 1-click community indexer source catalog (Key: a)"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Catalog</span>
                    <kbd className="text-[10px] font-mono px-1 py-0.2 bg-slate-950 border border-slate-700 rounded text-slate-400">
                      a
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuickAddSite((v) => !v)}
                    className="px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded-lg hover:bg-sky-500/20 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Site to Search
                  </button>

                  {/* View Mode Switcher (Auto / Mobile View / Desktop Table) */}
                  <div className="hidden md:flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        setLayoutMode((prev) =>
                          prev === 'mobile' ? 'desktop' : 'mobile'
                        )
                      }
                      title="Toggle Mobile Touch View vs Desktop Table View"
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        layoutMode === 'mobile'
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      {layoutMode === 'mobile' ? 'Mobile View Active' : 'Mobile View'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Smart Tag Quick-Filter Bar (Auto-extracted from release titles) */}
              {availableSmartTags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-sky-400" />
                    Smart Tags:
                  </span>
                  {availableSmartTags.map((tag) => {
                    const isActive = selectedSmartTags.includes(tag.label);
                    return (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => toggleSmartTag(tag.label)}
                        title={`Filter torrents tagged "${tag.label}"`}
                        className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded border transition-colors flex items-center gap-1 ${getSmartTagClasses(
                          tag.category,
                          isActive
                        )}`}
                      >
                        <span>{tag.label}</span>
                        <span
                          className={`text-[10px] ${
                            isActive ? 'text-slate-900/80' : 'opacity-70'
                          }`}
                        >
                          {tag.count}
                        </span>
                      </button>
                    );
                  })}
                  {selectedSmartTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSmartTags([])}
                      className="ml-1 px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear tags ({selectedSmartTags.length})
                    </button>
                  )}
                </div>
              )}

              {/* Inline Quick-Add Site Drawer */}
              {showQuickAddSite && (
                <form
                  onSubmit={handleQuickAddSiteSubmit}
                  className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <input
                    type="text"
                    required
                    value={quickSiteName}
                    onChange={(e) => setQuickSiteName(e.target.value)}
                    placeholder="Site Name (e.g. 1337x, Nyaa, MyTracker)"
                    className="sm:w-56 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <input
                    type="text"
                    required
                    value={quickSiteUrl}
                    onChange={(e) => setQuickSiteUrl(e.target.value)}
                    placeholder="Site URL or Search Template (e.g. https://1337x.to/search/{query}/1/ or https://nyaa.si)"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      Save & Query Site
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('indexers')}
                      className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      All Sites
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Active Transfer Mini-Banner (if downloading in background while browsing search) */}
            {activeDownloadsCount > 0 && (
              <div className="border border-slate-800 bg-[#111827] rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
                  <span className="text-sky-400 font-semibold">
                    WebTorrent Active ({activeDownloadsCount})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-xs sm:max-w-md font-sans">
                    {transfers[0].torrent.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{transfers[0].progress.toFixed(1)}%</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(transfers[0].downloadSpeedBytes)}/s</span>
                </div>
                <button
                  onClick={() => setActiveTab('transfers')}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0"
                >
                  Open Transfer & Stream Inspector →
                </button>
              </div>
            )}

            {/* High-Density Torrent Results Table (Keyboard Navigable with ↑/↓ and Enter) */}
            <div
              ref={tableContainerRef}
              tabIndex={0}
              role="region"
              aria-label="Filtered torrent results list. Use Up and Down arrow keys to navigate rows and Enter to expand details."
              onKeyDown={handleTableKeyDown}
              onFocus={(e) => {
                if (
                  e.target === e.currentTarget &&
                  !focusedTorrentId &&
                  filteredTorrents.length > 0
                ) {
                  focusTorrentRowByIndex(0);
                }
              }}
              onBlur={(e) => {
                if (
                  tableContainerRef.current &&
                  !tableContainerRef.current.contains(e.relatedTarget as Node)
                ) {
                  setFocusedTorrentId(null);
                }
              }}
              className="border border-slate-800 bg-[#111827] rounded-xl overflow-hidden focus:outline-none focus-visible:border-sky-500/60 transition-colors"
            >
              {/* Batch Selection Action Bar when 1 or more rows are checked */}
              {selectedTorrentItems.length > 0 && (
                <div className="px-6 py-3.5 bg-sky-500/10 border-b border-sky-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-slate-200">
                      <span className="font-semibold text-sky-400">
                        {selectedTorrentItems.length}{' '}
                        {selectedTorrentItems.length === 1 ? 'torrent' : 'torrents'} selected
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {formatBytes(batchSizeBreakdown.totalBytes)} total payload
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400">
                        {batchSizeBreakdown.totalFiles}{' '}
                        {batchSizeBreakdown.totalFiles === 1 ? 'file' : 'files'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBatchQueueTransfers('web-client')}
                        className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          defaultMode === 'web-client'
                            ? 'bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Queue Selected in Web Client ({selectedTorrentItems.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBatchQueueTransfers('device-client')}
                        className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          defaultMode === 'device-client'
                            ? 'bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 font-medium'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Send Selected to Device App ({selectedTorrentItems.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const magnets = selectedTorrentItems
                            .map((t) => t.magnetUri)
                            .join('\n');
                          navigator.clipboard.writeText(magnets);
                          notify(
                            `Copied ${selectedTorrentItems.length} magnet links to clipboard`
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Magnets
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rawHashes = selectedTorrentItems
                            .map((t) => t.infoHash)
                            .join('\n');
                          navigator.clipboard.writeText(rawHashes);
                          notify(
                            `Copied ${selectedTorrentItems.length} raw BTIH hashes (Magnet protocol taken off)`
                          );
                        }}
                        title="Take off magnet:?xt=urn:btih:... protocol scheme and copy pure 40-char hashes"
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Link2Off className="w-3.5 h-3.5 text-amber-400" />
                        Take off Protocol (Copy Hashes)
                      </button>

                      <button
                        type="button"
                        onClick={handleExportSelectedMetadata}
                        title="Generate and download a JSON file containing all metadata for selected torrents for backup or sharing"
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
                      >
                        <FileDown className="w-3.5 h-3.5 text-sky-400" />
                        <span>Export Selected ({selectedTorrentItems.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        title="Bulk remove selected torrent items from search index (triggers confirmation dialog)"
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg hover:bg-rose-500/30 hover:border-rose-500/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Bulk Remove ({selectedTorrentItems.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTorrentIds([])}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Visual File Size Breakdown Indicator */}
                  {batchSizeBreakdown.segments.length > 0 && (
                    <div className="pt-2.5 border-t border-sky-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-300">
                        <span className="text-slate-400 font-sans font-medium">
                          Payload Composition Breakdown
                        </span>
                        <span className="text-slate-400">
                          {batchSizeBreakdown.segments
                            .map(
                              (seg) =>
                                `${seg.label}: ${formatBytes(seg.bytes)} (${
                                  seg.percent >= 0.1
                                    ? `${seg.percent.toFixed(1)}%`
                                    : '<0.1%'
                                })`
                            )
                            .join(' · ')}
                        </span>
                      </div>

                      {/* Proportional Stacked Bar */}
                      <div
                        className="h-2.5 w-full rounded-full bg-slate-950/90 border border-slate-800/90 overflow-hidden flex p-0.5 gap-0.5"
                        role="img"
                        aria-label="Selected torrents payload size breakdown"
                      >
                        {batchSizeBreakdown.segments.map((seg) => (
                          <div
                            key={seg.id}
                            title={`${seg.label}: ${formatBytes(seg.bytes)} (${seg.percent.toFixed(
                              1
                            )}% · ${seg.fileCount} ${
                              seg.fileCount === 1 ? 'file' : 'files'
                            })`}
                            style={{
                              width: `${Math.max(2.5, seg.percent)}%`,
                            }}
                            className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 ${seg.barColorClass}`}
                          />
                        ))}
                      </div>

                      {/* Category Legend Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {batchSizeBreakdown.segments.map((seg) => (
                          <div
                            key={`legend-${seg.id}`}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono tabular-nums ${seg.badgeClasses}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${seg.dotColorClass}`}
                            />
                            <span className="font-sans font-medium text-slate-100">
                              {seg.label}
                            </span>
                            <span>{formatBytes(seg.bytes)}</span>
                            <span className="opacity-75">
                              (
                              {seg.percent >= 0.1
                                ? `${seg.percent.toFixed(1)}%`
                                : '<0.1%'}
                              )
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Showing{' '}
                    <span className="text-slate-200 font-mono tabular-nums font-medium">
                      {filteredTorrents.length}
                    </span>{' '}
                    indexed torrents across{' '}
                    <span className="text-slate-200">
                      {sites
                        .filter((s) => s.enabled)
                        .map((s) => s.name)
                        .join(' · ')}
                    </span>
                  </span>
                  {deletedTorrentIds.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletedTorrentIds([]);
                          notify('Restored deleted torrent entries to indexer history');
                        }}
                        className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
                      >
                        Restore deleted ({deletedTorrentIds.length})
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5 font-mono tabular-nums">
                  {filteredTorrents.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const allMagnets = filteredTorrents
                          .map((t) => t.magnetUri)
                          .filter(Boolean)
                          .join('\n');
                        if (!allMagnets) {
                          notify('No magnet links available in visible results');
                          return;
                        }
                        navigator.clipboard.writeText(allMagnets);
                        setCopiedAllVisibleMagnets(true);
                        notify(
                          `Copied all ${filteredTorrents.length} visible magnet links to clipboard`
                        );
                        setTimeout(() => setCopiedAllVisibleMagnets(false), 2000);
                      }}
                      title={`Aggregate and copy all ${filteredTorrents.length} visible magnet links as a newline-separated list`}
                      className={`px-3 py-1.5 text-xs font-sans font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        copiedAllVisibleMagnets
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25 hover:text-sky-200'
                      }`}
                    >
                      {copiedAllVisibleMagnets ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied {filteredTorrents.length} Magnet Links!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            Copy all visible magnet links ({filteredTorrents.length})
                          </span>
                        </>
                      )}
                    </button>
                  )}
                  {focusedTorrentId && (
                    <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px]">
                      Row{' '}
                      {filteredTorrents.findIndex((t) => t.id === focusedTorrentId) +
                        1}{' '}
                      of {filteredTorrents.length} focused · Press Enter to{' '}
                      {expandedRowId === focusedTorrentId ? 'collapse' : 'expand'}
                    </span>
                  )}
                  <span className="text-slate-400">
                    <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300">
                      ↑
                    </kbd>{' '}
                    <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300">
                      ↓
                    </kbd>{' '}
                    Navigate ·{' '}
                    <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300">
                      Enter
                    </kbd>{' '}
                    Expand
                  </span>
                </div>
              </div>

              {isSearching ? (
                <div className="p-16 text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-200">
                    Querying Swarm Indexers...
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Searching {sites.filter((s) => s.enabled).length || DEFAULT_INDEXERS.length} enabled indexers & DHT relay for &ldquo;{searchQuery || 'top releases'}&rdquo;...
                  </p>
                </div>
              ) : filteredTorrents.length === 0 ? (
                <div className="p-12 text-center">
                  <h3 className="text-base font-semibold text-slate-200">
                    No Matching Torrents Found
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Try clearing category or tag filters, searching a broader release keyword, or enabling more torrent index sites.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                        setSelectedSiteFilter('all');
                        setSelectedSmartTags([]);
                        setDeletedTorrentIds([]);
                        executeMultiSiteSearch('');
                      }}
                      className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Reset All Filters & Search
                    </button>
                    {selectedCategory !== 'All' && (
                      <button
                        onClick={() => setSelectedCategory('All')}
                        className="px-4 py-2 text-xs font-medium bg-slate-800/90 text-sky-400 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Search Across All Categories
                      </button>
                    )}
                    {selectedSmartTags.length > 0 && (
                      <button
                        onClick={() => setSelectedSmartTags([])}
                        className="px-4 py-2 text-xs font-medium bg-slate-800/90 text-amber-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Clear Smart Tags ({selectedSmartTags.length})
                      </button>
                    )}
                    {sites.every((s) => !s.enabled) && (
                      <button
                        onClick={() => {
                          setSites((prev) => prev.map((s) => ({ ...s, enabled: true })));
                          executeMultiSiteSearch(searchQuery, sites.map((s) => ({ ...s, enabled: true })));
                          notify('Re-enabled all default indexer sites');
                        }}
                        className="px-4 py-2 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors"
                      >
                        Enable All Indexers
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('indexers')}
                      className="px-4 py-2 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors"
                    >
                      + Add Indexer Sites
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* MOBILE TOUCH CARD VIEW (Shown automatically on <768px screens OR when Mobile View toggle is active) */}
                  <div
                    className={`${
                      layoutMode === 'mobile'
                        ? 'block'
                        : layoutMode === 'desktop'
                        ? 'hidden'
                        : 'block md:hidden'
                    } divide-y divide-slate-800/80`}
                  >
                    {/* Mobile Select All Strip */}
                    <div className="px-4 py-2.5 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
                      <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                        />
                        <span>Select all ({filteredTorrents.length})</span>
                      </label>
                      {layoutMode === 'mobile' && (
                        <button
                          type="button"
                          onClick={() => setLayoutMode('auto')}
                          className="text-sky-400 hover:text-sky-300 font-medium"
                        >
                          Switch to Desktop Table
                        </button>
                      )}
                    </div>

                    {filteredTorrents.map((item) => {
                      const isExpanded = expandedRowId === item.id;
                      const isRowSelected = selectedTorrentIds.includes(item.id);
                      const isRowFocused = focusedTorrentId === item.id;
                      const hasVideoStream = item.files.some(
                        (f) => f.type === 'video' || Boolean(f.streamUrl)
                      );

                      return (
                        <div
                          key={`mobile-${item.id}`}
                          ref={(el) => {
                            mobileRowRefs.current[item.id] = el;
                          }}
                          tabIndex={0}
                          role="row"
                          aria-expanded={isExpanded}
                          aria-selected={isRowSelected}
                          onFocus={() => setFocusedTorrentId(item.id)}
                          onClick={() => {
                            setFocusedTorrentId(item.id);
                            setExpandedRowId(isExpanded ? null : item.id);
                          }}
                          className={`group p-4 cursor-pointer transform-gpu transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.005] active:scale-[0.992] focus:outline-none ${
                            isRowFocused
                              ? 'ring-2 ring-inset ring-sky-400 shadow-[inset_3px_0_0_0_var(--accent-400)] bg-sky-500/[0.12]'
                              : isRowSelected
                              ? 'bg-sky-500/[0.09] hover:bg-sky-500/[0.14]'
                              : isExpanded
                              ? 'bg-slate-800/60'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* 44x44px Ergonomic Touch Target Checkbox */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTorrentSelection(item.id);
                              }}
                              className="min-w-[44px] min-h-[44px] -ml-2 -mt-1 flex items-center justify-center shrink-0"
                            >
                              <input
                                type="checkbox"
                                aria-label={`Select ${item.title}`}
                                checked={isRowSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 pointer-events-none"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-100 group-hover:text-sky-300 transition-colors leading-snug">
                                {item.title}
                              </div>

                              {/* Interactive Smart Tags parsed from title */}
                              {(() => {
                                const rowSmartTags = extractSmartTags(item);
                                if (rowSmartTags.length === 0) return null;
                                return (
                                  <div
                                    className="flex flex-wrap items-center gap-1.5 mt-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {rowSmartTags.map((tag) => {
                                      const isTagActive = selectedSmartTags.includes(
                                        tag.label
                                      );
                                      return (
                                        <button
                                          key={`mob-tag-${item.id}-${tag.label}`}
                                          type="button"
                                          onClick={() => toggleSmartTag(tag.label)}
                                          title={`Filter by ${tag.label}`}
                                          className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded border transition-colors ${getSmartTagClasses(
                                            tag.category,
                                            isTagActive
                                          )}`}
                                        >
                                          {tag.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* Unboxed Mobile Metadata Line */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1.5 font-mono tabular-nums">
                                <span className="font-sans text-slate-300">
                                  {item.sourceName}
                                </span>
                                {item.p2pNetwork === 'Gnutella' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    <Share2 className="w-2.5 h-2.5" />
                                    Gnutella
                                  </span>
                                )}
                                {item.p2pNetwork === 'eDonkey2000' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    <Network className="w-2.5 h-2.5" />
                                    eD2k
                                  </span>
                                )}
                                {item.p2pNetwork === 'FrostWire' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                    <Zap className="w-2.5 h-2.5" />
                                    FrostWire
                                  </span>
                                )}
                                <span aria-hidden="true">·</span>
                                <span className="font-sans">{item.category}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-200">{item.sizeFormatted}</span>
                                <span aria-hidden="true">·</span>
                                {isLowSeederStallRisk(item.seeders, item.leechers) ? (
                                  <span
                                    title={`Stall Risk: Low seed-to-peer ratio (${calculateSeederLeecherRatio(item.seeders, item.leechers)}x: ${item.seeders} seeds / ${item.leechers} leechers)`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                                    <span>{item.seeders.toLocaleString()} S (Stall Risk)</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">
                                    {item.seeders.toLocaleString()} S
                                  </span>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>{item.leechers.toLocaleString()} P</span>
                              </div>
                            </div>

                            <div className="relative group/expand min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center gap-1.5 text-slate-400 group-hover:text-sky-400 shrink-0">
                              <span
                                className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity select-none pointer-events-none"
                                title="Press Enter on keyboard to expand or collapse details"
                                aria-hidden="true"
                              >
                                <kbd className="font-semibold text-slate-300">Enter</kbd>
                              </span>
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={
                                  isExpanded
                                    ? 'Collapse torrent details (Enter)'
                                    : 'Expand torrent details (Enter)'
                                }
                                aria-keyshortcuts="Enter"
                                title={
                                  isExpanded
                                    ? 'Collapse torrent details (Enter)'
                                    : 'Expand torrent details (Enter)'
                                }
                                className="p-1 text-slate-500 group-hover:text-sky-400 hover:text-sky-300 transition-colors duration-150 rounded cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Touch Action Row (44px height touch targets) */}
                          <div
                            className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartTransfer(item, 'web-client')}
                              className={`flex-1 min-h-[44px] px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                defaultMode === 'web-client'
                                  ? 'bg-sky-500 text-slate-950 font-semibold active:scale-[0.98]'
                                  : 'bg-slate-800 text-slate-100 border border-slate-700 font-medium'
                              }`}
                            >
                              {hasVideoStream ? (
                                <Play className="w-3.5 h-3.5" />
                              ) : (
                                <Globe className="w-3.5 h-3.5" />
                              )}
                              {hasVideoStream ? 'Stream / Web' : 'Web Client'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartTransfer(item, 'device-client')}
                              className={`flex-1 min-h-[44px] px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                defaultMode === 'device-client'
                                  ? 'bg-sky-500 text-slate-950 font-semibold active:scale-[0.98]'
                                  : 'bg-slate-800 text-slate-100 border border-slate-700 font-medium'
                              }`}
                            >
                              <Monitor className="w-3.5 h-3.5" />
                              Device App
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.magnetUri);
                                setCopiedHash(item.infoHash);
                                notify('Copied magnet URI to clipboard');
                                setTimeout(() => setCopiedHash(null), 1800);
                              }}
                              title="Copy Magnet Link"
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors shrink-0"
                            >
                              {copiedHash === item.infoHash ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Mobile Expandable File Drawer */}
                          {isExpanded && (() => {
                            const streamableMedia = getStreamableVideoFile(item);
                            const isPreviewOpen =
                              previewingRowId === item.id && Boolean(streamableMedia);
                            const isRenameOpen = renamingRowId === item.id;
                            const activeRenameConfig: BatchRenameConfig =
                              batchRenameConfigs[item.id] || {
                                prefix: '',
                                suffix: '',
                                scope: 'all',
                              };
                            const hasActiveRename = Boolean(
                              activeRenameConfig.prefix || activeRenameConfig.suffix
                            );

                            return (
                              <div
                                className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 font-mono text-slate-400 truncate">
                                    <span>BTIH: <span className="text-slate-200">{item.infoHash}</span></span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(item.infoHash);
                                        notify('Copied raw BTIH hash (Protocol taken off)');
                                      }}
                                      className="text-[10px] font-sans text-sky-400 hover:text-sky-300"
                                    >
                                      Raw Hash
                                    </button>
                                  </div>
                                  {item.ed2kHash && (
                                    <div className="flex items-center gap-2 font-mono text-amber-300 truncate w-full">
                                      <span>eD2k: <span className="text-amber-200">{item.ed2kHash}</span></span>
                                      {item.ed2kUri && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(item.ed2kUri!);
                                            notify('Copied eDonkey2000 (ed2k://) file link');
                                          }}
                                          className="text-[10px] font-sans font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                                        >
                                          Copy ed2k://
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {item.urnSha1 && (
                                    <div className="font-mono text-purple-300 truncate w-full text-[11px]">
                                      SHA-1: <span className="text-purple-200">{item.urnSha1}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRenamingRowId(
                                          isRenameOpen ? null : item.id
                                        )
                                      }
                                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                        isRenameOpen || hasActiveRename
                                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                                          : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>
                                        {isRenameOpen
                                          ? 'Close Rename'
                                          : hasActiveRename
                                          ? 'Batch Renamed'
                                          : 'Batch Rename'}
                                      </span>
                                    </button>
                                    {streamableMedia && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewElapsedSec(0);
                                          setPreviewingRowId(
                                            isPreviewOpen ? null : item.id
                                          );
                                        }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                          isPreviewOpen
                                            ? 'bg-sky-500 text-slate-950 font-semibold'
                                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25'
                                        }`}
                                      >
                                        <Film className="w-3.5 h-3.5" />
                                        {isPreviewOpen ? 'Close Preview' : 'Preview'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isRenameOpen && (
                                  <BatchRenameControl
                                    torrent={item}
                                    config={activeRenameConfig}
                                    onChangeConfig={(next) =>
                                      handleUpdateBatchRenameConfig(item.id, next)
                                    }
                                    onReset={() => {
                                      handleUpdateBatchRenameConfig(item.id, null);
                                      notify('Restored original torrent filenames');
                                    }}
                                    onApplyConfirm={() => {
                                      setRenamingRowId(null);
                                      notify(
                                        hasActiveRename
                                          ? `Applied batch rename to ${item.files.length} files`
                                          : 'No prefix or suffix entered'
                                      );
                                    }}
                                    compact
                                  />
                                )}

                                {isPreviewOpen && streamableMedia && (
                                  <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2.5 space-y-2">
                                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-300">
                                      <span className="truncate">
                                        Previewing: {streamableMedia.name}
                                      </span>
                                      <span className="text-sky-400 shrink-0">
                                        00:{String(previewElapsedSec).padStart(2, '0')} / 00:{PREVIEW_CLIP_SECONDS}s clip
                                      </span>
                                    </div>
                                    <video
                                      key={`mob-prev-${item.id}`}
                                      src={`${streamableMedia.url}#t=0,${PREVIEW_CLIP_SECONDS}`}
                                      controls
                                      autoPlay
                                      playsInline
                                      preload="metadata"
                                      onTimeUpdate={(e) => {
                                        const vid = e.currentTarget;
                                        const sec = Math.min(
                                          PREVIEW_CLIP_SECONDS,
                                          Math.floor(vid.currentTime)
                                        );
                                        setPreviewElapsedSec(sec);
                                        if (vid.currentTime >= PREVIEW_CLIP_SECONDS) {
                                          vid.pause();
                                        }
                                      }}
                                      className="w-full max-h-48 rounded-lg bg-black object-contain"
                                    />
                                  </div>
                                )}

                                {/* 24-Hour Seed-to-Peer Ratio Mini Sparkline Chart */}
                                <TorrentRowSwarmSparkline torrent={item} compact />

                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                                    <span>Included Files ({item.files.length})</span>
                                    <div className="flex flex-wrap items-center gap-1">
                                      {summarizeFileCategories(item.files).map((cat) => (
                                        <span
                                          key={cat.category}
                                          className={`px-1.5 py-0.5 rounded border text-[10px] font-mono tabular-nums ${cat.badgeClasses}`}
                                        >
                                          {cat.count} {cat.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {item.files.map((f) => {
                                    const extMeta = getFileExtensionMeta(f.name, f.type);
                                    const isRenamed =
                                      Boolean(f.originalName) &&
                                      f.originalName !== f.name;
                                    return (
                                      <div
                                        key={f.path}
                                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2.5"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          <FileExtensionIcon
                                            filename={f.name}
                                            fallbackType={f.type}
                                            size="sm"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="text-slate-200 truncate">
                                              {f.name}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                                              <span
                                                className={`px-1 py-0.2 rounded border ${extMeta.badgeClasses}`}
                                              >
                                                {extMeta.extension}
                                              </span>
                                              <span>{extMeta.categoryLabel}</span>
                                              {isRenamed && (
                                                <span className="text-emerald-400 truncate">
                                                  · Renamed from {f.originalName}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <span className="text-slate-400 font-mono tabular-nums shrink-0">
                                          {formatBytes(f.sizeBytes)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP HIGH-DENSITY TABLE VIEW (With subtle scaling & background highlight on hover) */}
                  <div
                    className={`${
                      layoutMode === 'mobile'
                        ? 'hidden'
                        : layoutMode === 'desktop'
                        ? 'block'
                        : 'hidden md:block'
                    } overflow-x-auto overflow-y-hidden`}
                  >
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-900/40">
                          <th className="py-3 pl-6 pr-2 w-10">
                            <input
                              type="checkbox"
                              aria-label="Select all visible torrents"
                              checked={allVisibleSelected}
                              onChange={toggleSelectAllVisible}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3 font-medium">Release Title & Metadata</th>
                          <th className="py-3 px-3 font-medium text-right whitespace-nowrap">
                            Size
                          </th>
                          <th
                            className="py-3 px-3 font-medium text-right whitespace-nowrap"
                            title="Active seeders in swarm. Warns on Stall Risk when seeder-to-leecher ratio is below 0.05x"
                          >
                            Seeds
                          </th>
                          <th className="py-3 px-3 font-medium text-right whitespace-nowrap">
                            Peers
                          </th>
                          <th className="py-3 pl-3 pr-6 font-medium text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2.5">
                              <span>Download Actions</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allMagnets = filteredTorrents
                                    .map((t) => t.magnetUri)
                                    .filter(Boolean)
                                    .join('\n');
                                  if (!allMagnets) return;
                                  navigator.clipboard.writeText(allMagnets);
                                  setCopiedAllVisibleMagnets(true);
                                  notify(
                                    `Copied all ${filteredTorrents.length} visible magnet links to clipboard`
                                  );
                                  setTimeout(() => setCopiedAllVisibleMagnets(false), 2000);
                                }}
                                title={`Copy all ${filteredTorrents.length} visible magnet links as a newline-separated list`}
                                className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-800/90 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-sky-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedAllVisibleMagnets ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-300">Copied All</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-sky-400" />
                                    <span>Copy all visible magnet links</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-sm">
                        {filteredTorrents.map((item) => {
                          const isExpanded = expandedRowId === item.id;
                          const isRowSelected = selectedTorrentIds.includes(item.id);
                          const isRowFocused = focusedTorrentId === item.id;
                          const hasVideoStream = item.files.some(
                            (f) => f.type === 'video' || Boolean(f.streamUrl)
                          );

                          return (
                            <React.Fragment key={item.id}>
                              <tr
                                ref={(el) => {
                                  desktopRowRefs.current[item.id] = el;
                                }}
                                tabIndex={0}
                                aria-expanded={isExpanded}
                                aria-selected={isRowSelected}
                                onFocus={() => setFocusedTorrentId(item.id)}
                                onClick={() => {
                                  setFocusedTorrentId(item.id);
                                  setExpandedRowId(isExpanded ? null : item.id);
                                }}
                                className={`group cursor-pointer transform-gpu transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.003] active:scale-[0.999] focus:outline-none ${
                                  isRowFocused
                                    ? 'ring-2 ring-inset ring-sky-400 shadow-[inset_3px_0_0_0_var(--accent-400)] bg-sky-500/[0.12] relative z-10'
                                    : isRowSelected
                                    ? 'bg-sky-500/[0.08] hover:bg-sky-500/[0.14]'
                                    : isExpanded
                                    ? 'bg-slate-800/60'
                                    : 'hover:bg-slate-800/55'
                                }`}
                              >
                                {/* Row Selection Checkbox */}
                                <td
                                  className="py-3.5 pl-6 pr-2 w-10 align-top"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    aria-label={`Select ${item.title}`}
                                    checked={isRowSelected}
                                    onChange={() => toggleTorrentSelection(item.id)}
                                    className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
                                  />
                                </td>

                                {/* Release Title & Zero-Pill Unboxed Metadata */}
                                <td className="py-3.5 px-3">
                                  <div className="flex items-start gap-2.5">
                                    <div className="relative flex items-center gap-1.5 shrink-0 mt-0.5 group/expand">
                                      <button
                                        type="button"
                                        tabIndex={-1}
                                        aria-label={
                                          isExpanded
                                            ? 'Collapse torrent details (Enter)'
                                            : 'Expand torrent details (Enter)'
                                        }
                                        aria-keyshortcuts="Enter"
                                        title={
                                          isExpanded
                                            ? 'Collapse torrent details (Enter)'
                                            : 'Expand torrent details (Enter)'
                                        }
                                        className="p-1 -m-1 text-slate-500 group-hover:text-sky-400 hover:text-sky-300 transition-colors duration-150 rounded cursor-pointer"
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </button>

                                      {/* Subtle keyboard shortcut help text next to Expand/Collapse button */}
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 select-none pointer-events-none"
                                        title="Press Enter on keyboard to expand or collapse details"
                                        aria-hidden="true"
                                      >
                                        <kbd className="font-semibold text-slate-300">Enter</kbd>
                                      </span>

                                      {/* Floating tooltip on hover/focus for accessibility */}
                                      <div
                                        role="tooltip"
                                        className="absolute left-0 bottom-full mb-1.5 hidden group-hover/expand:flex items-center gap-1.5 px-2 py-1 bg-slate-950 text-slate-200 text-[11px] font-sans rounded-md border border-slate-700/80 shadow-xl whitespace-nowrap z-30 pointer-events-none"
                                      >
                                        <span>
                                          {isExpanded ? 'Collapse row details' : 'Expand row details'}
                                        </span>
                                        <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-sky-300 font-semibold">
                                          Enter
                                        </kbd>
                                      </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-slate-100 group-hover:text-sky-300 transition-colors duration-150 leading-snug">
                                        {item.title}
                                      </div>

                                      {/* Interactive Smart Tags + Unboxed Metadata */}
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
                                        {(() => {
                                          const rowSmartTags = extractSmartTags(item);
                                          if (rowSmartTags.length === 0) return null;
                                          return (
                                            <div
                                              className="flex flex-wrap items-center gap-1 mr-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {rowSmartTags.map((tag) => {
                                                const isTagActive =
                                                  selectedSmartTags.includes(tag.label);
                                                return (
                                                  <button
                                                    key={`desk-tag-${item.id}-${tag.label}`}
                                                    type="button"
                                                    onClick={() =>
                                                      toggleSmartTag(tag.label)
                                                    }
                                                    title={`Click to filter by ${tag.label}`}
                                                    className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded border transition-colors ${getSmartTagClasses(
                                                      tag.category,
                                                      isTagActive
                                                    )}`}
                                                  >
                                                    {tag.label}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}
                                        <span className="text-slate-300">
                                          {item.sourceName}
                                        </span>
                                        {item.p2pNetwork === 'Gnutella' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                            <Share2 className="w-2.5 h-2.5" />
                                            Gnutella / G2
                                          </span>
                                        )}
                                        {item.p2pNetwork === 'eDonkey2000' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                            <Network className="w-2.5 h-2.5" />
                                            eD2k / Kad
                                          </span>
                                        )}
                                        {item.p2pNetwork === 'FrostWire' && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                            <Zap className="w-2.5 h-2.5" />
                                            FrostWire
                                          </span>
                                        )}
                                        <span aria-hidden="true">·</span>
                                        <span>{item.category}</span>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono tabular-nums">
                                          {item.uploadDate}
                                        </span>
                                        {item.webSeedUrls &&
                                          item.webSeedUrls.length > 0 && (
                                            <>
                                              <span aria-hidden="true">·</span>
                                              <span className="text-sky-400">
                                                Instant WebStream
                                              </span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Size */}
                                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-slate-300 whitespace-nowrap">
                                  {item.sizeFormatted}
                                </td>

                                {/* Seeders */}
                                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                                  {(() => {
                                    const isStallRisk = isLowSeederStallRisk(item.seeders, item.leechers);
                                    const seedLeechRatio = calculateSeederLeecherRatio(item.seeders, item.leechers);

                                    if (!isStallRisk) {
                                      return (
                                        <span className="text-emerald-400 font-medium">
                                          {item.seeders.toLocaleString()}
                                        </span>
                                      );
                                    }

                                    return (
                                      <div className="inline-flex items-center justify-end gap-1.5 relative group/stall">
                                        <span
                                          tabIndex={0}
                                          aria-label={`Stall Risk: Low seed-to-peer ratio (${seedLeechRatio < 0.001 ? '0.00' : seedLeechRatio.toFixed(3)}x)`}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-help"
                                        >
                                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                                          <span>Stall Risk</span>
                                        </span>
                                        <span className="text-rose-400 font-semibold">
                                          {item.seeders.toLocaleString()}
                                        </span>

                                        {/* Floating Tooltip */}
                                        <div
                                          role="tooltip"
                                          className="absolute right-0 bottom-full mb-1.5 hidden group-hover/stall:flex group-focus-within/stall:flex flex-col gap-1 px-2.5 py-1.5 bg-slate-950 text-slate-200 text-[11px] font-sans rounded-lg border border-rose-500/40 shadow-xl whitespace-nowrap z-30 pointer-events-none text-left"
                                        >
                                          <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                            <span>Stall Risk: Low Seed-to-Leecher Ratio</span>
                                          </div>
                                          <div className="text-slate-300 text-[10px] font-mono">
                                            Ratio: <span className="text-rose-300 font-semibold">{seedLeechRatio < 0.001 ? '0.00' : seedLeechRatio.toFixed(3)}x</span> ({item.seeders} seeds / {item.leechers} leechers)
                                          </div>
                                          <div className="text-slate-400 text-[10px]">
                                            Ratio &lt; 0.05. Torrent may be dead or progress will stall.
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>

                                {/* Leechers */}
                                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                                  {item.leechers.toLocaleString()}
                                </td>

                                {/* Action Buttons: WebTorrent vs Device Client */}
                                <td
                                  className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    {/* Primary WebTorrent In-Browser Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartTransfer(item, 'web-client')
                                      }
                                      title="Download or Stream inside Browser via WebTorrent"
                                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                        defaultMode === 'web-client'
                                          ? 'bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400'
                                          : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      {hasVideoStream ? (
                                        <Play className="w-3.5 h-3.5" />
                                      ) : (
                                        <Globe className="w-3.5 h-3.5" />
                                      )}
                                      Web Client
                                    </button>

                                    {/* Native Device Client Handoff Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartTransfer(item, 'device-client')
                                      }
                                      title="Open Magnet Link in Installed Device Torrent Client"
                                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                        defaultMode === 'device-client'
                                          ? 'bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400'
                                          : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      <Monitor className="w-3.5 h-3.5" />
                                      Device App
                                    </button>

                                    {/* Copy Magnet URI */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(item.magnetUri);
                                        setCopiedHash(item.infoHash);
                                        notify('Copied magnet URI to clipboard');
                                        setTimeout(() => setCopiedHash(null), 1800);
                                      }}
                                      title="Copy Magnet Link"
                                      className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/80 border border-slate-700/80 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                      {copiedHash === item.infoHash ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expandable File Tree & Swarm Inspection Drawer */}
                              {isExpanded && (() => {
                                const streamableMedia = getStreamableVideoFile(item);
                                const isPreviewOpen =
                                  previewingRowId === item.id && Boolean(streamableMedia);
                                const isRenameOpen = renamingRowId === item.id;
                                const activeRenameConfig: BatchRenameConfig =
                                  batchRenameConfigs[item.id] || {
                                    prefix: '',
                                    suffix: '',
                                    scope: 'all',
                                  };
                                const hasActiveRename = Boolean(
                                  activeRenameConfig.prefix || activeRenameConfig.suffix
                                );

                                return (
                                  <tr className="bg-slate-900/75">
                                    <td colSpan={6} className="px-6 py-4">
                                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                                        <div className="text-xs font-mono tabular-nums text-slate-400 space-y-1">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span>
                                                BTIH InfoHash:{' '}
                                                <span className="text-slate-200 select-all">
                                                  {item.infoHash}
                                                </span>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(item.infoHash);
                                                  notify('Copied raw BTIH InfoHash (Magnet protocol taken off)');
                                                }}
                                                className="text-[11px] font-sans text-sky-400 hover:text-sky-300 transition-colors"
                                                title="Copy clean 40-character hexadecimal InfoHash without magnet: protocol"
                                              >
                                                Take off Protocol (Copy Hash)
                                              </button>
                                            </div>
                                          </div>
                                          {item.ed2kHash && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-amber-400/90 font-semibold">
                                                eD2k Hash:{' '}
                                                <span className="text-amber-200 select-all font-mono">
                                                  {item.ed2kHash}
                                                </span>
                                              </span>
                                              {item.ed2kUri && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(item.ed2kUri!);
                                                    notify('Copied eDonkey2000 (ed2k://) file link to clipboard');
                                                  }}
                                                  className="text-[11px] font-sans font-semibold text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer"
                                                  title="Copy eD2k URI link for eMule / aMule / MLDonkey"
                                                >
                                                  Copy ed2k:// link
                                                </button>
                                              )}
                                            </div>
                                          )}
                                          {item.urnSha1 && (
                                            <div className="text-purple-300/80">
                                              SHA-1 Hash: <span className="text-purple-200 select-all font-mono">{item.urnSha1}</span>
                                            </div>
                                          )}
                                          {item.networkNodes && (
                                            <div className="text-slate-400">
                                              P2P Network Swarm:{' '}
                                              <span className="text-slate-200">
                                                {item.networkNodes}{' '}
                                                {item.p2pNetwork === 'eDonkey2000'
                                                  ? 'eD2k Sources & Kad DHT Peers'
                                                  : item.p2pNetwork === 'Gnutella'
                                                  ? 'Gnutella / G2 Ultrapeers'
                                                  : 'Swarm Peers'}
                                              </span>
                                            </div>
                                          )}
                                          <div className="truncate max-w-2xl text-slate-500">
                                            Magnet: {item.magnetUri}
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                          {item.ed2kUri && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(item.ed2kUri!);
                                                notify('Copied eDonkey2000 (ed2k://) file link');
                                              }}
                                              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                                              title="Copy ed2k:// file link for eMule, aMule, or MLDonkey"
                                            >
                                              <Copy className="w-3.5 h-3.5" />
                                              Copy eD2k Link
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setRenamingRowId(
                                                isRenameOpen ? null : item.id
                                              )
                                            }
                                            className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                              isRenameOpen || hasActiveRename
                                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                                                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 font-medium'
                                            }`}
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>
                                              {isRenameOpen
                                                ? 'Close Batch Rename'
                                                : hasActiveRename
                                                ? 'Batch Rename (Active)'
                                                : 'Batch Rename'}
                                            </span>
                                          </button>
                                          {streamableMedia && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setPreviewElapsedSec(0);
                                                setPreviewingRowId(
                                                  isPreviewOpen ? null : item.id
                                                );
                                              }}
                                              className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                                isPreviewOpen
                                                  ? 'bg-sky-400 text-slate-950 font-semibold'
                                                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25 font-medium'
                                              }`}
                                            >
                                              <Film className="w-3.5 h-3.5" />
                                              {isPreviewOpen ? 'Close Preview' : 'Preview'}
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStartTransfer(item, 'web-client')
                                            }
                                            className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            Download / Stream in Browser
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStartTransfer(item, 'device-client')
                                            }
                                            className="px-3.5 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Launch Device Magnet Handler
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              exportTorrentManifestFile(item);
                                              notify('Downloaded .torrent metadata file');
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                                          >
                                            Save .torrent File
                                          </button>
                                        </div>
                                      </div>

                                      {/* Lightweight Video Snippet Player (First 15 seconds) */}
                                      {isPreviewOpen && streamableMedia && (
                                        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row gap-4 items-center">
                                          <div className="w-full md:w-80 lg:w-96 rounded-lg overflow-hidden bg-black border border-slate-800 aspect-video shrink-0">
                                            <video
                                              key={`desk-prev-${item.id}`}
                                              src={`${streamableMedia.url}#t=0,${PREVIEW_CLIP_SECONDS}`}
                                              controls
                                              autoPlay
                                              playsInline
                                              preload="metadata"
                                              onTimeUpdate={(e) => {
                                                const vid = e.currentTarget;
                                                const sec = Math.min(
                                                  PREVIEW_CLIP_SECONDS,
                                                  Math.floor(vid.currentTime)
                                                );
                                                setPreviewElapsedSec(sec);
                                                if (vid.currentTime >= PREVIEW_CLIP_SECONDS) {
                                                  vid.pause();
                                                }
                                              }}
                                              className="w-full h-full object-contain"
                                            />
                                          </div>

                                          <div className="flex-1 min-w-0 space-y-2 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="font-semibold text-slate-100 truncate">
                                                Quick Stream Preview · {streamableMedia.name}
                                              </span>
                                              <span className="font-mono tabular-nums text-sky-400 shrink-0">
                                                00:{String(previewElapsedSec).padStart(2, '0')} / 00:{PREVIEW_CLIP_SECONDS}s snippet
                                              </span>
                                            </div>
                                            <p className="text-slate-400 leading-relaxed">
                                              Streaming initial {PREVIEW_CLIP_SECONDS}-second byte-range snippet directly from the WebSeed / WebTorrent swarm to verify video quality and audio sync before queuing the full download.
                                            </p>
                                            <div className="pt-1 flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleStartTransfer(item, 'web-client')
                                                }
                                                className="px-3 py-1.5 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                              >
                                                <Play className="w-3.5 h-3.5" />
                                                Open Full Stream in Web Client
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setPreviewingRowId(null)}
                                                className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                                              >
                                                Dismiss Preview
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* 24-Hour Seed-to-Peer Ratio Mini Sparkline Chart */}
                                      <TorrentRowSwarmSparkline torrent={item} />

                                      <div className="mt-3">
                                        {isRenameOpen && (
                                          <BatchRenameControl
                                            torrent={item}
                                            config={activeRenameConfig}
                                            onChangeConfig={(next) =>
                                              handleUpdateBatchRenameConfig(item.id, next)
                                            }
                                            onReset={() => {
                                              handleUpdateBatchRenameConfig(item.id, null);
                                              notify('Restored original torrent filenames');
                                            }}
                                            onApplyConfirm={() => {
                                              setRenamingRowId(null);
                                              notify(
                                                hasActiveRename
                                                  ? `Applied batch rename to ${item.files.length} files`
                                                  : 'No prefix or suffix entered'
                                              );
                                            }}
                                          />
                                        )}

                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-400">
                                              Included Swarm Payload Files ({item.files.length})
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setRenamingRowId(
                                                  isRenameOpen ? null : item.id
                                                )
                                              }
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700/80 bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                              <span>
                                                {isRenameOpen
                                                  ? 'Hide Batch Rename'
                                                  : hasActiveRename
                                                  ? `Edit Prefix/Suffix (${
                                                      activeRenameConfig.prefix || ''
                                                    }*${activeRenameConfig.suffix || ''})`
                                                  : 'Batch Rename (Prefix / Suffix)'}
                                              </span>
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            {summarizeFileCategories(item.files).map((cat) => (
                                              <span
                                                key={cat.category}
                                                className={`px-1.5 py-0.5 rounded border text-[10px] font-mono tabular-nums ${cat.badgeClasses}`}
                                              >
                                                {cat.count} {cat.label}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {item.files.map((f) => {
                                            const extMeta = getFileExtensionMeta(
                                              f.name,
                                              f.type
                                            );
                                            const isRenamed =
                                              Boolean(f.originalName) &&
                                              f.originalName !== f.name;
                                            return (
                                              <div
                                                key={f.path}
                                                className="px-3 py-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-colors flex items-center justify-between gap-3 text-xs"
                                              >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                  <FileExtensionIcon
                                                    filename={f.name}
                                                    fallbackType={f.type}
                                                    size="sm"
                                                  />
                                                  <div className="min-w-0 flex-1">
                                                    <div className="text-slate-200 font-medium truncate">
                                                      {f.name}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                                                      <span
                                                        className={`px-1 py-0.2 rounded border ${extMeta.badgeClasses}`}
                                                      >
                                                        {extMeta.extension}
                                                      </span>
                                                      <span>{extMeta.categoryLabel}</span>
                                                      {isRenamed && (
                                                        <span className="text-emerald-400 truncate">
                                                          · Orig: {f.originalName}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 shrink-0">
                                                  {f.streamUrl && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setPreviewElapsedSec(0);
                                                        setPreviewingRowId(
                                                          isPreviewOpen ? null : item.id
                                                        );
                                                      }}
                                                      className="text-sky-400 hover:text-sky-300 font-medium"
                                                    >
                                                      {isPreviewOpen ? 'Hide Preview' : 'Preview'}
                                                    </button>
                                                  )}
                                                  <span className="text-slate-400 font-mono tabular-nums">
                                                    {formatBytes(f.sizeBytes)}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                  WebTorrent Swarm & Device Transfers
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Monitor real-time WebRTC piece verification, stream video payloads directly in-browser, or hand off magnets to your native client.
                </p>
              </div>
              <button
                onClick={() => setIsAddMagnetOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0"
              >
                + Add Magnet URI / InfoHash
              </button>
            </div>

            <TransferWorkspace
              transfers={transfers}
              selectedTransferId={selectedTransferId}
              onSelectTransfer={setSelectedTransferId}
              onTogglePause={(id) =>
                setTransfers((prev) =>
                  prev.map((t) =>
                    t.id !== id
                      ? t
                      : {
                          ...t,
                          status:
                            t.status === 'paused' ? 'downloading' : 'paused',
                          downloadSpeedBytes:
                            t.status === 'paused' ? 3800000 : 0,
                        }
                  )
                )
              }
              onRemoveTransfer={(id) => {
                setTransfers((prev) => prev.filter((t) => t.id !== id));
                notify('Removed transfer session');
              }}
              onToggleFileSelection={(transferId, fileIndex) => {
                setTransfers((prev) =>
                  prev.map((t) =>
                    t.id !== transferId
                      ? t
                      : {
                          ...t,
                          files: t.files.map((f, i) =>
                            i === fileIndex ? { ...f, selected: !f.selected } : f
                          ),
                        }
                  )
                );
              }}
              deviceConfig={deviceConfig}
              onNotify={notify}
            />
          </div>
        )}

        {activeTab === 'indexers' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Torrent Search Sites & Indexer Registry
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Add custom torrent domains, RSS feeds, or Torznab APIs to expand your federated meta-search pool.
              </p>
            </div>

            <IndexerManagerView
              sites={sites}
              onToggleSite={(siteId) =>
                setSites((prev) =>
                  prev.map((s) =>
                    s.id === siteId ? { ...s, enabled: !s.enabled } : s
                  )
                )
              }
              onAddSite={(newSite) => {
                const next = [...sites, newSite];
                setSites(next);
                executeMultiSiteSearch(searchQuery, next);
              }}
              onDeleteSite={(siteId) =>
                setSites((prev) => prev.filter((s) => s.id !== siteId))
              }
              onUpdateSiteStatus={(siteId, latencyMs, status) =>
                setSites((prev) =>
                  prev.map((s) =>
                    s.id === siteId
                      ? { ...s, latencyMs, lastStatus: status }
                      : s
                  )
                )
              }
              onResetDefaults={() => {
                setSites(DEFAULT_INDEXERS);
                notify('Restored default torrent indexers');
              }}
              onNotify={notify}
              onOpenSourceCatalog={() => setIsSourceCatalogOpen(true)}
              onOpenTorkDoctor={() => setIsTorkDoctorOpen(true)}
              onConfigureAuth={(site) => {
                setAuthModalSite(site);
                setIsAuthModalOpen(true);
              }}
              rssFeeds={rssFeeds}
              onAddRssFeed={(newFeed) => {
                setRssFeeds((prev) => [newFeed, ...prev]);
                pollSingleRssFeed(newFeed, true);
              }}
              onToggleRssFeed={(feedId) => {
                setRssFeeds((prev) =>
                  prev.map((f) =>
                    f.id === feedId ? { ...f, enabled: !f.enabled } : f
                  )
                );
              }}
              onDeleteRssFeed={(feedId) => {
                const target = rssFeeds.find((f) => f.id === feedId);
                setRssFeeds((prev) => prev.filter((f) => f.id !== feedId));
                if (target) {
                  notify(`Removed RSS feed "${target.name}"`);
                }
              }}
              onPollRssFeed={handlePollRssFeed}
              onPollAllRssFeeds={handlePollAllRssFeeds}
              onResetRssDefaults={() => {
                setRssFeeds(DEFAULT_RSS_FEEDS);
                notify('Restored default RSS feed subscriptions');
              }}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Download Engine & Device Client Configuration
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Configure default download behavior between the integrated WebTorrent engine and external desktop or mobile BitTorrent clients.
              </p>
            </div>

            <ClientSettingsView
              defaultMode={defaultMode}
              onChangeDefaultMode={setDefaultMode}
              deviceConfig={deviceConfig}
              onUpdateDeviceConfig={setDeviceConfig}
              accentTheme={accentTheme}
              onChangeAccentTheme={setAccentTheme}
              trackSearchHistory={trackSearchHistory}
              onToggleTrackSearchHistory={setTrackSearchHistory}
              onClearAllSearchHistory={handleClearAllSearchHistory}
              onNotify={notify}
            />
          </div>
        )}
      </main>

      {/* Quiet Functional Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span>Kestrel Federated Torrent Search & WebTorrent Client</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">
              Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">S</kbd> Search ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">T</kbd> Transfers ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">Esc</kbd> Clear
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Keyboard Shortcuts (?)
            </button>
            <button
              onClick={() => setActiveTab('indexers')}
              className="hover:text-slate-300 transition-colors"
            >
              Manage Search Sites
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-300 transition-colors"
            >
              Configure Device Client
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (Shown on <768px screens OR when Mobile View mode is toggled on) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className={`${
          layoutMode === 'mobile'
            ? 'grid'
            : layoutMode === 'desktop'
            ? 'hidden'
            : 'grid md:hidden'
        } fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800/90 grid-cols-4 items-center h-14 px-2`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'search'
              ? 'text-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">
            Search
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'transfers'
              ? 'text-sky-400'
              : activeDownloadsCount > 0
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeDownloadsCount > 0 ? (
            <span
              className="relative inline-flex items-center justify-center w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <svg
                className="w-4 h-4 -rotate-90 overflow-visible"
                viewBox="0 0 16 16"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  strokeWidth="1.75"
                  className="stroke-slate-800"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  strokeWidth="1.75"
                  strokeDasharray="8 30"
                  strokeLinecap="round"
                  className="stroke-sky-400/35 origin-center animate-spin"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  strokeWidth="1.75"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringStrokeOffset}
                  strokeLinecap="round"
                  className="stroke-sky-400 transition-all duration-500 ease-out"
                />
              </svg>
              <span className="absolute w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            </span>
          ) : (
            <HardDrive className="w-4 h-4" />
          )}
          <span className="text-[10px] font-medium tracking-tight mt-0.5 font-mono tabular-nums">
            Transfers ({transfers.length})
            {activeDownloadsCount > 0 ? ` · ${activeDownloadProgress}%` : ''}
          </span>
          {activeDownloadsCount > 0 && (
            <svg
              className="absolute left-3 right-3 bottom-0.5 h-[2px] w-[calc(100%-1.5rem)] overflow-hidden rounded-full pointer-events-none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="2"
                className="fill-slate-800"
              />
              <rect
                x="0"
                y="0"
                width={`${activeDownloadProgress}%`}
                height="2"
                className="fill-sky-400 transition-all duration-500 ease-out animate-pulse"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('indexers')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'indexers'
              ? 'text-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5 font-mono tabular-nums">
            Sites ({sites.filter((s) => s.enabled).length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'settings'
              ? 'text-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">
            Settings
          </span>
        </button>
      </nav>

      {/* Add Magnet Modal */}
      <AddMagnetModal
        isOpen={isAddMagnetOpen}
        onClose={() => setIsAddMagnetOpen(false)}
        defaultMode={defaultMode}
        onStartTransfer={handleStartTransfer}
        onOpenAddSiteTab={() => setActiveTab('indexers')}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      {isShortcutsOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-md border border-slate-800 bg-[#111827] rounded-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-sky-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Global Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-800/80 text-xs">
              {[
                { keys: ['H'], label: 'Navigate Home, reset all filters & clear search query' },
                { keys: ['S', '/'], label: 'Focus torrent search bar' },
                { keys: ['↑', '↓'], label: 'Navigate rows when torrent table is focused' },
                { keys: ['Enter'], label: 'Expand or collapse focused torrent row' },
                { keys: ['Space'], label: 'Toggle batch selection on focused torrent row' },
                { keys: ['Esc'], label: 'Clear current search query or close modal' },
                { keys: ['T'], label: 'Switch to Transfers & WebStream tab' },
                { keys: ['I'], label: 'Switch to Search Sites (Indexers) tab' },
                { keys: ['A'], label: 'Open 1-Click Indexer Source Catalog' },
                { keys: ['L'], label: 'Toggle Search-as-you-type (Live Search)' },
                { keys: ['C'], label: 'Switch to Client Settings tab' },
                { keys: ['M'], label: 'Open + Add Magnet / InfoHash dialog' },
                { keys: ['W'], label: 'Set primary engine to In-Browser WebTorrent' },
                { keys: ['D'], label: 'Set primary engine to Native Device Client' },
                { keys: ['?'], label: 'Toggle this shortcuts reference' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="py-2.5 flex items-center justify-between gap-4"
                >
                  <span className="text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-medium"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Remove Confirmation Dialog */}
      {isBulkDeleteModalOpen && selectedTorrentItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsBulkDeleteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-remove-title"
        >
          <div
            className="w-full max-w-lg border border-slate-800 bg-[#111827] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h2 id="bulk-remove-title" className="text-base font-semibold text-slate-100">
                    Remove {selectedTorrentItems.length} {selectedTorrentItems.length === 1 ? 'Torrent' : 'Torrents'} from Search Index?
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    These items will be removed from your active search results. You can restore them anytime using the "Restore deleted" option on the search index table.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & Torrent Items Preview */}
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-mono tabular-nums pb-2.5 border-b border-slate-800/80">
                <span className="font-sans">Selected Payload</span>
                <span className="text-slate-200 font-semibold">
                  {formatBytes(batchSizeBreakdown.totalBytes)} · {batchSizeBreakdown.totalFiles} {batchSizeBreakdown.totalFiles === 1 ? 'file' : 'files'}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Items to be removed ({selectedTorrentItems.length})</span>
                  <span className="text-[10px] text-slate-500">Scroll to view all</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
                  {selectedTorrentItems.map((torrent) => (
                    <div
                      key={torrent.id}
                      className="flex items-center justify-between gap-3 p-2 rounded bg-slate-900/70 border border-slate-800/60 text-[11px]"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          {torrent.sourceName}
                        </span>
                        <span className="truncate text-slate-200 font-medium">
                          {torrent.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono text-slate-400 shrink-0">
                        <span>{torrent.sizeFormatted}</span>
                        <span className="text-emerald-400 font-semibold">
                          {torrent.seeders}S
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  This removes the selected items from the index search table. Any downloads already active in the Transfer Workspace will continue unaffected.
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleExportSelectedMetadata}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download JSON metadata backup before removing from index"
              >
                <FileDown className="w-3.5 h-3.5 text-sky-400" />
                <span>Export JSON Backup</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchDeleteSelected}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
                  autoFocus
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove {selectedTorrentItems.length} {selectedTorrentItems.length === 1 ? 'Torrent' : 'Torrents'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tork Doctor Diagnostics Modal */}
      <TorkDoctorModal
        isOpen={isTorkDoctorOpen}
        onClose={() => setIsTorkDoctorOpen(false)}
        sites={sites}
        onNotify={notify}
      />

      {/* 1-Click Source Catalog Modal */}
      <SourceCatalogModal
        isOpen={isSourceCatalogOpen}
        onClose={() => setIsSourceCatalogOpen(false)}
        sites={sites}
        onAddSite={(newSite) => {
          const next = [...sites, newSite];
          setSites(next);
          executeMultiSiteSearch(searchQuery, next);
        }}
        onToggleSite={(siteId) => {
          setSites((prev) =>
            prev.map((s) => (s.id === siteId ? { ...s, enabled: !s.enabled } : s))
          );
        }}
        onNotify={notify}
      />

      {/* Verified Linux / FOSS Distro Quick-Picker Hub */}
      <LinuxDistroHubModal
        isOpen={isLinuxDistroHubOpen}
        onClose={() => setIsLinuxDistroHubOpen(false)}
        onStartDownload={handleStartTransfer}
        onNotify={notify}
      />

      {/* RuTracker & Ru-Board Authentication & Cookie Manager Modal */}
      <TrackerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        site={authModalSite}
        onSaveAuth={(siteId, auth) => {
          setSites((prev) =>
            prev.map((s) => (s.id === siteId ? { ...s, auth } : s))
          );
        }}
        onNotify={notify}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2.5">
          <Check className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
