import { IndexerSite, TorrentItem } from '../types/torrent';

export const DEFAULT_WSS_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
];

export function buildMagnetUri(
  infoHash: string,
  title: string,
  webSeeds: string[] = [],
  extraTrackers: string[] = DEFAULT_WSS_TRACKERS
): string {
  const cleanHash = infoHash.trim().toLowerCase();
  const params = new URLSearchParams();
  params.set('dn', title);
  const trackerParams = extraTrackers
    .map((tr) => `tr=${encodeURIComponent(tr)}`)
    .join('&');
  const wsParams = webSeeds
    .map((ws) => `ws=${encodeURIComponent(ws)}`)
    .join('&');
  return `magnet:?xt=urn:btih:${cleanHash}&${params.toString()}${
    trackerParams ? `&${trackerParams}` : ''
  }${wsParams ? `&${wsParams}` : ''}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export const DEFAULT_INDEXERS: IndexerSite[] = [
  {
    id: 'archive-bt',
    name: 'Internet Archive BitTorrent',
    baseUrl: 'https://archive.org',
    searchUrlTemplate: 'https://archive.org/advancedsearch.php?q={query}+AND+format:(Archive+BitTorrent)&output=json',
    protocol: 'archive-api',
    categories: ['Movies', 'Audio', 'Books', 'Software', 'Other'],
    enabled: true,
    isCustom: false,
    latencyMs: 142,
    lastStatus: 'healthy',
    description: 'Public domain films, live concerts, software ISOs, and archival datasets with HTTP WebSeeds.',
  },
  {
    id: 'yts-official',
    name: 'YTS Movie API',
    baseUrl: 'https://yts.mx',
    searchUrlTemplate: 'https://yts.mx/api/v2/list_movies.json?query_term={query}&limit=20',
    protocol: 'yts-api',
    categories: ['Movies'],
    enabled: true,
    isCustom: false,
    latencyMs: 198,
    lastStatus: 'healthy',
    description: 'High-efficiency 1080p and 2160p x264/HEVC cinema releases via JSON API.',
  },
  {
    id: 'apibay-index',
    name: 'APIBay DHT Index',
    baseUrl: 'https://apibay.org',
    searchUrlTemplate: 'https://apibay.org/q.php?q={query}',
    protocol: 'apibay-api',
    categories: ['Movies', 'TV', 'Software', 'Audio', 'Games', 'Books'],
    enabled: true,
    isCustom: false,
    latencyMs: 215,
    lastStatus: 'healthy',
    description: 'Global DHT magnet index covering video, audio, applications, and games.',
  },
  {
    id: 'webtorrent-commons',
    name: 'WebTorrent Swarm Commons',
    baseUrl: 'https://webtorrent.io',
    searchUrlTemplate: 'https://webtorrent.io/free-torrents?q={query}',
    protocol: 'torznab-json',
    categories: ['Movies', 'Audio', 'Software', 'Games', 'Books'],
    enabled: true,
    isCustom: false,
    latencyMs: 64,
    lastStatus: 'healthy',
    description: 'WebRTC-enabled swarm index with active browser peers and direct streaming WebSeeds.',
  },
  {
    id: 'fosstorrents-iso',
    name: 'Linux & FOSS Tracker',
    baseUrl: 'https://linuxtracker.org',
    searchUrlTemplate: 'https://linuxtracker.org/index.php?page=torrents&search={query}',
    protocol: 'rss-feed',
    categories: ['Software'],
    enabled: true,
    isCustom: false,
    latencyMs: 176,
    lastStatus: 'healthy',
    description: 'Verified Linux distributions, BSD images, and open-source development toolchains.',
  },
];

export const PRESET_SITE_TEMPLATES: Omit<IndexerSite, 'id' | 'enabled' | 'isCustom'>[] = [
  {
    name: '1337x',
    baseUrl: 'https://1337x.to',
    searchUrlTemplate: 'https://1337x.to/search/{query}/1/',
    protocol: 'html-magnet',
    categories: ['Movies', 'TV', 'Games', 'Software', 'Audio'],
    description: 'General community directory for films, series, music, and software releases.',
  },
  {
    name: 'Nyaa.si',
    baseUrl: 'https://nyaa.si',
    searchUrlTemplate: 'https://nyaa.si/?page=rss&q={query}',
    protocol: 'rss-feed',
    categories: ['Movies', 'TV', 'Audio', 'Books'],
    description: 'East Asian media, anime, manga, and soundtrack RSS magnet feed.',
  },
  {
    name: 'EZTV Series Index',
    baseUrl: 'https://eztvx.to',
    searchUrlTemplate: 'https://eztvx.to/search/{query}',
    protocol: 'html-magnet',
    categories: ['TV'],
    description: 'Episodic television and documentary release index.',
  },
  {
    name: 'Academic Torrents',
    baseUrl: 'https://academictorrents.com',
    searchUrlTemplate: 'https://academictorrents.com/browse.php?search={query}&rss=1',
    protocol: 'rss-feed',
    categories: ['Books', 'Software', 'Other'],
    description: 'Distributed research datasets, machine learning corpora, and scientific papers.',
  },
  {
    name: 'TorrentGalaxy',
    baseUrl: 'https://torrentgalaxy.to',
    searchUrlTemplate: 'https://torrentgalaxy.to/torrents.php?search={query}',
    protocol: 'html-magnet',
    categories: ['Movies', 'TV', 'Games', 'Books'],
    description: 'Multi-category release index with verified uploader hashes.',
  },
];

export const CURATED_SWARM_TORRENTS: TorrentItem[] = [
  {
    id: 'wt-sintel-4k',
    title: 'Sintel (2010) [1080p BluRay x264 AAC 5.1 - Blender Open Movie + WebSeed]',
    infoHash: '08ada5a7a6183aae1e09d831df6748d566095a10',
    magnetUri: buildMagnetUri(
      '08ada5a7a6183aae1e09d831df6748d566095a10',
      'Sintel (2010) 1080p Blender Open Movie',
      ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4']
    ),
    sizeBytes: 129241752,
    sizeFormatted: '123.25 MB',
    seeders: 412,
    leechers: 19,
    category: 'Movies',
    sourceId: 'webtorrent-commons',
    sourceName: 'WebTorrent Swarm Commons',
    uploadDate: '2026-10-18',
    verified: true,
    resolution: '1080p',
    codec: 'H.264 / AAC',
    webSeedUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'],
    files: [
      {
        name: 'Sintel.2010.1080p.mp4',
        path: '/Sintel/Sintel.2010.1080p.mp4',
        sizeBytes: 124100000,
        type: 'video',
        selected: true,
        progress: 0,
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      },
      {
        name: 'Sintel-Original-Soundtrack.flac',
        path: '/Sintel/Sintel-Original-Soundtrack.flac',
        sizeBytes: 4996000,
        type: 'audio',
        selected: true,
        progress: 0,
      },
      {
        name: 'Sintel.en.srt',
        path: '/Sintel/Sintel.en.srt',
        sizeBytes: 84210,
        type: 'document',
        selected: true,
        progress: 0,
      },
      {
        name: 'poster-artwork.jpg',
        path: '/Sintel/poster-artwork.jpg',
        sizeBytes: 57542,
        type: 'other',
        selected: true,
        progress: 0,
      },
      {
        name: 'release-notes.txt',
        path: '/Sintel/release-notes.txt',
        sizeBytes: 4000,
        type: 'document',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'wt-tears-of-steel',
    title: 'Tears of Steel (2012) [1080p BluRay Remux x265 HEVC 10bit + Direct HTTP WebSeed Sci-Fi Short]',
    infoHash: '209c8226b299b308beaf2b9cd3fb49212dbd13ec',
    magnetUri: buildMagnetUri(
      '209c8226b299b308beaf2b9cd3fb49212dbd13ec',
      'Tears of Steel (2012) 1080p Remux x265',
      ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4']
    ),
    sizeBytes: 571429888,
    sizeFormatted: '544.96 MB',
    seeders: 328,
    leechers: 27,
    category: 'Movies',
    sourceId: 'webtorrent-commons',
    sourceName: 'WebTorrent Swarm Commons',
    uploadDate: '2026-10-24',
    verified: true,
    resolution: '1080p',
    codec: 'x265 / HEVC',
    webSeedUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'],
    files: [
      {
        name: 'Tears.of.Steel.2012.1080p.Remux.x265.mp4',
        path: '/TearsOfSteel/Tears.of.Steel.2012.1080p.Remux.x265.mp4',
        sizeBytes: 565200000,
        type: 'video',
        selected: true,
        progress: 0,
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      },
      {
        name: 'TearsOfSteel-Score-Stem.mp3',
        path: '/TearsOfSteel/TearsOfSteel-Score-Stem.mp3',
        sizeBytes: 5820000,
        type: 'audio',
        selected: true,
        progress: 0,
      },
      {
        name: 'concept-art-sheet.png',
        path: '/TearsOfSteel/concept-art-sheet.png',
        sizeBytes: 180000,
        type: 'other',
        selected: true,
        progress: 0,
      },
      {
        name: 'TearsOfSteel-ProductionNotes.txt',
        path: '/TearsOfSteel/TearsOfSteel-ProductionNotes.txt',
        sizeBytes: 229888,
        type: 'document',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'wt-big-buck-bunny',
    title: 'Big Buck Bunny (60fps Remaster) [1080p x265 WEB-DL MP4 WebTorrent Official Swarm]',
    infoHash: 'dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c',
    magnetUri: buildMagnetUri(
      'dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c',
      'Big Buck Bunny 1080p x265',
      ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4']
    ),
    sizeBytes: 276445184,
    sizeFormatted: '263.64 MB',
    seeders: 689,
    leechers: 41,
    category: 'Movies',
    sourceId: 'webtorrent-commons',
    sourceName: 'WebTorrent Swarm Commons',
    uploadDate: '2026-10-29',
    verified: true,
    resolution: '1080p',
    codec: 'x265 / AAC',
    webSeedUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'],
    files: [
      {
        name: 'BigBuckBunny.1080p.60fps.mp4',
        path: '/BigBuckBunny/BigBuckBunny.1080p.60fps.mp4',
        sizeBytes: 276100000,
        type: 'video',
        selected: true,
        progress: 0,
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        name: 'BigBuckBunny.en.srt',
        path: '/BigBuckBunny/BigBuckBunny.en.srt',
        sizeBytes: 145184,
        type: 'document',
        selected: true,
        progress: 0,
      },
      {
        name: 'cover-sheet.webp',
        path: '/BigBuckBunny/cover-sheet.webp',
        sizeBytes: 200000,
        type: 'other',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'ubuntu-24-04-desktop',
    title: 'Ubuntu 24.04.1 LTS (Noble Numbat) Desktop amd64 ISO [Official Canonical Release]',
    infoHash: '2aa4f5a7e209e54b32803d43670971c4c8caaa05',
    magnetUri: buildMagnetUri(
      '2aa4f5a7e209e54b32803d43670971c4c8caaa05',
      'ubuntu-24.04.1-desktop-amd64.iso'
    ),
    sizeBytes: 6184752906,
    sizeFormatted: '5.76 GB',
    seeders: 1840,
    leechers: 112,
    category: 'Software',
    sourceId: 'fosstorrents-iso',
    sourceName: 'Linux & FOSS Tracker',
    uploadDate: '2026-10-30',
    verified: true,
    codec: 'ISO-9660',
    files: [
      {
        name: 'ubuntu-24.04.1-desktop-amd64.iso',
        path: '/ubuntu-24.04.1-desktop-amd64.iso',
        sizeBytes: 6184748800,
        type: 'iso',
        selected: true,
        progress: 0,
      },
      {
        name: 'SHA256SUMS.gpg',
        path: '/SHA256SUMS.gpg',
        sizeBytes: 4106,
        type: 'document',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'debian-12-netinst',
    title: 'Debian GNU/Linux 12.7.0 Bookworm Official amd64 netinst CD ISO',
    infoHash: '8a60f6347f891b8ca99eb66d1a4c6a8e829140d1',
    magnetUri: buildMagnetUri(
      '8a60f6347f891b8ca99eb66d1a4c6a8e829140d1',
      'debian-12.7.0-amd64-netinst.iso'
    ),
    sizeBytes: 661651456,
    sizeFormatted: '631.00 MB',
    seeders: 945,
    leechers: 34,
    category: 'Software',
    sourceId: 'fosstorrents-iso',
    sourceName: 'Linux & FOSS Tracker',
    uploadDate: '2026-10-25',
    verified: true,
    codec: 'ISO-9660',
    files: [
      {
        name: 'debian-12.7.0-amd64-netinst.iso',
        path: '/debian-12.7.0-amd64-netinst.iso',
        sizeBytes: 661651456,
        type: 'iso',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'cosmos-laundromat',
    title: 'Cosmos Laundromat: First Cycle [2015 1080p BluRay x264 Gooseberry Open Movie Project]',
    infoHash: 'c9e15763f722f23e98a29decdfae341b98d53056',
    magnetUri: buildMagnetUri(
      'c9e15763f722f23e98a29decdfae341b98d53056',
      'Cosmos Laundromat 1080p',
      ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4']
    ),
    sizeBytes: 230895440,
    sizeFormatted: '220.20 MB',
    seeders: 267,
    leechers: 14,
    category: 'Movies',
    sourceId: 'webtorrent-commons',
    sourceName: 'WebTorrent Swarm Commons',
    uploadDate: '2026-10-12',
    verified: true,
    resolution: '1080p',
    codec: 'H.264 / AAC',
    webSeedUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
    files: [
      {
        name: 'Cosmos.Laundromat.1080p.mp4',
        path: '/CosmosLaundromat/Cosmos.Laundromat.1080p.mp4',
        sizeBytes: 230800000,
        type: 'video',
        selected: true,
        progress: 0,
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
      {
        name: 'README-License-CC-BY.txt',
        path: '/CosmosLaundromat/README-License-CC-BY.txt',
        sizeBytes: 95440,
        type: 'document',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'blender-4-3-suite',
    title: 'Blender 4.3 Studio Production Bundle + Open Material Library (Linux / macOS / Win64)',
    infoHash: '4d7536744c77819b21899a2826c218d40e028199',
    magnetUri: buildMagnetUri(
      '4d7536744c77819b21899a2826c218d40e028199',
      'Blender-4.3-Production-Bundle'
    ),
    sizeBytes: 1845493760,
    sizeFormatted: '1.72 GB',
    seeders: 512,
    leechers: 48,
    category: 'Software',
    sourceId: 'fosstorrents-iso',
    sourceName: 'Linux & FOSS Tracker',
    uploadDate: '2026-10-28',
    verified: true,
    codec: 'TAR.XZ / ZIP',
    files: [
      {
        name: 'blender-4.3.0-linux-x64.tar.xz',
        path: '/blender-4.3.0-linux-x64.tar.xz',
        sizeBytes: 385000000,
        type: 'archive',
        selected: true,
        progress: 0,
      },
      {
        name: 'open-material-library-pbr-4k.zip',
        path: '/open-material-library-pbr-4k.zip',
        sizeBytes: 1460493760,
        type: 'archive',
        selected: true,
        progress: 0,
      },
    ],
  },
  {
    id: 'night-of-the-living-dead-1968',
    title: 'Night of the Living Dead (1968) [2160p 4K Remux x265 HEVC FLAC Archival Master - Public Domain]',
    infoHash: '7f3a9d821c05b4e8f9a1c3d5e7b9a2f4c6d8e0a1',
    magnetUri: buildMagnetUri(
      '7f3a9d821c05b4e8f9a1c3d5e7b9a2f4c6d8e0a1',
      'Night of the Living Dead (1968) 2160p 4K Remux x265',
      ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4']
    ),
    sizeBytes: 3412892160,
    sizeFormatted: '3.18 GB',
    seeders: 384,
    leechers: 29,
    category: 'Movies',
    sourceId: 'archive-bt',
    sourceName: 'Internet Archive BitTorrent',
    uploadDate: '2026-10-15',
    verified: true,
    resolution: '2160p',
    codec: 'x265 / FLAC',
    webSeedUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4'],
    files: [
      {
        name: 'Night.of.the.Living.Dead.1968.2160p.mp4',
        path: '/NightOfTheLivingDead/Night.of.the.Living.Dead.1968.2160p.mp4',
        sizeBytes: 3412000000,
        type: 'video',
        selected: true,
        progress: 0,
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      },
      {
        name: 'Archival-Restoration-Notes.pdf',
        path: '/NightOfTheLivingDead/Archival-Restoration-Notes.pdf',
        sizeBytes: 892160,
        type: 'document',
        selected: true,
        progress: 0,
      },
    ],
  },
];
