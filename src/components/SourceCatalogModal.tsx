import React, { useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  FolderPlus,
  Globe,
  Plus,
  Power,
  Search,
  Sliders,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { PRESET_SITE_TEMPLATES } from '../data/defaultIndexers';
import { IndexerSite, TorrentCategory } from '../types/torrent';

interface SourceCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: IndexerSite[];
  onAddSite: (site: IndexerSite) => void;
  onToggleSite: (siteId: string) => void;
  onNotify: (msg: string) => void;
}

type CatalogCategoryFilter = 'All' | 'Media' | 'Anime' | 'FOSS' | 'Audio' | 'Books';

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

  // Map category filter to actual categories
  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_SITE_TEMPLATES.filter((preset) => {
      // Category match
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Media' && !preset.categories.some((c) => c === 'Movies' || c === 'TV')) {
          return false;
        }
        if (categoryFilter === 'Anime' && !preset.name.toLowerCase().includes('nyaa') && !preset.categories.includes('TV')) {
          return false;
        }
        if (categoryFilter === 'FOSS' && !preset.categories.includes('Software')) {
          return false;
        }
        if (categoryFilter === 'Audio' && !preset.categories.includes('Audio')) {
          return false;
        }
        if (categoryFilter === 'Books' && !preset.categories.includes('Books')) {
          return false;
        }
      }

      // Query match
      if (!q) return true;
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.baseUrl.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.protocol.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const handleAddPreset = (preset: typeof PRESET_SITE_TEMPLATES[0]) => {
    const existing = sites.find(
      (s) => s.baseUrl.toLowerCase() === preset.baseUrl.toLowerCase()
    );

    if (existing) {
      if (!existing.enabled) {
        onToggleSite(existing.id);
        onNotify(`Enabled ${existing.name} in active search indexers`);
      } else {
        onNotify(`${preset.name} is already active`);
      }
      return;
    }

    const newSite: IndexerSite = {
      ...preset,
      id: `preset-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      enabled: true,
      isCustom: true,
      latencyMs: 145,
      lastStatus: 'healthy',
    };

    onAddSite(newSite);
    onNotify(`Added ${preset.name} to active federated search`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-800 bg-[#111827] rounded-xl shadow-2xl overflow-hidden"
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
                  1-Click Indexer Source Catalog
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  tork source add (a)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Curated community search endpoints, metadata scrapers, and DHT meta-indexers.
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

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/20 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter catalog by name, protocol, or tag (Press 'Esc' to close)..."
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
            {(['All', 'Media', 'Anime', 'FOSS', 'Audio', 'Books'] as const).map((cat) => (
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

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPresets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No indexer sources matched "{searchQuery}".
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const matchedSite = sites.find(
                (s) => s.baseUrl.toLowerCase() === preset.baseUrl.toLowerCase()
              );
              const isInstalled = Boolean(matchedSite);
              const isEnabled = matchedSite?.enabled ?? false;

              return (
                <div
                  key={preset.name}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        {preset.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        {preset.protocol}
                      </span>
                      {preset.name.includes('Knaben') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          DHT Indexer
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-300 truncate max-w-xs">{preset.baseUrl}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-400">{preset.categories.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <a
                      href={preset.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Inspect source website in new tab"
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
                              `${isEnabled ? 'Disabled' : 'Enabled'} ${preset.name}`
                            );
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
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
                        onClick={() => handleAddPreset(preset)}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Source</span>
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
          <div>
            Showing {filteredPresets.length} community indexer sources
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
