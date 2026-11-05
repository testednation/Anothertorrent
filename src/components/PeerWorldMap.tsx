import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  geoNaturalEarth1,
  geoMercator,
  geoEqualEarth,
  geoOrthographic,
  geoPath,
  geoGraticule10,
} from 'd3-geo';
import {
  Globe,
  Radio,
  Zap,
  Layers,
  Maximize2,
  Minimize2,
  Eye,
  Info,
  Server,
  Activity,
  ArrowDownRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { PeerConnectionInfo } from '../types/torrent';
import { formatBytes } from '../data/defaultIndexers';
import { enrichPeerWithGeo } from '../services/peerGeoResolver';
import worldGeoData from '../data/worldGeo.json';

type ProjectionType = 'natural-earth' | 'mercator' | 'equal-earth' | 'orthographic';

interface PeerWorldMapProps {
  peers: PeerConnectionInfo[];
  transferTitle?: string;
  totalDownloadSpeed?: number;
  onSelectPeer?: (peer: PeerConnectionInfo) => void;
  selectedPeerId?: string | null;
}

// Local client position (simulated local ingestion node, e.g. US East)
const LOCAL_CLIENT_NODE = {
  name: 'Your Local Client',
  city: 'Local Host',
  country: 'Local Network',
  countryCode: 'LOC',
  flag: '⚡',
  coordinates: [-74.006, 40.7128] as [number, number], // Longitude, Latitude
};

export const PeerWorldMap: React.FC<PeerWorldMapProps> = ({
  peers,
  transferTitle,
  totalDownloadSpeed,
  onSelectPeer,
  selectedPeerId,
}) => {
  const [projectionType, setProjectionType] = useState<ProjectionType>('natural-earth');
  const [hoveredPeer, setHoveredPeer] = useState<PeerConnectionInfo | null>(null);
  const [showArcs, setShowArcs] = useState(true);
  const [showGraticule, setShowGraticule] = useState(true);
  const [transportFilter, setTransportFilter] = useState<'all' | 'WebRTC' | 'WebSeed HTTP' | 'WSS Tracker'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [globeRotation, setGlobeRotation] = useState<number>(0);
  const isRotating = useRef(false);

  // SVG coordinate dimensions
  const width = 960;
  const height = 480;

  // Auto-rotate globe slightly if in orthographic mode
  useEffect(() => {
    if (projectionType !== 'orthographic') return;
    const interval = window.setInterval(() => {
      setGlobeRotation((prev) => (prev + 0.3) % 360);
    }, 50);
    return () => window.clearInterval(interval);
  }, [projectionType]);

  // Ensure all peers have geographic coordinates and metadata
  const enrichedPeers = useMemo(() => {
    return peers.map(enrichPeerWithGeo);
  }, [peers]);

  // Filter peers by transport protocol if requested
  const filteredPeers = useMemo(() => {
    if (transportFilter === 'all') return enrichedPeers;
    return enrichedPeers.filter((p) => p.transport === transportFilter);
  }, [enrichedPeers, transportFilter]);

  // Configure selected D3-geo projection
  const { projection, pathGenerator } = useMemo(() => {
    let proj;
    switch (projectionType) {
      case 'mercator':
        proj = geoMercator()
          .scale(130)
          .translate([width / 2, height / 1.55]);
        break;
      case 'equal-earth':
        proj = geoEqualEarth()
          .scale(165)
          .translate([width / 2, height / 2]);
        break;
      case 'orthographic':
        proj = geoOrthographic()
          .scale(210)
          .translate([width / 2, height / 2])
          .rotate([globeRotation - 20, -15]);
        break;
      case 'natural-earth':
      default:
        proj = geoNaturalEarth1()
          .scale(168)
          .translate([width / 2, height / 2]);
        break;
    }

    const path = geoPath(proj);
    return { projection: proj, pathGenerator: path };
  }, [projectionType, globeRotation, width, height]);

  // Project countries GeoJSON features
  const countryPaths = useMemo(() => {
    const features = (worldGeoData as any).features || [];
    return features.map((f: any, idx: number) => ({
      id: f.id || `country-${idx}`,
      name: f.properties?.name || 'Country',
      d: pathGenerator(f) || '',
    }));
  }, [pathGenerator]);

  // Project graticule lines (latitude & longitude grid)
  const graticuleLines = useMemo(() => {
    const graticule = geoGraticule10();
    return {
      lines: pathGenerator(graticule) || '',
      outline: pathGenerator({ type: 'Sphere' } as any) || '',
    };
  }, [pathGenerator]);

  // Project local client coordinates
  const clientPos = useMemo(() => {
    const pos = projection(LOCAL_CLIENT_NODE.coordinates);
    return pos ? { x: pos[0], y: pos[1] } : null;
  }, [projection]);

  // Project peer locations and build data-flow geodesic arcs
  const peerNodes = useMemo(() => {
    return filteredPeers.map((peer) => {
      const coords = peer.coordinates || [0, 0];
      const pos = projection(coords);
      const isVisible = Boolean(pos && !isNaN(pos[0]) && !isNaN(pos[1]));

      let arcPath = '';
      if (isVisible && clientPos && showArcs) {
        // Build true great-circle geodesic curve using GeoJSON LineString
        const geodesicLine: any = {
          type: 'LineString',
          coordinates: [coords, LOCAL_CLIENT_NODE.coordinates],
        };
        arcPath = pathGenerator(geodesicLine) || '';
      }

      return {
        peer,
        x: pos ? pos[0] : 0,
        y: pos ? pos[1] : 0,
        isVisible,
        arcPath,
      };
    });
  }, [filteredPeers, projection, pathGenerator, clientPos, showArcs]);

  // Aggregate metrics
  const uniqueCountries = useMemo(() => {
    const set = new Set(enrichedPeers.map((p) => p.country).filter(Boolean));
    return set.size;
  }, [enrichedPeers]);

  const activeStreamsCount = filteredPeers.filter((p) => p.downloadSpeed > 0).length;

  return (
    <div
      className={`relative border border-slate-800 bg-[#0B0F17] rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'p-6' : 'p-4 sm:p-5'
      }`}
    >
      {/* Map Header & Swarm Telemetry Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Swarm Ingestion & Peer Geographic Distribution
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                d3-geo
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time peer endpoints and HTTP WebSeed CDN nodes feeding bitstream chunks to your browser client.
          </p>
        </div>

        {/* Top-Right Metrics Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Peers:</span>
            <span className="font-semibold text-slate-200">
              {filteredPeers.length} active
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Regions:</span>
            <span className="font-semibold text-slate-200">
              {uniqueCountries} {uniqueCountries === 1 ? 'country' : 'countries'}
            </span>
          </div>

          {totalDownloadSpeed !== undefined && totalDownloadSpeed > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center gap-1.5 text-sky-300">
              <ArrowDownRight className="w-3.5 h-3.5 text-sky-400" />
              <span>{formatBytes(totalDownloadSpeed)}/s throughput</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse Map' : 'Expand Map View'}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Projection & Layer Filter Toolbar */}
      <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/60">
        {/* Transport Protocol Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold mr-1">
            Transport:
          </span>
          {(
            [
              { id: 'all', label: `All (${enrichedPeers.length})` },
              {
                id: 'WebRTC',
                label: `WebRTC (${enrichedPeers.filter((p) => p.transport === 'WebRTC').length})`,
              },
              {
                id: 'WebSeed HTTP',
                label: `WebSeed CDN (${enrichedPeers.filter((p) => p.transport === 'WebSeed HTTP').length})`,
              },
              {
                id: 'WSS Tracker',
                label: `Trackers (${enrichedPeers.filter((p) => p.transport === 'WSS Tracker').length})`,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTransportFilter(t.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                transportFilter === t.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Projection Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(
              [
                { id: 'natural-earth', label: 'Natural Earth' },
                { id: 'mercator', label: 'Mercator' },
                { id: 'equal-earth', label: 'Equal Earth' },
                { id: 'orthographic', label: 'Globe 3D' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectionType(p.id)}
                className={`px-2 py-1 text-[11px] rounded transition-colors whitespace-nowrap ${
                  projectionType === p.id
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Arcs & Graticule Toggles */}
          <button
            type="button"
            onClick={() => setShowArcs((prev) => !prev)}
            title="Toggle data flow lines"
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition-colors ${
              showArcs
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 font-medium'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Zap className="w-3 h-3" />
            Arcs {showArcs ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={() => setShowGraticule((prev) => !prev)}
            title="Toggle coordinate grid lines"
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition-colors ${
              showGraticule
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Layers className="w-3 h-3" />
            Grid
          </button>
        </div>
      </div>

      {/* Main D3-Geo SVG Canvas */}
      <div
        className={`relative w-full rounded-xl overflow-hidden bg-[#060910] border border-slate-800/80 my-3 transition-all ${
          isExpanded ? 'h-[540px]' : 'h-[360px] sm:h-[400px]'
        }`}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
        >
          <defs>
            {/* Ocean sphere gradient */}
            <radialGradient id="oceanRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#060910" stopOpacity="0.95" />
            </radialGradient>

            {/* Glowing marker filters */}
            <filter id="peerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="clientGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arc gradients */}
            <linearGradient id="arcWebRTC" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="arcWebSeed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="arcTracker" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background Ocean / Sphere */}
          {graticuleLines.outline && (
            <path
              d={graticuleLines.outline}
              fill="url(#oceanRadial)"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth={1}
            />
          )}

          {/* Graticule Grid Lines (Latitude / Longitude) */}
          {showGraticule && graticuleLines.lines && (
            <path
              d={graticuleLines.lines}
              fill="none"
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth={0.7}
              strokeDasharray="2 3"
            />
          )}

          {/* World Countries Landmass Polygons */}
          <g className="countries-layer">
            {countryPaths.map((c: { id: string; name: string; d: string }) => (
              <path
                key={c.id}
                d={c.d}
                fill="#162032"
                stroke="#293548"
                strokeWidth={0.55}
                className="transition-colors duration-150 hover:fill-[#1e2c44]"
              >
                <title>{c.name}</title>
              </path>
            ))}
          </g>

          {/* Geodesic Data Flow Arcs (Peer -> Local Client) */}
          {showArcs && (
            <g className="arcs-layer">
              {peerNodes.map(({ peer, arcPath, isVisible }) => {
                if (!isVisible || !arcPath) return null;
                const isSelected = selectedPeerId === peer.id || hoveredPeer?.id === peer.id;
                const strokeColor =
                  peer.transport === 'WebSeed HTTP'
                    ? '#34d399'
                    : peer.transport === 'WebRTC'
                    ? '#38bdf8'
                    : '#818cf8';

                return (
                  <g key={`arc-${peer.id}`}>
                    {/* Shadow / Glow line */}
                    <path
                      d={arcPath}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 1.5}
                      strokeOpacity={isSelected ? 0.6 : 0.25}
                    />
                    {/* Flowing animated dash line */}
                    <path
                      d={arcPath}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2 : 1.2}
                      strokeOpacity={isSelected ? 0.95 : 0.65}
                      strokeDasharray="4 6"
                      className="animate-pulse"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Local Client Node Marker */}
          {clientPos && (
            <g
              transform={`translate(${clientPos.x}, ${clientPos.y})`}
              className="client-node"
            >
              {/* Outer pulsing ring */}
              <circle
                r={16}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={1}
                strokeOpacity={0.4}
                className="animate-ping"
              />
              <circle
                r={10}
                fill="rgba(56, 189, 248, 0.2)"
                stroke="#38bdf8"
                strokeWidth={1.5}
              />
              <circle r={4.5} fill="#38bdf8" filter="url(#clientGlow)" />
              {/* Client pin label */}
              <text
                y={-14}
                textAnchor="middle"
                className="text-[10px] font-mono fill-sky-300 font-semibold"
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px #000',
                }}
              >
                YOU (Client)
              </text>
            </g>
          )}

          {/* Peer Nodes */}
          <g className="peers-layer">
            {peerNodes.map(({ peer, x, y, isVisible }) => {
              if (!isVisible) return null;

              const isSelected = selectedPeerId === peer.id;
              const isHovered = hoveredPeer?.id === peer.id;
              const isHighSpeed = peer.downloadSpeed > 1000000;

              // Transport color coding
              const color =
                peer.transport === 'WebSeed HTTP'
                  ? '#34d399' // Emerald
                  : peer.transport === 'WebRTC'
                  ? '#38bdf8' // Sky cyan
                  : '#818cf8'; // Indigo

              const radius = isSelected || isHovered ? 7.5 : isHighSpeed ? 5.5 : 4.5;

              return (
                <g
                  key={`node-${peer.id}`}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer transition-transform duration-100"
                  onMouseEnter={() => setHoveredPeer(peer)}
                  onMouseLeave={() => setHoveredPeer(null)}
                  onClick={() => onSelectPeer?.(peer)}
                >
                  {/* Ping wave for active downloaders */}
                  {peer.downloadSpeed > 0 && (
                    <circle
                      r={radius * 2.4}
                      fill="none"
                      stroke={color}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                      className="animate-ping origin-center"
                    />
                  )}

                  {/* Outer halo */}
                  <circle
                    r={radius + 3}
                    fill={color}
                    fillOpacity={isSelected || isHovered ? 0.35 : 0.15}
                    stroke={color}
                    strokeWidth={isSelected || isHovered ? 1.5 : 0.8}
                    strokeOpacity={0.8}
                  />

                  {/* Center core point */}
                  <circle
                    r={radius}
                    fill={color}
                    filter="url(#peerGlow)"
                    stroke="#0B0F17"
                    strokeWidth={1.5}
                  />

                  {/* Micro city / speed label on hover or high-speed */}
                  {(isHovered || isSelected || isHighSpeed) && (
                    <text
                      y={-radius - 5}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-slate-200 pointer-events-none"
                      style={{
                        textShadow:
                          '0 1px 3px rgba(0,0,0,0.95), 0 0 2px #000, 0 0 4px #000',
                      }}
                    >
                      {peer.flag} {peer.city || peer.ip.split(':')[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Peer HUD Inspector Tooltip (When hovering or selecting a peer) */}
        {hoveredPeer && (
          <div className="absolute top-4 left-4 z-20 max-w-xs bg-slate-900/95 border border-sky-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 pointer-events-none">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                <span className="text-base">{hoveredPeer.flag || '🌐'}</span>
                <span>{hoveredPeer.city}, {hoveredPeer.country}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  hoveredPeer.transport === 'WebSeed HTTP'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : hoveredPeer.transport === 'WebRTC'
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {hoveredPeer.transport}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-slate-400 block text-[10px]">Endpoint</span>
                <span className="text-slate-200 truncate block">{hoveredPeer.ip}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Client</span>
                <span className="text-slate-200 truncate block">{hoveredPeer.client}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Down Speed</span>
                <span className="text-sky-400 font-semibold block">
                  {formatBytes(hoveredPeer.downloadSpeed)}/s
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Latency / RTT</span>
                <span className="text-emerald-400 block">
                  ~{hoveredPeer.latencyMs || 34} ms
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Piece Progress: {hoveredPeer.progress}%</span>
              <span>Coordinates: {hoveredPeer.coordinates?.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/85 border border-slate-800/80 backdrop-blur-sm text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <span className="text-slate-500 font-sans">Transport Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
              WebRTC Browser Peer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              HTTP/2 WebSeed CDN Mirror
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
              WSS Tracker / BitTorrent DHT
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Hover or click peer node to view endpoint diagnostics
          </div>
        </div>
      </div>

      {/* Quick Peer Summary Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono tabular-nums text-xs">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-sans">Connected Swarm</span>
          <span className="text-base font-semibold text-slate-100 mt-0.5 block">
            {enrichedPeers.length} Peers
          </span>
          <span className="text-[10px] text-slate-500">
            {activeStreamsCount} streaming data
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-sans">Geographic Reach</span>
          <span className="text-base font-semibold text-emerald-400 mt-0.5 block">
            {uniqueCountries} Countries
          </span>
          <span className="text-[10px] text-slate-500">Global edge routing</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-sans">Top Ingestion Point</span>
          <span className="text-base font-semibold text-sky-400 mt-0.5 block truncate">
            {enrichedPeers[0]?.city || 'Amsterdam, NL'}
          </span>
          <span className="text-[10px] text-slate-500 truncate block">
            {enrichedPeers[0] ? `${formatBytes(enrichedPeers[0].downloadSpeed)}/s` : 'Idle'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px] font-sans">Ingestion Node</span>
          <span className="text-base font-semibold text-slate-200 mt-0.5 block">
            {LOCAL_CLIENT_NODE.city}
          </span>
          <span className="text-[10px] text-slate-500">Target download buffer</span>
        </div>
      </div>
    </div>
  );
};
