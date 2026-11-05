import React from 'react';
import { Edit3, RotateCcw, Check, Sparkles, ArrowRight } from 'lucide-react';
import { BatchRenameConfig, TorrentItem } from '../types/torrent';
import {
  applyBatchRenameToFilename,
  extractFileExtension,
} from './FileExtensionIcon';

interface BatchRenameControlProps {
  torrent: TorrentItem;
  config: BatchRenameConfig;
  onChangeConfig: (next: BatchRenameConfig) => void;
  onReset: () => void;
  onApplyConfirm: () => void;
  compact?: boolean;
}

export const BatchRenameControl: React.FC<BatchRenameControlProps> = ({
  torrent,
  config,
  onChangeConfig,
  onReset,
  onApplyConfirm,
  compact = false,
}) => {
  const hasActiveRule = Boolean(config.prefix || config.suffix);

  const resolutionOrCat = torrent.resolution || torrent.category;
  const sourceShort = torrent.sourceName.split(' ')[0] || 'Swarm';
  const codecTag = (torrent.codec || 'x265')
    .split('/')[0]
    .trim()
    .replace(/\s+/g, '');

  const prefixPresets = [
    `[${resolutionOrCat}]_`,
    `[${sourceShort}]_`,
    '2026-',
    '[Archival]_',
  ];

  const suffixPresets = [
    '_verified',
    '_remux',
    `_${codecTag}`,
    '_backup',
  ];

  const sampleFile = torrent.files[0];
  const sampleOriginalName = sampleFile
    ? sampleFile.originalName || sampleFile.name
    : `${torrent.title}.mp4`;
  const sampleExt = extractFileExtension(sampleOriginalName);
  const sampleStem = sampleExt
    ? sampleOriginalName.slice(0, sampleOriginalName.length - sampleExt.length)
    : sampleOriginalName;
  const sampleOriginalExt = sampleExt
    ? sampleOriginalName.slice(sampleOriginalName.length - sampleExt.length)
    : '';
  const sampleRenamed = applyBatchRenameToFilename(
    sampleOriginalName,
    config.prefix,
    config.suffix
  );

  return (
    <div className="mb-3 p-3.5 rounded-xl bg-slate-950/90 border border-sky-500/30 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/90">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Edit3 className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-2">
              <span>Batch Rename Payload Files</span>
              {hasActiveRule && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Active on {torrent.files.length}{' '}
                  {torrent.files.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Apply common prefixes or suffixes before queuing download (extensions are automatically preserved).
            </p>
          </div>
        </div>

        {/* Scope selector + Reset / Apply actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, scope: 'all' })}
              className={`px-2 py-1 rounded transition-colors ${
                config.scope === 'all'
                  ? 'bg-slate-800 text-sky-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Files ({torrent.files.length})
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, scope: 'media-only' })}
              className={`px-2 py-1 rounded transition-colors ${
                config.scope === 'media-only'
                  ? 'bg-slate-800 text-sky-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Media Only
            </button>
          </div>

          {hasActiveRule && (
            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors flex items-center gap-1"
              title="Restore original torrent filenames"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onApplyConfirm}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Rename</span>
          </button>
        </div>
      </div>

      {/* Prefix & Suffix Input Grid */}
      <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-3`}>
        {/* Prefix Column */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-slate-300">
            Filename Prefix (prepended to start)
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.prefix}
              onChange={(e) =>
                onChangeConfig({ ...config, prefix: e.target.value })
              }
              placeholder="e.g. [1080p]_ or 2026-"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {config.prefix && (
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, prefix: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 font-mono"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5 mr-1">
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              Presets:
            </span>
            {prefixPresets.map((preset) => {
              const isSelected = config.prefix === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      prefix: isSelected ? '' : preset,
                    })
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  +{preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Suffix Column */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-slate-300">
            Filename Suffix (appended before extension)
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.suffix}
              onChange={(e) =>
                onChangeConfig({ ...config, suffix: e.target.value })
              }
              placeholder="e.g. _verified or _remux"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            {config.suffix && (
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, suffix: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 font-mono"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5 mr-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              Presets:
            </span>
            {suffixPresets.map((preset) => {
              const isSelected = config.suffix === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      suffix: isSelected ? '' : preset,
                    })
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  +{preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Filename Transformation Preview Strip */}
      <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-slate-400 font-sans font-medium shrink-0">
            Live Preview:
          </span>
          <span className="text-slate-400 truncate max-w-[220px]" title={sampleOriginalName}>
            {sampleOriginalName}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate" title={sampleRenamed}>
            {config.prefix && (
              <span className="text-sky-400 font-semibold">{config.prefix}</span>
            )}
            <span className="text-slate-200">{sampleStem}</span>
            {config.suffix && (
              <span className="text-emerald-400 font-semibold">{config.suffix}</span>
            )}
            <span className="text-amber-300">{sampleOriginalExt}</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">
          {hasActiveRule
            ? 'Ready for Web Client / Device download'
            : 'Type or pick a preset above'}
        </span>
      </div>
    </div>
  );
};
