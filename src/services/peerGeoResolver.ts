import { PeerConnectionInfo } from '../types/torrent';

export interface GeoLocation {
  city: string;
  country: string;
  countryCode: string;
  flag: string;
  coordinates: [number, number]; // [longitude, latitude]
  latencyMs: number;
}

const KNOWN_GEO_HUBS: Record<string, GeoLocation> = {
  'commondatastorage.googleapis.com': {
    city: 'Council Bluffs, IA',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    coordinates: [-95.86, 41.26],
    latencyMs: 18,
  },
  'mirror.archive.org': {
    city: 'San Francisco, CA',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    coordinates: [-122.42, 37.77],
    latencyMs: 24,
  },
  '185.199.108.153': {
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    flag: '🇳🇱',
    coordinates: [4.9, 52.37],
    latencyMs: 36,
  },
  '185.199.110.153': {
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    coordinates: [8.68, 50.11],
    latencyMs: 42,
  },
  '91.189.91.38': {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    flag: '🇬🇧',
    coordinates: [-0.13, 51.51],
    latencyMs: 31,
  },
  '198.51.100.42': {
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    coordinates: [139.69, 35.69],
    latencyMs: 112,
  },
  '142.250.190.46': {
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    flag: '🇦🇺',
    coordinates: [151.21, -33.87],
    latencyMs: 168,
  },
  '104.244.42.1': {
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    flag: '🇨🇦',
    coordinates: [-79.38, 43.65],
    latencyMs: 29,
  },
};

const GLOBAL_GEO_POOLS: GeoLocation[] = [
  {
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    coordinates: [8.68, 50.11],
    latencyMs: 38,
  },
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    flag: '🇳🇱',
    coordinates: [4.9, 52.37],
    latencyMs: 32,
  },
  {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    flag: '🇬🇧',
    coordinates: [-0.13, 51.51],
    latencyMs: 28,
  },
  {
    city: 'Stockholm',
    country: 'Sweden',
    countryCode: 'SE',
    flag: '🇸🇪',
    coordinates: [18.06, 59.33],
    latencyMs: 46,
  },
  {
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    flag: '🇫🇷',
    coordinates: [2.35, 48.86],
    latencyMs: 35,
  },
  {
    city: 'New York, NY',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    coordinates: [-74.01, 40.71],
    latencyMs: 22,
  },
  {
    city: 'San Francisco, CA',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    coordinates: [-122.42, 37.77],
    latencyMs: 25,
  },
  {
    city: 'Chicago, IL',
    country: 'United States',
    countryCode: 'US',
    flag: '🇺🇸',
    coordinates: [-87.63, 41.88],
    latencyMs: 30,
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    flag: '🇯🇵',
    coordinates: [139.69, 35.69],
    latencyMs: 118,
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    flag: '🇸🇬',
    coordinates: [103.82, 1.35],
    latencyMs: 142,
  },
  {
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    flag: '🇰🇷',
    coordinates: [126.98, 37.57],
    latencyMs: 125,
  },
  {
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    flag: '🇦🇺',
    coordinates: [151.21, -33.87],
    latencyMs: 175,
  },
  {
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    flag: '🇧🇷',
    coordinates: [-46.63, -23.55],
    latencyMs: 138,
  },
  {
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    flag: '🇨🇦',
    coordinates: [-79.38, 43.65],
    latencyMs: 34,
  },
  {
    city: 'Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    flag: '🇨🇭',
    coordinates: [8.54, 47.37],
    latencyMs: 40,
  },
  {
    city: 'Warsaw',
    country: 'Poland',
    countryCode: 'PL',
    flag: '🇵🇱',
    coordinates: [21.01, 52.23],
    latencyMs: 49,
  },
  {
    city: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    flag: '🇪🇸',
    coordinates: [-3.7, 40.42],
    latencyMs: 44,
  },
  {
    city: 'Helsinki',
    country: 'Finland',
    countryCode: 'FI',
    flag: '🇫🇮',
    coordinates: [24.94, 60.17],
    latencyMs: 52,
  },
];

/**
 * Resolves an IP or hostname to realistic geographic coordinates and location metadata.
 */
export function resolvePeerGeo(ipOrHost: string): GeoLocation {
  const host = ipOrHost.split(':')[0].trim().toLowerCase();
  if (KNOWN_GEO_HUBS[host]) {
    return KNOWN_GEO_HUBS[host];
  }

  // Deterministic hash based on characters in IP/hostname
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash << 5) - hash + host.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GLOBAL_GEO_POOLS.length;
  const base = GLOBAL_GEO_POOLS[idx];

  // Minor deterministic jitter (up to 0.4 degree) to avoid overlapping identical cities
  const jitterX = (((Math.abs(hash * 31) % 100) - 50) / 100) * 0.8;
  const jitterY = (((Math.abs(hash * 17) % 100) - 50) / 100) * 0.8;

  return {
    ...base,
    coordinates: [
      Math.round((base.coordinates[0] + jitterX) * 100) / 100,
      Math.round((base.coordinates[1] + jitterY) * 100) / 100,
    ],
    latencyMs: base.latencyMs + (Math.abs(hash) % 15),
  };
}

/**
 * Enriches a peer object with coordinates, location strings, flag, and latency.
 */
export function enrichPeerWithGeo(peer: PeerConnectionInfo): PeerConnectionInfo {
  if (peer.coordinates && peer.city && peer.country) {
    return peer;
  }
  const geo = resolvePeerGeo(peer.ip);
  return {
    ...peer,
    city: peer.city || geo.city,
    country: peer.country || geo.country,
    countryCode: peer.countryCode || geo.countryCode,
    flag: peer.flag || geo.flag,
    coordinates: peer.coordinates || geo.coordinates,
    latencyMs: peer.latencyMs || geo.latencyMs,
  };
}
