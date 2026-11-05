import React, { useState } from 'react';
import { Globe, Monitor, Check, Plus, Trash2, Palette } from 'lucide-react';
import {
  ACCENT_THEME_PRESETS,
  AccentThemeId,
  DeviceClientConfig,
  DownloadTargetMode,
} from '../types/torrent';

interface ClientSettingsViewProps {
  defaultMode: DownloadTargetMode;
  onChangeDefaultMode: (mode: DownloadTargetMode) => void;
  deviceConfig: DeviceClientConfig;
  onUpdateDeviceConfig: (config: DeviceClientConfig) => void;
  accentTheme: AccentThemeId;
  onChangeAccentTheme: (theme: AccentThemeId) => void;
  onNotify: (msg: string) => void;
}

const SWATCH_BG_CLASSES: Record<AccentThemeId, string> = {
  sky: 'bg-[#0ea5e9]',
  indigo: 'bg-[#6366f1]',
  emerald: 'bg-[#10b981]',
  amber: 'bg-[#f59e0b]',
  rose: 'bg-[#f43f5e]',
  violet: 'bg-[#8b5cf6]',
};

const SWATCH_RING_CLASSES: Record<AccentThemeId, string> = {
  sky: 'ring-[#38bdf8]',
  indigo: 'ring-[#818cf8]',
  emerald: 'ring-[#34d399]',
  amber: 'ring-[#fbbf24]',
  rose: 'ring-[#fb7185]',
  violet: 'ring-[#a78bfa]',
};

export const ClientSettingsView: React.FC<ClientSettingsViewProps> = ({
  defaultMode,
  onChangeDefaultMode,
  deviceConfig,
  onUpdateDeviceConfig,
  accentTheme,
  onChangeAccentTheme,
  onNotify,
}) => {
  const [newTracker, setNewTracker] = useState('');

  const activePreset =
    ACCENT_THEME_PRESETS.find((p) => p.id === accentTheme) ||
    ACCENT_THEME_PRESETS[0];

  const handleAddTracker = (e: React.FormEvent) => {
    e.preventDefault();
    const tr = newTracker.trim();
    if (!tr) return;
    if (deviceConfig.customTrackers.includes(tr)) {
      onNotify('Tracker is already in the list');
      return;
    }
    onUpdateDeviceConfig({
      ...deviceConfig,
      customTrackers: [...deviceConfig.customTrackers, tr],
    });
    setNewTracker('');
    onNotify('Added tracker to outgoing magnet list');
  };

  const handleRemoveTracker = (tr: string) => {
    onUpdateDeviceConfig({
      ...deviceConfig,
      customTrackers: deviceConfig.customTrackers.filter((t) => t !== tr),
    });
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings Section (Global CSS Custom Properties) */}
      <div className="border border-slate-800 bg-[#111827] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Theme Settings & Accent Palette
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize the interface accent color across search controls, smart tags, transfer graphs, and primary actions via global CSS custom properties (<code className="text-slate-300">--accent-400</code>, <code className="text-slate-300">--accent-500</code>).
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono tabular-nums text-slate-300 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${SWATCH_BG_CLASSES[activePreset.id]}`}
            />
            <span>Active: {activePreset.label}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-sky-400">{activePreset.accent500}</span>
          </div>
        </div>

        {/* Accent Color Swatch Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACCENT_THEME_PRESETS.map((preset) => {
            const isSelected = preset.id === accentTheme;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onChangeAccentTheme(preset.id);
                  onNotify(`Accent theme updated to ${preset.label} (${preset.accent500})`);
                }}
                className={`text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-500/12 border-sky-500/60 text-slate-100 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full shrink-0 mt-0.5 ${
                      SWATCH_BG_CLASSES[preset.id]
                    } ${
                      isSelected
                        ? `ring-2 ring-offset-2 ring-offset-slate-950 ${SWATCH_RING_CLASSES[preset.id]}`
                        : ''
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {preset.label}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        {preset.accent500}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Live CSS Custom Property Token Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-slate-400">
            <span>
              --accent-300: <strong className="text-slate-200">{activePreset.accent300}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              --accent-400: <strong className="text-sky-400">{activePreset.accent400}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              --accent-500: <strong className="text-sky-400">{activePreset.accent500}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-sky-500 text-slate-950 font-semibold text-[11px]">
              Primary CTA Preview
            </span>
            <span className="px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-500/40 text-sky-300 font-mono text-[11px]">
              1080p · x265
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Primary Download Mode Selector */}
        <div className="lg:col-span-6 border border-slate-800 bg-[#111827] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Default Download Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose whether clicking Download on search results starts an in-browser WebTorrent session or opens your installed device client. You can also trigger either mode per torrent row.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                onChangeDefaultMode('web-client');
                onNotify('Default download engine set to In-Browser WebTorrent Client');
              }}
              className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                defaultMode === 'web-client'
                  ? 'bg-sky-500/10 border-sky-500/50 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <Globe className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    In-Browser WebTorrent Client
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Downloads and streams video, audio, and archives directly inside this browser tab using WebRTC peers, WSS trackers, and HTTP WebSeeds. No external software required.
                  </p>
                </div>
              </div>
              {defaultMode === 'web-client' && (
                <Check className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeDefaultMode('device-client');
                onNotify('Default download engine set to Native Device Client');
              }}
              className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                defaultMode === 'device-client'
                  ? 'bg-sky-500/10 border-sky-500/50 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <Monitor className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    Native Device Client (Desktop / Mobile App)
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Dispatches magnet links and tracker lists directly to qBittorrent, Transmission, Deluge, uTorrent, Folx, or Flud on your device via OS protocol handoff or local RPC.
                  </p>
                </div>
              </div>
              {defaultMode === 'device-client' && (
                <Check className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Device Application Profile
              </label>
              <select
                value={deviceConfig.preferredApp}
                onChange={(e) =>
                  onUpdateDeviceConfig({
                    ...deviceConfig,
                    preferredApp: e.target.value as DeviceClientConfig['preferredApp'],
                  })
                }
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="default-magnet">System Default Magnet Handler (magnet:?)</option>
                <option value="qbittorrent">qBittorrent Desktop / WebUI</option>
                <option value="transmission">Transmission Daemon / macOS</option>
                <option value="deluge">Deluge BitTorrent Client</option>
                <option value="aria2">Aria2 High-Speed RPC Daemon</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-slate-200">
                  Enable Local JSON-RPC Bridge
                </div>
                <div className="text-xs text-slate-400">
                  Also POST magnet links to a local Aria2 / daemon RPC endpoint when launching device downloads
                </div>
              </div>
              <input
                type="checkbox"
                checked={deviceConfig.rpcEnabled}
                onChange={(e) =>
                  onUpdateDeviceConfig({
                    ...deviceConfig,
                    rpcEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500"
              />
            </label>

            {deviceConfig.rpcEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    RPC Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={deviceConfig.rpcEndpoint}
                    onChange={(e) =>
                      onUpdateDeviceConfig({
                        ...deviceConfig,
                        rpcEndpoint: e.target.value,
                      })
                    }
                    placeholder="http://localhost:6800/jsonrpc"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    RPC Secret Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={deviceConfig.rpcToken}
                    onChange={(e) =>
                      onUpdateDeviceConfig({
                        ...deviceConfig,
                        rpcToken: e.target.value,
                      })
                    }
                    placeholder="Optional token"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Torrent & Magnet Protocol Scheme Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Torrent & Magnet Protocol Configuration
              </div>

              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Take off / Strip Magnet Protocol Scheme</span>
                    {deviceConfig.stripMagnetProtocol && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Omit the <code className="text-slate-300 font-mono">magnet:?xt=urn:btih:</code> protocol wrapper and output pure 40-character hexadecimal BTIH InfoHashes for privacy and direct torrent utilities.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(deviceConfig.stripMagnetProtocol)}
                  onChange={(e) => {
                    onUpdateDeviceConfig({
                      ...deviceConfig,
                      stripMagnetProtocol: e.target.checked,
                    });
                    onNotify(
                      e.target.checked
                        ? 'Magnet protocol scheme stripped: Raw BTIH hash mode enabled'
                        : 'Magnet protocol scheme restored: Standard magnet:? URI enabled'
                    );
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Disable OS Magnet Protocol Interception</span>
                    {deviceConfig.disableMagnetProtocol && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Bypassed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Prevent web browser from triggering your desktop operating system's default BitTorrent protocol popup. Automatically copies the payload to clipboard and dispatches RPC if configured.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(deviceConfig.disableMagnetProtocol)}
                  onChange={(e) => {
                    onUpdateDeviceConfig({
                      ...deviceConfig,
                      disableMagnetProtocol: e.target.checked,
                    });
                    onNotify(
                      e.target.checked
                        ? 'OS Magnet protocol handler disabled: No desktop app interception'
                        : 'OS Magnet protocol handler enabled'
                    );
                  }}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 mt-0.5"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Announce Tracker Injection */}
        <div className="lg:col-span-6 border border-slate-800 bg-[#111827] rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Swarm Tracker Injection List
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                WebRTC (`wss://`) and UDP/HTTP (`udp://`) trackers appended to magnet links for fast peer discovery in both browser and desktop clients.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={deviceConfig.autoAppendTrackers}
                onChange={(e) =>
                  onUpdateDeviceConfig({
                    ...deviceConfig,
                    autoAppendTrackers: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500"
              />
              Auto-append
            </label>
          </div>

          <form onSubmit={handleAddTracker} className="flex items-center gap-2">
            <input
              type="text"
              value={newTracker}
              onChange={(e) => setNewTracker(e.target.value)}
              placeholder="wss://tracker.example.com or udp://tracker.example.com:1337/announce"
              className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-medium bg-sky-500 text-slate-950 rounded-lg hover:bg-sky-400 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tracker
            </button>
          </form>

          <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto border border-slate-800/80 rounded-lg bg-slate-950/60 px-4">
            {deviceConfig.customTrackers.map((tr) => (
              <div
                key={tr}
                className="py-2.5 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <span className="text-slate-300 truncate">{tr}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTracker(tr)}
                  className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  title="Remove tracker"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

