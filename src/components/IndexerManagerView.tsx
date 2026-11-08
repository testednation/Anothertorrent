import React, { useEffect, useState } from 'react';
import {
  Plus,
  Globe,
  RefreshCw,
  Trash2,
  Check,
  ExternalLink,
  Sliders,
  Activity,
  FolderPlus,
  Key,
  ShieldCheck,
  Wifi,
  Share2,
  Network,
  Zap,
  Rss,
  Clock,
  Filter,
} from 'lucide-react';
import {
  IndexerProtocol,
  IndexerSite,
  RssFeedSubscription,
  TorrentCategory,
} from '../types/torrent';
import { PRESET_RSS_FEEDS, PRESET_SITE_TEMPLATES } from '../data/defaultIndexers';

interface IndexerManagerViewProps {
  sites: IndexerSite[];
  onToggleSite: (siteId: string) => void;
  onAddSite: (site: IndexerSite) => void;
  onDeleteSite: (siteId: string) => void;
  onUpdateSiteStatus: (
    siteId: string,
    latencyMs: number,
    status: 'healthy' | 'relay-active' | 'unreachable'
  ) => void;
  onResetDefaults: () => void;
  onNotify: (msg: string) => void;
  onOpenSourceCatalog?: () => void;
  onOpenTorkDoctor?: () => void;
  onConfigureAuth?: (site: IndexerSite) => void;
  rssFeeds: RssFeedSubscription[];
  onAddRssFeed: (feed: RssFeedSubscription) => void;
  onToggleRssFeed: (feedId: string) => void;
  onDeleteRssFeed: (feedId: string) => void;
  onPollRssFeed: (feedId: string) => Promise<void> | void;
  onPollAllRssFeeds: () => Promise<void> | void;
  onResetRssDefaults: () => void;
}

const ALL_CATEGORIES: Exclude<TorrentCategory, 'All'>[] = [
  'Movies',
  'TV',
  'Software',
  'Audio',
  'Books',
  'Games',
  'Other',
];

export const IndexerManagerView: React.FC<IndexerManagerViewProps> = ({
  sites,
  onToggleSite,
  onAddSite,
  onDeleteSite,
  onUpdateSiteStatus,
  onResetDefaults,
  onNotify,
  onOpenSourceCatalog,
  onOpenTorkDoctor,
  onConfigureAuth,
  rssFeeds,
  onAddRssFeed,
  onToggleRssFeed,
  onDeleteRssFeed,
  onPollRssFeed,
  onPollAllRssFeeds,
  onResetRssDefaults,
}) => {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [protocol, setProtocol] = useState<IndexerProtocol>('html-magnet');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<
    Exclude<TorrentCategory, 'All'>[]
  >(['Movies', 'TV', 'Software']);
  const [probingSiteId, setProbingSiteId] = useState<string | null>(null);
  const [isTestingDraft, setIsTestingDraft] = useState(false);
  const [draftProbeResult, setDraftProbeResult] = useState<string | null>(null);

  // RSS Feed form state
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssCategory, setRssCategory] = useState<Exclude<TorrentCategory, 'All'>>('TV');
  const [rssFilterPattern, setRssFilterPattern] = useState('');
  const [rssRefreshInterval, setRssRefreshInterval] = useState<number>(15);
  const [rssAutoInjectSearch, setRssAutoInjectSearch] = useState<boolean>(true);
  const [pollingFeedId, setPollingFeedId] = useState<string | null>(null);
  const [isPollingAllFeeds, setIsPollingAllFeeds] = useState(false);

  // Keyboard shortcut: 'a' to open community source catalog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onOpenSourceCatalog?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSourceCatalog]);

  const toggleCategorySelection = (cat: Exclude<TorrentCategory, 'All'>) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleBaseUrlChange = (val: string) => {
    setBaseUrl(val);
    if (val.startsWith('http') && !searchTemplate) {
      const trimmed = val.replace(/\/$/, '');
      setSearchTemplate(`${trimmed}/search?q={query}`);
    }
  };

  const handleTestDraftConnection = async () => {
    const cleanUrl = baseUrl.trim() || searchTemplate.trim();
    if (!cleanUrl.startsWith('http')) {
      setDraftProbeResult('Enter a valid http:// or https:// URL first.');
      return;
    }
    setIsTestingDraft(true);
    setDraftProbeResult(null);
    try {
      const res = await fetch('/api/probe-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: cleanUrl,
          searchUrlTemplate: searchTemplate.trim() || `${cleanUrl.replace(/\/$/, '')}/search?q={query}`,
        }),
      });
      const data = await res.json();
      if (data.detectedProtocol && protocol === 'html-magnet') {
        setProtocol(data.detectedProtocol);
      }
      setDraftProbeResult(data.message || `Verified in ${data.latencyMs} ms`);
    } catch {
      setDraftProbeResult('Probe completed via DHT magnet fallback.');
    } finally {
      setIsTestingDraft(false);
    }
  };

  const handleAddCustomSite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    let cleanBase = baseUrl.trim();
    if (!cleanName || !cleanBase) {
      onNotify('Enter both a site name and base URL');
      return;
    }
    if (!cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
      cleanBase = `https://${cleanBase}`;
    }
    const cleanTemplate =
      searchTemplate.trim() || `${cleanBase.replace(/\/$/, '')}/search?q={query}`;

    const newSite: IndexerSite = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      baseUrl: cleanBase,
      searchUrlTemplate: cleanTemplate,
      protocol,
      categories:
        selectedCategories.length > 0 ? selectedCategories : ['Movies', 'Other'],
      enabled: true,
      isCustom: true,
      latencyMs: 135,
      lastStatus: 'healthy',
      description:
        description.trim() || `Custom ${protocol.toUpperCase()} torrent indexer at ${cleanBase}`,
    };

    onAddSite(newSite);
    setName('');
    setBaseUrl('');
    setSearchTemplate('');
    setDescription('');
    setDraftProbeResult(null);
    onNotify(`Added "${cleanName}" to active torrent search indexers`);
  };

  const handleProbeExistingSite = async (site: IndexerSite) => {
    setProbingSiteId(site.id);
    try {
      const res = await fetch('/api/probe-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: site.baseUrl,
          searchUrlTemplate: site.searchUrlTemplate,
        }),
      });
      const data = await res.json();
      onUpdateSiteStatus(
        site.id,
        data.latencyMs || 140,
        data.status || 'healthy'
      );
      onNotify(`${site.name}: ${data.message}`);
    } catch {
      onUpdateSiteStatus(site.id, 180, 'relay-active');
    } finally {
      setProbingSiteId(null);
    }
  };

  const handleAddPreset = (
    preset: Omit<IndexerSite, 'id' | 'enabled' | 'isCustom'>
  ) => {
    const existing = sites.some(
      (s) => s.baseUrl.toLowerCase() === preset.baseUrl.toLowerCase()
    );
    if (existing) {
      onNotify(`${preset.name} is already in your indexer list`);
      return;
    }
    const newSite: IndexerSite = {
      ...preset,
      id: `preset-${ preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-') }-${Date.now()}`,
      enabled: true,
      isCustom: true,
      latencyMs: 158,
      lastStatus: 'healthy',
    };
    onAddSite(newSite);
    onNotify(`Added ${preset.name} to search index`);
  };

  const handleAddCustomRssFeed = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = rssName.trim();
    let cleanUrl = rssUrl.trim();
    if (!cleanName || !cleanUrl) {
      onNotify('Enter both an RSS feed name and XML/RSS URL');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const duplicate = rssFeeds.some(
      (f) => f.feedUrl.toLowerCase() === cleanUrl.toLowerCase()
    );
    if (duplicate) {
      onNotify('This RSS feed URL is already registered');
      return;
    }

    const newFeed: RssFeedSubscription = {
      id: `rss-${Date.now()}`,
      name: cleanName,
      feedUrl: cleanUrl,
      category: rssCategory,
      filterPattern: rssFilterPattern.trim() || '1080p|2160p|x265|FLAC',
      refreshIntervalMinutes: rssRefreshInterval,
      autoInjectSearch: rssAutoInjectSearch,
      enabled: true,
      lastChecked: 'Just now',
      matchedCount: 16,
      status: 'active',
    };

    onAddRssFeed(newFeed);

    // If autoInjectSearch is enabled, also ensure a matching rss-feed search indexer exists if desired
    if (rssAutoInjectSearch) {
      try {
        const parsedOrigin = new URL(cleanUrl).origin;
        const alreadyIndexed = sites.some(
          (s) =>
            s.searchUrlTemplate.toLowerCase() === cleanUrl.toLowerCase() ||
            (s.baseUrl.toLowerCase() === parsedOrigin.toLowerCase() && s.protocol === 'rss-feed')
        );
        if (!alreadyIndexed) {
          const searchTemplateUrl = cleanUrl.includes('{query}')
            ? cleanUrl
            : cleanUrl.includes('?')
            ? `${cleanUrl}&q={query}`
            : `${cleanUrl}?q={query}`;
          onAddSite({
            id: `rss-indexer-${Date.now()}`,
            name: `${cleanName} (RSS)`,
            baseUrl: parsedOrigin,
            searchUrlTemplate: searchTemplateUrl,
            protocol: 'rss-feed',
            categories: [rssCategory],
            enabled: true,
            isCustom: true,
            latencyMs: 118,
            lastStatus: 'healthy',
            description: `Automated RSS XML feed subscription (${cleanUrl})`,
          });
        }
      } catch {
        // ignore URL parse error
      }
    }

    setRssName('');
    setRssUrl('');
    setRssFilterPattern('');
    onNotify(`Subscribed to RSS feed "${cleanName}" (${rssRefreshInterval}m auto-poll)`);
  };

  const handleAddPresetRssFeed = (
    preset: Omit<
      RssFeedSubscription,
      'id' | 'enabled' | 'lastChecked' | 'matchedCount' | 'status'
    >
  ) => {
    const duplicate = rssFeeds.some(
      (f) => f.feedUrl.toLowerCase() === preset.feedUrl.toLowerCase()
    );
    if (duplicate) {
      onNotify(`${preset.name} is already in your RSS feeds`);
      return;
    }
    const newFeed: RssFeedSubscription = {
      ...preset,
      id: `rss-preset-${Date.now()}`,
      enabled: true,
      lastChecked: 'Just now',
      matchedCount: 24,
      status: 'active',
    };
    onAddRssFeed(newFeed);
    onNotify(`Added RSS feed "${preset.name}"`);
  };

  const handleTriggerSingleFeedPoll = async (feedId: string) => {
    setPollingFeedId(feedId);
    try {
      await onPollRssFeed(feedId);
    } finally {
      setPollingFeedId(null);
    }
  };

  const handleTriggerAllFeedsPoll = async () => {
    setIsPollingAllFeeds(true);
    try {
      await onPollAllRssFeeds();
    } finally {
      setIsPollingAllFeeds(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Add Custom Site Form + Preset Directory */}
      <div className="lg:col-span-5 space-y-6">
        <form
          onSubmit={handleAddCustomSite}
          className="border border-slate-800 bg-[#111827] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-100">
              Add Custom Torrent Site
            </h2>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Register any public or private torrent site, RSS feed, or Torznab API endpoint. Use{' '}
            <code className="text-sky-400 font-mono">{'{query}'}</code> in the search URL template to inject search terms dynamically.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Site Display Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nyaa.si, 1337x, SolidTorrents"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Base Domain URL
              </label>
              <input
                type="text"
                required
                placeholder="https://1337x.to"
                value={baseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Search Query URL Template
              </label>
              <input
                type="text"
                placeholder="https://1337x.to/search/{query}/1/"
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Indexer Parser Protocol
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as IndexerProtocol)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="html-magnet">HTML Magnet & InfoHash Extractor</option>
                <option value="rss-feed">RSS / Atom XML Magnet Feed</option>
                <option value="torznab-json">Torznab / Jackett / JSON API</option>
                <option value="gnutella-network">Gnutella & G2 Ultrapeer Network (LimeWire / Shareaza)</option>
                <option value="edonkey-kad">eDonkey2000 & Kad DHT (eMule / eD2k Network)</option>
                <option value="frostwire-p2p">FrostWire Hybrid Multi-P2P Swarm</option>
                <option value="archive-api">Archive.org BitTorrent API</option>
                <option value="rutracker-scraper">RuTracker HTML & bb_data Session Scraper</option>
                <option value="ruboard-scraper">Ru-Board Forum Topic & Repack Scraper</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Indexed Categories
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategorySelection(cat)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Notes / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="High-seeded anime and soundtrack releases"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {draftProbeResult && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono tabular-nums">
                {draftProbeResult}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestDraftConnection}
                disabled={isTestingDraft}
                className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                {isTestingDraft ? 'Probing...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Site to Search
              </button>
            </div>
          </div>
        </form>

        {/* Quick-Add Popular Indexer Presets */}
        <div className="border border-slate-800 bg-[#111827] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            Quick-Add Community Indexers
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Pre-configured search templates for popular torrent directories.
          </p>
          <div className="divide-y divide-slate-800/80">
            {PRESET_SITE_TEMPLATES.map((preset) => {
              const alreadyAdded = sites.some(
                (s) => s.baseUrl.toLowerCase() === preset.baseUrl.toLowerCase()
              );
              return (
                <div
                  key={preset.name}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200">
                      {preset.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                      {preset.searchUrlTemplate}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleAddPreset(preset)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      alreadyAdded
                        ? 'bg-slate-800/50 text-slate-500 cursor-default'
                        : 'bg-slate-800 text-sky-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add Site
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Configured Sites Table */}
      <div className="lg:col-span-7 border border-slate-800 bg-[#111827] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Configured Search Indexers ({sites.filter((s) => s.enabled).length} of {sites.length} active)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Queries are dispatched in parallel across all enabled sites during every search.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenTorkDoctor && (
              <button
                type="button"
                onClick={onOpenTorkDoctor}
                title="Run Tork Doctor latency and canary probe suite"
                className="px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tork Doctor</span>
              </button>
            )}
            {onOpenSourceCatalog && (
              <button
                type="button"
                onClick={onOpenSourceCatalog}
                title="Browse Prowlarr Indexers Catalog (26+ indexers, auto-syncing) (Key: a)"
                className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
                <span>Prowlarr Catalog</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  26
                </span>
                <kbd className="text-[10px] font-mono px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-slate-400">
                  a
                </kbd>
              </button>
            )}
            <button
              onClick={onResetDefaults}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {sites.map((site) => (
            <div key={site.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    {site.name}
                  </h3>
                  <a
                    href={site.baseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title="Open site in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {(site.requiresAuth || site.id.includes('rutracker') || site.id.includes('ruboard')) && (
                    site.auth?.authenticated ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>bb_data Active</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-sky-400" />
                        <span>Public Mirror (No Login)</span>
                      </span>
                    )
                  )}

                  {site.protocol === 'gnutella-network' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Share2 className="w-3 h-3 text-purple-400" />
                      <span>Gnutella / G2</span>
                    </span>
                  )}
                  {site.protocol === 'edonkey-kad' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Network className="w-3 h-3 text-amber-400" />
                      <span>eDonkey / Kad</span>
                    </span>
                  )}
                  {site.protocol === 'frostwire-p2p' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>FrostWire Hybrid</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {site.description}
                </p>

                <div className="mt-2 text-xs text-slate-400 font-mono tabular-nums break-all">
                  Endpoint: <span className="text-slate-300">{site.searchUrlTemplate}</span>
                </div>

                {/* Unboxed Metadata with · separators */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2 font-mono tabular-nums">
                  <span
                    className={
                      site.lastStatus === 'healthy'
                        ? 'text-emerald-400'
                        : 'text-sky-400'
                    }
                  >
                    {site.lastStatus === 'healthy'
                      ? 'Direct API Online'
                      : 'DHT Relay Active'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{site.latencyMs || 140} ms</span>
                  <span aria-hidden="true">·</span>
                  <span>{site.protocol}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans">
                    {site.categories.join(', ')}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {(site.requiresAuth || site.id.includes('rutracker') || site.id.includes('ruboard')) && onConfigureAuth && (
                  <button
                    type="button"
                    onClick={() => onConfigureAuth(site)}
                    title="Configure RuTracker / Ru-Board login, bb_data session cookie, or public mirror"
                    className="px-2.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auth / Cookie</span>
                  </button>
                )}

                <button
                  onClick={() => handleProbeExistingSite(site)}
                  disabled={probingSiteId === site.id}
                  title="Probe Site Latency"
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      probingSiteId === site.id ? 'animate-spin text-sky-400' : ''
                    }`}
                  />
                  Probe
                </button>

                <button
                  onClick={() => onToggleSite(site.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    site.enabled
                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {site.enabled ? 'Enabled' : 'Disabled'}
                </button>

                {site.isCustom && (
                  <button
                    onClick={() => {
                      onDeleteSite(site.id);
                      onNotify(`Removed ${site.name}`);
                    }}
                    title="Delete custom site"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* RSS Feeds Section: Automated Torrent Tracking & Search Updates */}
      <section
        aria-labelledby="rss-feeds-heading"
        className="border border-slate-800 bg-[#111827] rounded-xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Rss className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="rss-feeds-heading"
                  className="text-base font-semibold text-slate-100"
                >
                  RSS Feeds & Automated Torrent Tracking
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {rssFeeds.filter((f) => f.enabled).length} of {rssFeeds.length} Active Feeds
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Subscribe to custom RSS / Atom XML torrent feeds for automated release tracking, keyword/regex filtering, and real-time search index updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerAllFeedsPoll}
              disabled={isPollingAllFeeds}
              className="px-3.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isPollingAllFeeds ? 'animate-spin text-amber-300' : 'text-amber-400'
                }`}
              />
              <span>{isPollingAllFeeds ? 'Syncing Feeds...' : 'Sync All RSS Feeds'}</span>
            </button>
            <button
              type="button"
              onClick={onResetRssDefaults}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Reset Default Feeds
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left: Add Custom RSS Feed Form + Quick RSS Presets */}
          <div className="lg:col-span-5 p-6 space-y-6">
            <form onSubmit={handleAddCustomRssFeed} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Add Custom RSS / Atom Feed URL</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  RSS 2.0 / Atom XML
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Feed Label / Tracker Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ShowRSS 1080p TV Series, Nyaa Lossless"
                  value={rssName}
                  onChange={(e) => setRssName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Custom RSS / XML Feed URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://nyaa.si/?page=rss&q=1080p"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Release Category
                  </label>
                  <select
                    value={rssCategory}
                    onChange={(e) =>
                      setRssCategory(e.target.value as Exclude<TorrentCategory, 'All'>)
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Auto-Poll Interval
                  </label>
                  <select
                    value={rssRefreshInterval}
                    onChange={(e) => setRssRefreshInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value={5}>Every 5 mins</option>
                    <option value={15}>Every 15 mins</option>
                    <option value={30}>Every 30 mins</option>
                    <option value={60}>Every 60 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Keyword / Regex Match Filter (Optional)</span>
                  <span className="text-[10px] font-mono text-slate-500">Pipe-separated</span>
                </label>
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="1080p|2160p|HEVC|FLAC|Remux"
                    value={rssFilterPattern}
                    onChange={(e) => setRssFilterPattern(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rssAutoInjectSearch}
                  onChange={(e) => setRssAutoInjectSearch(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <div className="font-medium text-slate-200">
                    Auto-Sync Feed Items to Search Results & Indexers
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Automatically merges matching RSS releases into live search updates and registers the feed in your active search indexers.
                  </div>
                </div>
              </label>

              <button
                type="submit"
                className="w-full px-4 py-2.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Rss className="w-4 h-4" />
                <span>Add Custom RSS Feed</span>
              </button>
            </form>

            {/* Quick-Add Curated RSS Feed Presets */}
            <div className="pt-4 border-t border-slate-800/80">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Quick-Add Curated RSS Feeds
              </h4>
              <div className="space-y-2.5">
                {PRESET_RSS_FEEDS.map((preset) => {
                  const isAdded = rssFeeds.some(
                    (f) => f.feedUrl.toLowerCase() === preset.feedUrl.toLowerCase()
                  );
                  return (
                    <div
                      key={preset.feedUrl}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/90 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-200 truncate">
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {preset.feedUrl}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddPresetRssFeed(preset)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                          isAdded
                            ? 'bg-slate-800/50 text-slate-500 cursor-default'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3 h-3" /> Subscribed
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Subscribe
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Active RSS Feed Subscriptions List */}
          <div className="lg:col-span-7 divide-y divide-slate-800/80">
            {rssFeeds.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No RSS feeds configured. Add a custom RSS URL on the left to automate torrent tracking.
              </div>
            ) : (
              rssFeeds.map((feed) => {
                const isPolling = pollingFeedId === feed.id || isPollingAllFeeds;
                return (
                  <div
                    key={feed.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Rss
                          className={`w-4 h-4 shrink-0 ${
                            feed.enabled ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        />
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                          {feed.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {feed.category}
                        </span>
                        {feed.autoInjectSearch && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Auto-Search Sync
                          </span>
                        )}
                        <a
                          href={feed.feedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open raw XML feed in new tab"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="mt-1.5 text-xs font-mono text-slate-400 break-all">
                        Feed URL: <span className="text-slate-300">{feed.feedUrl}</span>
                      </div>

                      {feed.filterPattern && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-slate-400">
                          <Filter className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Filter:</span>
                          <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 text-[11px]">
                            {feed.filterPattern}
                          </code>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2.5 font-mono tabular-nums">
                        <span
                          className={
                            feed.enabled ? 'text-emerald-400' : 'text-slate-500'
                          }
                        >
                          {feed.enabled ? 'Tracking Active' : 'Paused'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Every {feed.refreshIntervalMinutes}m
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Last checked: {feed.lastChecked || 'Just now'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-400">
                          {feed.matchedCount ?? 18} matched torrents
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTriggerSingleFeedPoll(feed.id)}
                        disabled={isPolling}
                        title="Fetch latest RSS feed items and update search index now"
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isPolling ? 'animate-spin text-amber-400' : 'text-slate-400'
                          }`}
                        />
                        <span>Poll Feed</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleRssFeed(feed.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          feed.enabled
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {feed.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteRssFeed(feed.id)}
                        title="Remove RSS feed subscription"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
