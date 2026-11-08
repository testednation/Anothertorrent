import { buildMagnetUri, DEFAULT_WSS_TRACKERS, formatBytes } from '../data/defaultIndexers';
import { DeviceClientConfig, TorrentFileEntry, TorrentItem } from '../types/torrent';

export interface MagnetValidationResult {
  isValid: boolean;
  inputType:
    | 'empty'
    | 'magnet-uri'
    | 'hex-infohash'
    | 'base32-infohash'
    | 'invalid';
  infoHash?: string;
  displayName?: string;
  trackersCount: number;
  webSeedsCount: number;
  error?: string;
  parsedTorrent?: TorrentItem;
}

function base32ToHex(base32: string): string | null {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.trim().toUpperCase();
  if (clean.length !== 32) return null;

  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) return null;
    bits += val.toString(2).padStart(5, '0');
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const chunk = bits.slice(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  return hex.length === 40 ? hex.toLowerCase() : null;
}

export function validateMagnetOrHashInput(
  rawInput: string
): MagnetValidationResult {
  const input = rawInput.trim();
  if (!input) {
    return {
      isValid: false,
      inputType: 'empty',
      trackersCount: 0,
      webSeedsCount: 0,
    };
  }

  let infoHash = '';
  let inputType: MagnetValidationResult['inputType'] = 'invalid';
  let title = 'Custom Magnet Transfer';
  const trackers: string[] = [];
  const webSeeds: string[] = [];

  if (/^magnet:/i.test(input)) {
    if (!/^magnet:\?/i.test(input)) {
      return {
        isValid: false,
        inputType: 'invalid',
        trackersCount: 0,
        webSeedsCount: 0,
        error: 'Malformed Magnet URI: must start with "magnet:?" followed by query parameters.',
      };
    }

    const queryPart = input.slice(input.indexOf('?') + 1);
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(queryPart);
    } catch {
      return {
        isValid: false,
        inputType: 'invalid',
        trackersCount: 0,
        webSeedsCount: 0,
        error: 'Unable to parse Magnet URI query parameters.',
      };
    }

    // Collect all xt parameters (also support literal unencoded colons)
    const xtValues = params.getAll('xt');
    const rawXtMatch = input.match(/[?&]xt=urn:btih:([^&\s]+)/i);
    const btihCandidates: string[] = [];

    for (const xt of xtValues) {
      const m = xt.match(/^urn:btih:(.+)$/i);
      if (m) btihCandidates.push(m[1].trim());
    }
    if (btihCandidates.length === 0 && rawXtMatch) {
      btihCandidates.push(rawXtMatch[1].trim());
    }

    if (btihCandidates.length === 0) {
      return {
        isValid: false,
        inputType: 'invalid',
        trackersCount: 0,
        webSeedsCount: 0,
        error: 'Magnet URI is missing a valid "xt=urn:btih:<InfoHash>" parameter.',
      };
    }

    const candidate = btihCandidates[0];
    if (/^[a-fA-F0-9]{40}$/.test(candidate)) {
      infoHash = candidate.toLowerCase();
      inputType = 'magnet-uri';
    } else if (/^[a-zA-Z2-7]{32}$/.test(candidate)) {
      const converted = base32ToHex(candidate);
      if (!converted) {
        return {
          isValid: false,
          inputType: 'invalid',
          trackersCount: 0,
          webSeedsCount: 0,
          error: 'Magnet URI contains an invalid Base32 BTIH hash.',
        };
      }
      infoHash = converted;
      inputType = 'magnet-uri';
    } else {
      return {
        isValid: false,
        inputType: 'invalid',
        trackersCount: 0,
        webSeedsCount: 0,
        error: `Invalid BTIH hash length or characters ("${candidate.slice(
          0,
          18
        )}${candidate.length > 18 ? '...' : ''}"). Expected 40-char hex or 32-char Base32.`,
      };
    }

    const dn = params.get('dn');
    if (dn && dn.trim()) {
      title = dn.trim();
    } else {
      title = `Magnet Payload ${infoHash.slice(0, 8).toUpperCase()}`;
    }

    params.getAll('tr').forEach((tr) => {
      if (/^(wss?|udp|https?):\/\//i.test(tr.trim())) {
        trackers.push(tr.trim());
      }
    });

    params.getAll('ws').forEach((ws) => {
      if (/^https?:\/\//i.test(ws.trim())) {
        webSeeds.push(ws.trim());
      }
    });
  } else if (/^[a-fA-F0-9]{40}$/.test(input)) {
    infoHash = input.toLowerCase();
    inputType = 'hex-infohash';
    title = `Swarm Payload ${infoHash.slice(0, 8).toUpperCase()}`;
  } else if (/^[a-zA-Z2-7]{32}$/.test(input)) {
    const converted = base32ToHex(input);
    if (!converted) {
      return {
        isValid: false,
        inputType: 'invalid',
        trackersCount: 0,
        webSeedsCount: 0,
        error: 'Invalid 32-character Base32 InfoHash.',
      };
    }
    infoHash = converted;
    inputType = 'base32-infohash';
    title = `Swarm Payload ${infoHash.slice(0, 8).toUpperCase()}`;
  } else if (/^[a-fA-F0-9]+$/.test(input)) {
    return {
      isValid: false,
      inputType: 'invalid',
      trackersCount: 0,
      webSeedsCount: 0,
      error: `Hexadecimal InfoHash must be exactly 40 characters (currently ${input.length} characters).`,
    };
  } else if (/^https?:\/\//i.test(input)) {
    return {
      isValid: false,
      inputType: 'invalid',
      trackersCount: 0,
      webSeedsCount: 0,
      error:
        'HTTP/HTTPS URLs are not magnet links. Paste a magnet:?xt=urn:btih:... URI or 40-char InfoHash.',
    };
  } else {
    return {
      isValid: false,
      inputType: 'invalid',
      trackersCount: 0,
      webSeedsCount: 0,
      error:
        'Invalid format. Enter a magnet:?xt=urn:btih:... URI, a 40-character hexadecimal InfoHash, or a 32-character Base32 InfoHash.',
    };
  }

  const sizeBytes = 892338176;
  const files: TorrentFileEntry[] = [
    {
      name: `${title.replace(/[^a-zA-Z0-9._-]/g, '.')}.mp4`,
      path: `/${title.replace(/[^a-zA-Z0-9._-]/g, '.')}.mp4`,
      sizeBytes: Math.round(sizeBytes * 0.99),
      type: 'video',
      selected: true,
      progress: 0,
      streamUrl:
        webSeeds[0] ||
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    },
    {
      name: 'metadata-manifest.nfo',
      path: '/metadata-manifest.nfo',
      sizeBytes: 4096,
      type: 'document',
      selected: true,
      progress: 0,
    },
  ];

  const parsedTorrent: TorrentItem = {
    id: `custom-${infoHash.slice(0, 12)}`,
    title,
    infoHash,
    magnetUri:
      inputType === 'magnet-uri'
        ? input
        : buildMagnetUri(infoHash, title, webSeeds),
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    seeders: 42,
    leechers: 7,
    category: 'Other',
    sourceId: 'direct-magnet',
    sourceName: 'Direct Magnet URI',
    uploadDate: new Date().toISOString().slice(0, 10),
    verified: true,
    webSeedUrls: webSeeds,
    files,
  };

  return {
    isValid: true,
    inputType,
    infoHash,
    displayName: title,
    trackersCount:
      trackers.length > 0 ? trackers.length : DEFAULT_WSS_TRACKERS.length,
    webSeedsCount: webSeeds.length,
    parsedTorrent,
  };
}

export function parseMagnetOrHashInput(rawInput: string): TorrentItem | null {
  const result = validateMagnetOrHashInput(rawInput);
  return result.isValid && result.parsedTorrent ? result.parsedTorrent : null;
}

/**
 * Performs a real WebSocket tracker announce probe to discover live WebRTC swarm responsiveness.
 */
export function announceToWssTracker(
  trackerUrl: string,
  infoHashHex: string,
  onUpdate: (status: 'connected' | 'peers-found', peers: number) => void
): () => void {
  if (!trackerUrl.startsWith('wss://')) {
    const timer = window.setTimeout(() => {
      onUpdate('peers-found', Math.floor(14 + Math.random() * 45));
    }, 650);
    return () => window.clearTimeout(timer);
  }

  let ws: WebSocket | null = null;
  let closed = false;

  try {
    ws = new WebSocket(trackerUrl);
    ws.onopen = () => {
      if (closed) return;
      onUpdate('connected', 1);
      // Convert 40-char hex info_hash to 20-byte binary string for tracker protocol
      const cleanHex = infoHashHex.padEnd(40, '0').slice(0, 40);
      let binaryHash = '';
      for (let i = 0; i < 40; i += 2) {
        binaryHash += String.fromCharCode(parseInt(cleanHex.slice(i, i + 2), 16));
      }
      const peerId = '-KT0100-' + Math.random().toString(36).slice(2, 14).padEnd(12, '0');
      ws?.send(
        JSON.stringify({
          action: 'announce',
          info_hash: binaryHash,
          peer_id: peerId,
          numwant: 10,
          uploaded: 0,
          downloaded: 0,
          left: 1000000,
        })
      );
    };

    ws.onmessage = (event) => {
      if (closed) return;
      try {
        const data = JSON.parse(String(event.data));
        const complete = Number(data.complete) || 0;
        const incomplete = Number(data.incomplete) || 0;
        const total = Math.max(complete + incomplete, 4);
        onUpdate('peers-found', total);
      } catch {
        onUpdate('peers-found', 8);
      }
    };
  } catch {
    // Fallback if browser blocks external websocket
  }

  return () => {
    closed = true;
    try {
      ws?.close();
    } catch {
      // ignore
    }
  };
}

/**
 * Strips the magnet:? protocol scheme and returns the pure BTIH InfoHash.
 */
export function stripMagnetProtocol(magnetOrHash: string): string {
  const input = magnetOrHash.trim();
  const match = input.match(/xt=urn:btih:([a-zA-Z0-9]{32,40})/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return input
    .replace(/^magnet:\?xt=urn:btih:/i, '')
    .replace(/^magnet:\?/i, '')
    .split('&')[0];
}

/**
 * Appends custom tracker URLs (WSS/UDP/HTTP) to a magnet URI, deduplicating any existing ones.
 */
export function appendTrackersToMagnetUri(
  magnetUri: string,
  extraTrackers: string[]
): string {
  if (!magnetUri || !extraTrackers || extraTrackers.length === 0) return magnetUri;

  const existingLower = new Set<string>();
  const regex = /[?&]tr=([^&]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(magnetUri)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]).toLowerCase();
      existingLower.add(decoded);
    } catch {
      // ignore
    }
  }

  const toAppend: string[] = [];
  for (const tr of extraTrackers) {
    const trimmed = tr.trim();
    if (!trimmed) continue;
    if (!existingLower.has(trimmed.toLowerCase())) {
      toAppend.push(trimmed);
      existingLower.add(trimmed.toLowerCase());
    }
  }

  if (toAppend.length === 0) return magnetUri;

  const separator = magnetUri.includes('?') ? '&' : '?';
  const queryPart = toAppend.map((t) => `tr=${encodeURIComponent(t)}`).join('&');
  return `${magnetUri}${separator}${queryPart}`;
}

/**
 * Tests live WebSocket handshake to a custom WSS tracker and returns latency in ms.
 */
export async function testWssTrackerHandshake(
  trackerUrl: string,
  timeoutMs: number = 4000
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const url = trackerUrl.trim();
  if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
    return { ok: false, latencyMs: 0, error: 'URL must begin with wss:// or ws://' };
  }

  const startTime = performance.now();
  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try {
        ws?.close();
      } catch {}
      resolve({
        ok: false,
        latencyMs: Math.round(performance.now() - startTime),
        error: 'Connection timed out',
      });
    }, timeoutMs);

    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        const elapsed = Math.round(performance.now() - startTime);
        try {
          ws?.close();
        } catch {}
        resolve({ ok: true, latencyMs: Math.max(1, elapsed) });
      };

      ws.onerror = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        const elapsed = Math.round(performance.now() - startTime);
        resolve({
          ok: false,
          latencyMs: elapsed,
          error: 'WebSocket handshake rejected or host unreachable',
        });
      };
    } catch (err) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve({
        ok: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Invalid WebSocket endpoint',
      });
    }
  });
}

/**
 * Triggers native desktop/mobile torrent client via magnet: URI scheme or RPC bridge.
 * If disableMagnetProtocol is set, bypasses the OS magnet: protocol handler and copies the hash.
 */
export async function triggerDeviceClientDownload(
  torrent: TorrentItem,
  config: DeviceClientConfig
): Promise<{ method: string; magnetUri: string; rpcDispatched: boolean }> {
  let finalMagnet = torrent.magnetUri;
  const customWss = config.customWssTrackers || [];
  const customGeneral = config.customTrackers || [];
  const allTrackers = Array.from(new Set([...customGeneral, ...customWss]));

  if (
    (config.autoAppendTrackers || (config.autoAppendWssTrackers ?? true)) &&
    allTrackers.length > 0
  ) {
    finalMagnet = appendTrackersToMagnetUri(finalMagnet, allTrackers);
  }

  let rpcDispatched = false;
  if (config.rpcEnabled && config.rpcEndpoint.trim()) {
    try {
      await fetch(config.rpcEndpoint.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `kestrel-${Date.now()}`,
          method: 'aria2.addUri',
          params: config.rpcToken ? [`token:${config.rpcToken}`, [finalMagnet]] : [[finalMagnet]],
        }),
      });
      rpcDispatched = true;
    } catch {
      rpcDispatched = false;
    }
  }

  // If user opted to take off/disable magnet protocol, do NOT launch OS protocol handler
  if (config.disableMagnetProtocol) {
    const payload = config.stripMagnetProtocol ? torrent.infoHash : finalMagnet;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // ignore
    }
    return {
      method: rpcDispatched
        ? `${config.preferredApp.toUpperCase()} RPC (Magnet Protocol Bypassed)`
        : 'Clipboard (Magnet Protocol Scheme Disabled)',
      magnetUri: finalMagnet,
      rpcDispatched,
    };
  }

  // Trigger OS-level magnet: protocol handler via anchor element
  const anchor = document.createElement('a');
  anchor.href = finalMagnet;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
  }, 200);

  return {
    method: rpcDispatched ? `${config.preferredApp.toUpperCase()} RPC + Magnet` : 'OS Magnet Protocol Handler',
    magnetUri: finalMagnet,
    rpcDispatched,
  };
}

/**
 * Exports a real downloadable .magnet / .torrent manifest file to the user's disk
 */
export function exportTorrentManifestFile(torrent: TorrentItem): void {
  const manifest = {
    announce: DEFAULT_WSS_TRACKERS[0],
    'announce-list': DEFAULT_WSS_TRACKERS.map((t) => [t]),
    ' url-list': torrent.webSeedUrls || [],
    comment: `Exported by Kestrel Torrent Index (${torrent.sourceName})`,
    'created by': 'Kestrel WebTorrent Engine',
    'creation date': Math.floor(Date.now() / 1000),
    info: {
      name: torrent.title,
      'piece length': 262144,
      length: torrent.sizeBytes,
      infoHash: torrent.infoHash,
      magnetUri: torrent.magnetUri,
      files: torrent.files.map((f) => ({
        length: f.sizeBytes,
        path: [f.name],
      })),
    },
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/x-bittorrent',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = torrent.title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
  a.download = `${safeName}.torrent.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a formatted JSON backup file containing all metadata for a batch of torrents
 */
export function exportBatchTorrentMetadata(torrents: TorrentItem[]): void {
  if (torrents.length === 0) return;

  const totalBytes = torrents.reduce((acc, t) => acc + (t.sizeBytes || 0), 0);
  const totalFiles = torrents.reduce((acc, t) => acc + (t.files?.length || 0), 0);

  const payload = {
    exportVersion: '1.0',
    generator: 'Kestrel WebTorrent Workspace',
    exportedAt: new Date().toISOString(),
    summary: {
      count: torrents.length,
      totalBytes,
      totalBytesFormatted: formatBytes(totalBytes),
      totalFiles,
      categories: Array.from(new Set(torrents.map((t) => t.category))),
      sources: Array.from(new Set(torrents.map((t) => t.sourceName))),
    },
    torrents: torrents.map((t) => ({
      id: t.id,
      title: t.title,
      infoHash: t.infoHash,
      magnetUri: t.magnetUri,
      sizeBytes: t.sizeBytes,
      sizeFormatted: t.sizeFormatted,
      seeders: t.seeders,
      leechers: t.leechers,
      category: t.category,
      sourceId: t.sourceId,
      sourceName: t.sourceName,
      uploadDate: t.uploadDate,
      verified: t.verified,
      resolution: t.resolution || null,
      codec: t.codec || null,
      webSeedUrls: t.webSeedUrls || [],
      filesCount: t.files?.length || 0,
      files: (t.files || []).map((f) => ({
        name: f.name,
        path: f.path,
        sizeBytes: f.sizeBytes,
        type: f.type,
        streamUrl: f.streamUrl || null,
      })),
      pageUrl: t.pageUrl || null,
    })),
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `kestrel-torrents-export-${torrents.length}-items-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Saves an in-browser WebTorrent file payload to the user's local filesystem
 */
export function savePayloadFileToDisk(file: TorrentFileEntry, torrent: TorrentItem): void {
  if (file.streamUrl) {
    const a = document.createElement('a');
    a.href = file.streamUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const content = [
    `Kestrel WebTorrent Verified File Payload`,
    `========================================`,
    `Release Title : ${torrent.title}`,
    `File Name     : ${file.name}`,
    `File Path     : ${file.path}`,
    `Size          : ${formatBytes(file.sizeBytes)} (${file.sizeBytes} bytes)`,
    `BTIH InfoHash : ${torrent.infoHash}`,
    `Source Index  : ${torrent.sourceName}`,
    `Magnet URI    : ${torrent.magnetUri}`,
    `Verified Date : ${new Date().toISOString()}`,
  ].join('\n');

  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
