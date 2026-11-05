import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Globe,
  Monitor,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DownloadTargetMode, TorrentItem } from '../types/torrent';
import { validateMagnetOrHashInput } from '../services/torrentEngine';

interface AddMagnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode: DownloadTargetMode;
  onStartTransfer: (torrent: TorrentItem, mode: DownloadTargetMode) => void;
  onOpenAddSiteTab: () => void;
}

const SAMPLE_MAGNET =
  'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel+%282010%29+1080p+Blender+Open+Movie&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fcommondatastorage.googleapis.com%2Fgtv-videos-bucket%2Fsample%2FSintel.mp4';

export const AddMagnetModal: React.FC<AddMagnetModalProps> = ({
  isOpen,
  onClose,
  defaultMode,
  onStartTransfer,
  onOpenAddSiteTab,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<DownloadTargetMode>(defaultMode);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const validation = useMemo(() => validateMagnetOrHashInput(input), [input]);

  if (!isOpen) return null;

  const hasText = input.trim().length > 0;
  const showError = (hasText || touched) && !validation.isValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.isValid || !validation.parsedTorrent) {
      return;
    }
    onStartTransfer(validation.parsedTorrent, mode);
    setInput('');
    setTouched(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-slate-800 bg-[#111827] rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">
            Add Magnet URI or InfoHash
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="magnet-uri-input"
                className="block text-xs font-medium text-slate-300"
              >
                Magnet Link or BTIH InfoHash (40-char Hex / 32-char Base32)
              </label>
              <div className="flex items-center gap-2">
                {input.trim().startsWith('magnet:?') && (
                  <button
                    type="button"
                    onClick={() => {
                      const hashMatch = input.match(/xt=urn:btih:([a-zA-Z0-9]{32,40})/i);
                      if (hashMatch) {
                        setInput(hashMatch[1].toLowerCase());
                        setTouched(true);
                      }
                    }}
                    className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Take off Magnet Protocol
                  </button>
                )}
                {/^[a-fA-F0-9]{40}$/.test(input.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput(`magnet:?xt=urn:btih:${input.trim().toLowerCase()}&dn=Custom+Transfer`);
                      setTouched(true);
                    }}
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Add Magnet Protocol
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInput(SAMPLE_MAGNET);
                    setTouched(true);
                  }}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Sample Magnet
                </button>
              </div>
            </div>

            <textarea
              id="magnet-uri-input"
              rows={3}
              value={input}
              onBlur={() => {
                if (input.trim().length > 0) setTouched(true);
              }}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              placeholder="magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel..."
              aria-invalid={showError}
              className={`w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors ${
                validation.isValid
                  ? 'border-emerald-500/70 focus:border-emerald-400'
                  : showError
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-slate-700/80 focus:border-sky-500'
              }`}
            />

            {/* Client-Side Validation Feedback */}
            {showError && (
              <div
                role="alert"
                className="mt-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  {validation.error ||
                    'Provide a valid magnet:?xt=urn:btih:... URI or 40-character hexadecimal InfoHash.'}
                </span>
              </div>
            )}

            {validation.isValid && validation.infoHash && (
              <div className="mt-2 px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {validation.inputType === 'magnet-uri'
                      ? 'Valid Magnet URI Verified'
                      : validation.inputType === 'base32-infohash'
                      ? 'Valid 32-Char Base32 InfoHash (Normalized to Hex)'
                      : 'Valid 40-Char Hexadecimal InfoHash'}
                  </span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400">
                    {validation.trackersCount} trackers
                    {validation.webSeedsCount > 0
                      ? ` · ${validation.webSeedsCount} WebSeed`
                      : ''}
                  </span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-300 truncate">
                  BTIH: <span className="text-slate-100">{validation.infoHash}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Name: <span className="text-slate-200">{validation.displayName}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Download Destination
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('web-client')}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  mode === 'web-client'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                WebTorrent (In-Browser)
              </button>
              <button
                type="button"
                onClick={() => setMode('device-client')}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                  mode === 'device-client'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Device Client App
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddSiteTab();
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium whitespace-nowrap shrink-0"
            >
              Want to add a search site instead?
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!validation.isValid}
                title={
                  validation.isValid
                    ? 'Start transfer with validated Magnet/InfoHash'
                    : 'Enter a valid Magnet URI or InfoHash to enable download'
                }
                className="px-4 py-2 text-xs font-semibold bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-500 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Start Download
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

