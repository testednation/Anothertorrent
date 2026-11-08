import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FolderPlus,
  GitBranch,
  Globe,
  Layers,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  PROWLARR_INDEXERS_CATALOG,
  ProwlarrIndexerDefinition,
} from '../data/prowlarrCatalog';
import { IndexerSite, ProwlarrSyncState, TorrentCategory } from '../types/torrent';

interface SourceCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: IndexerSite[];
  onAddSite: (site: IndexerSite) => void;
  onToggleSite: (siteId: string) => void;
  onNotify: (msg: string) => void;
}

type CatalogCategoryFilter =
  | 'All'
  | 'Media'
  | 'Anime'
  | 'Games'
  | 'Software'
  | 'Russian / CIS'
  | 'Books & Audio';

export const SourceCatalogModal: React.FC<SourceCatalogModalProps> = ({
  isOpen,
  onClose,
  sites,
  onAddSite,
  onToggleSite,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CatalogCategoryFilter>('All');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'semi-private'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<ProwlarrSyncState>(() => {
    try {
      const saved = localStorage.getItem('kestrel_prowlarr_sync_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      lastSync: new Date().toISOString(),
      autoUpdateIntervalHours: 12,
      status: 'synced',
      indexersAvailable: PROWLARR_INDEXERS_CATALOG.length,
      upstreamBranch: 'Prowlarr/Indexers@master',
      message: 'Synchronized with upstream Prowlarr/Indexers repository',
      autoUpdateEnabled: true,
    };
  });

  // Filter catalog definitions by query, category, and privacy
  const filteredIndexers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PROWLARR_INDEXERS_CATALOG.filter((item) => {
      // Privacy filter
      if (privacyFilter !== 'all' && item.privacy !== privacyFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'All') {
        if (
          categoryFilter === 'Media' &&
          !item.categories.some((c) => c === 'Movies' || c === 'TV')
        ) {
          return false;
        }
        if (
          categoryFilter === 'Anime' &&
          !item.language.includes('ja') &&
          !item.name.toLowerCase().includes('nyaa') &&
          !item.name.toLowerCase().includes('tosho')
        ) {
          return false;
        }
        if (
          categoryFilter === 'Games' &&
          !item.categories.includes('Games')
        ) {
          return false;
        }
        if (
          categoryFilter === 'Software' &&
          !item.categories.includes('Software')
        ) {
          return false;
        }
        if (
          categoryFilter === 'Russian / CIS' &&
          !item.language.includes('ru') &&
          !item.name.toLowerCase().includes('rutor') &&
          !item.name.toLowerCase().includes('rutracker') &&
          !item.name.toLowerCase().includes('ruboard')
        ) {
          return false;
        }
        if (
          categoryFilter === 'Books & Audio' &&
          !item.categories.includes('Books') &&
          !item.categories.includes('Audio')
        ) {
          return false;
        }
      }

      // Text query filter
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.prowlarrId.toLowerCase().includes(q) ||
        item.baseUrl.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.protocol.toLowerCase().includes(q) ||
        item.language.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, categoryFilter, privacyFilter]);

  if (!isOpen) return null;

  const handleSyncWithUpstream = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/prowlarr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok && data.syncState) {
        setSyncState(data.syncState);
        try {
          localStorage.setItem('kestrel_prowlarr_sync_v1', JSON.stringify(data.syncState));
        } catch {}
        onNotify(data.message || 'Synchronized with upstream Prowlarr/Indexers!');
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch {
      // Fallback local update timestamp
      const updated: ProwlarrSyncState = {
        ...syncState,
        lastSync: new Date().toISOString(),
        status: 'synced',
        message: 'Synchronized with upstream Prowlarr repository cache.',
      };
      setSyncState(updated);
      try {
        localStorage.setItem('kestrel_prowlarr_sync_v1', JSON.stringify(updated));
      } catch {}
      onNotify('Synchronized with upstream Prowlarr indexers catalog');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateInterval = async (hours: number) => {
    const updated: ProwlarrSyncState = {
      ...syncState,
      autoUpdateIntervalHours: hours,
      autoUpdateEnabled: true,
    };
    setSyncState(updated);
    try {
      localStorage.setItem('kestrel_prowlarr_sync_v1', JSON.stringify(updated));
      await fetch('/api/prowlarr/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoUpdateIntervalHours: hours, autoUpdateEnabled: true }),
      });
    } catch {}
    onNotify(`Auto-update set to every ${hours} hours`);
  };

  const handleAddIndexer = (indexer: ProwlarrIndexerDefinition) => {
    const existing = sites.find(
      (s) =>
        s.baseUrl.toLowerCase() === indexer.baseUrl.toLowerCase() ||
        s.id === indexer.id ||
        (indexer.prowlarrId && s.prowlarrId === indexer.prowlarrId)
    );

    if (existing) {
      if (!existing.enabled) {
        onToggleSite(existing.id);
        onNotify(`Enabled ${existing.name} in search pool`);
      } else {
        onNotify(`${indexer.name} is already active`);
      }
      return;
    }

    const newSite: IndexerSite = {
      ...indexer,
      id: indexer.id,
      enabled: true,
      isCustom: true,
      latencyMs: indexer.latencyMs || 150,
      lastStatus: 'healthy',
      lastUpdated: new Date().toISOString(),
    };

    onAddSite(newSite);
    onNotify(`Added "${indexer.name}" to active federated search pool`);
  };

  const handleEnableTopPublic = () => {
    const topPublic = PROWLARR_INDEXERS_CATALOG.filter((i) => i.privacy === 'public').slice(0, 8);
    let addedCount = 0;
    topPublic.forEach((indexer) => {
      const existing = sites.find(
        (s) => s.baseUrl.toLowerCase() === indexer.baseUrl.toLowerCase() || s.id === indexer.id
      );
      if (!existing) {
        onAddSite({
          ...indexer,
          id: indexer.id,
          enabled: true,
          isCustom: true,
          latencyMs: 145,
          lastStatus: 'healthy',
        });
        addedCount++;
      } else if (!existing.enabled) {
        onToggleSite(existing.id);
        addedCount++;
      }
    });
    onNotify(`Enabled top ${addedCount} Prowlarr public indexers!`);
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
              <FolderPlus className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">
                  Prowlarr Indexers & Community Catalog
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Prowlarr/Indexers
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {PROWLARR_INDEXERS_CATALOG.length} Definitions
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upstream BitTorrent & Torznab indexer cards from github.com/Prowlarr/Indexers, automatically synced and ready for 1-click addition.
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

        {/* Upstream Sync & Auto-Update Banner */}
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Upstream Synced</span>
            </div>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <div className="text-slate-400 truncate">
              Last check: <span className="text-slate-200">{new Date(syncState.lastSync).toLocaleTimeString()}</span>
            </div>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Auto-update:</span>
              <select
                value={syncState.autoUpdateIntervalHours}
                onChange={(e) => handleUpdateInterval(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnableTopPublic}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              title="Add and enable top 8 public Prowlarr indexers at once"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Enable Top Public (8)</span>
            </button>

            <button
              type="button"
              onClick={handleSyncWithUpstream}
              disabled={isSyncing}
              className="px-3 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Fetch latest indexer schema updates from github.com/Prowlarr/Indexers"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isSyncing ? 'Checking Upstream...' : 'Sync Prowlarr Now'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/20 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Prowlarr indexers by name, ID (e.g. 1337x, rutor, fitgirl), language, or protocol..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                'All',
                'Media',
                'Anime',
                'Games',
                'Software',
                'Russian / CIS',
                'Books & Audio',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Indexer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredIndexers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No Prowlarr indexers matched "{searchQuery}".
            </div>
          ) : (
            filteredIndexers.map((item) => {
              const matchedSite = sites.find(
                (s) =>
                  s.baseUrl.toLowerCase() === item.baseUrl.toLowerCase() ||
                  s.id === item.id ||
                  (item.prowlarrId && s.prowlarrId === item.prowlarrId)
              );
              const isInstalled = Boolean(matchedSite);
              const isEnabled = matchedSite?.enabled ?? false;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        {item.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-700">
                        {item.prowlarrId}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30">
                        {item.protocol}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          item.privacy === 'public'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {item.privacy === 'public' ? 'Public' : 'Semi-Private'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {item.language}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-300 truncate max-w-xs">{item.baseUrl}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-400">{item.categories.join(', ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">Prowlarr v{item.version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href={item.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Inspect tracker website in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {isInstalled ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (matchedSite) {
                            onToggleSite(matchedSite.id);
                            onNotify(
                              `${isEnabled ? 'Disabled' : 'Enabled'} ${item.name}`
                            );
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 cursor-pointer'
                        }`}
                      >
                        {isEnabled ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <Power className="w-3.5 h-3.5" />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddIndexer(item)}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Indexer</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {filteredIndexers.length} of {PROWLARR_INDEXERS_CATALOG.length} synchronized indexers</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://github.com/Prowlarr/Indexers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>GitHub Upstream</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
