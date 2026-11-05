import React from 'react';
import {
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  FileArchive,
  Disc,
  FileCode,
  File,
  Captions,
} from 'lucide-react';
import { BatchRenameConfig, TorrentFileEntry, TorrentItem } from '../types/torrent';

export type FileExtensionCategory =
  | 'video'
  | 'audio'
  | 'image'
  | 'text'
  | 'subtitle'
  | 'archive'
  | 'disc'
  | 'code'
  | 'other';

export interface FileExtensionMeta {
  extension: string; // e.g., '.mp4', '.tar.xz'
  category: FileExtensionCategory;
  categoryLabel: string; // e.g., 'Video', 'Audio', 'Image', 'Text'
  badgeClasses: string;
  iconColorClass: string;
  containerClasses: string;
}

const VIDEO_EXTS = new Set([
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  'm4v',
  'wmv',
  'flv',
  'ts',
  'm2ts',
  'mpeg',
  'mpg',
  'ogv',
]);

const AUDIO_EXTS = new Set([
  'mp3',
  'flac',
  'wav',
  'aac',
  'ogg',
  'opus',
  'm4a',
  'wma',
  'alac',
  'aiff',
  'ape',
]);

const IMAGE_EXTS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'tiff',
  'tif',
  'ico',
  'avif',
  'heic',
]);

const SUBTITLE_EXTS = new Set(['srt', 'vtt', 'ass', 'ssa', 'sub', 'idx']);

const TEXT_EXTS = new Set([
  'txt',
  'nfo',
  'md',
  'pdf',
  'epub',
  'mobi',
  'doc',
  'docx',
  'rtf',
  'log',
  'csv',
  'gpg',
  'asc',
  'sha256',
  'sha1',
  'md5',
]);

const ARCHIVE_EXTS = new Set([
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'xz',
  'bz2',
  'tgz',
  'zst',
  'cab',
]);

const DISC_EXTS = new Set(['iso', 'img', 'dmg', 'bin', 'cue', 'mdf', 'nrg']);

const CODE_EXTS = new Set([
  'json',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'sh',
  'bash',
  'py',
  'js',
  'ts',
  'exe',
  'msi',
  'deb',
  'rpm',
  'apk',
  'appimage',
]);

export function extractFileExtension(filename: string): string {
  const clean = filename.trim();
  const lower = clean.toLowerCase();

  // Check common compound archive extensions first
  const compoundMatches = ['.tar.xz', '.tar.gz', '.tar.bz2', '.tar.zst'];
  for (const compound of compoundMatches) {
    if (lower.endsWith(compound)) {
      return compound;
    }
  }

  const lastDot = lower.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === lower.length - 1) {
    return '';
  }
  return lower.slice(lastDot);
}

export function getFileExtensionMeta(
  filename: string,
  fallbackType?: TorrentFileEntry['type']
): FileExtensionMeta {
  const extWithDot = extractFileExtension(filename);
  const rawExt = extWithDot.startsWith('.') ? extWithDot.slice(1) : extWithDot;
  const lookupExt = rawExt.includes('.')
    ? rawExt.split('.').pop() || rawExt
    : rawExt;

  let category: FileExtensionCategory = 'other';

  if (VIDEO_EXTS.has(lookupExt)) {
    category = 'video';
  } else if (AUDIO_EXTS.has(lookupExt)) {
    category = 'audio';
  } else if (IMAGE_EXTS.has(lookupExt)) {
    category = 'image';
  } else if (SUBTITLE_EXTS.has(lookupExt)) {
    category = 'subtitle';
  } else if (TEXT_EXTS.has(lookupExt)) {
    category = 'text';
  } else if (ARCHIVE_EXTS.has(lookupExt)) {
    category = 'archive';
  } else if (DISC_EXTS.has(lookupExt)) {
    category = 'disc';
  } else if (CODE_EXTS.has(lookupExt)) {
    category = 'code';
  } else if (fallbackType) {
    if (fallbackType === 'video') category = 'video';
    else if (fallbackType === 'audio') category = 'audio';
    else if (fallbackType === 'document') category = 'text';
    else if (fallbackType === 'archive') category = 'archive';
    else if (fallbackType === 'iso') category = 'disc';
  }

  const displayExt = extWithDot ? extWithDot.toUpperCase() : 'FILE';

  switch (category) {
    case 'video':
      return {
        extension: displayExt,
        category: 'video',
        categoryLabel: 'Video',
        iconColorClass: 'text-sky-400',
        containerClasses: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
        badgeClasses: 'bg-sky-500/12 text-sky-300 border-sky-500/25',
      };
    case 'audio':
      return {
        extension: displayExt,
        category: 'audio',
        categoryLabel: 'Audio',
        iconColorClass: 'text-emerald-400',
        containerClasses: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
        badgeClasses: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
      };
    case 'image':
      return {
        extension: displayExt,
        category: 'image',
        categoryLabel: 'Image',
        iconColorClass: 'text-amber-400',
        containerClasses: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
        badgeClasses: 'bg-amber-500/12 text-amber-300 border-amber-500/25',
      };
    case 'subtitle':
      return {
        extension: displayExt,
        category: 'subtitle',
        categoryLabel: 'Subtitles',
        iconColorClass: 'text-cyan-400',
        containerClasses: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
        badgeClasses: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25',
      };
    case 'text':
      return {
        extension: displayExt,
        category: 'text',
        categoryLabel: 'Text',
        iconColorClass: 'text-indigo-400',
        containerClasses: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
        badgeClasses: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/25',
      };
    case 'archive':
      return {
        extension: displayExt,
        category: 'archive',
        categoryLabel: 'Archive',
        iconColorClass: 'text-violet-400',
        containerClasses: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
        badgeClasses: 'bg-violet-500/12 text-violet-300 border-violet-500/25',
      };
    case 'disc':
      return {
        extension: displayExt,
        category: 'disc',
        categoryLabel: 'Disc ISO',
        iconColorClass: 'text-rose-400',
        containerClasses: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
        badgeClasses: 'bg-rose-500/12 text-rose-300 border-rose-500/25',
      };
    case 'code':
      return {
        extension: displayExt,
        category: 'code',
        categoryLabel: 'Executable',
        iconColorClass: 'text-teal-400',
        containerClasses: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
        badgeClasses: 'bg-teal-500/12 text-teal-300 border-teal-500/25',
      };
    default:
      return {
        extension: displayExt,
        category: 'other',
        categoryLabel: 'File',
        iconColorClass: 'text-slate-400',
        containerClasses: 'bg-slate-800/90 border-slate-700/80 text-slate-400',
        badgeClasses: 'bg-slate-800/80 text-slate-300 border-slate-700',
      };
  }
}

interface FileExtensionIconProps {
  filename: string;
  fallbackType?: TorrentFileEntry['type'];
  size?: 'sm' | 'md';
  showContainer?: boolean;
}

export const FileExtensionIcon: React.FC<FileExtensionIconProps> = ({
  filename,
  fallbackType,
  size = 'sm',
  showContainer = true,
}) => {
  const meta = getFileExtensionMeta(filename, fallbackType);
  const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const renderGlyph = () => {
    switch (meta.category) {
      case 'video':
        return <Film className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'audio':
        return <Music className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'image':
        return <ImageIcon className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'subtitle':
        return <Captions className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'text':
        return <FileText className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'archive':
        return <FileArchive className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'disc':
        return <Disc className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      case 'code':
        return <FileCode className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
      default:
        return <File className={`${iconSizeClass} ${meta.iconColorClass} shrink-0`} />;
    }
  };

  if (!showContainer) {
    return renderGlyph();
  }

  const boxSizeClass = size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-8 h-8 rounded-lg';

  return (
    <span
      title={`${meta.categoryLabel} (${meta.extension})`}
      className={`inline-flex items-center justify-center border shrink-0 ${boxSizeClass} ${meta.containerClasses}`}
    >
      {renderGlyph()}
    </span>
  );
};

export function summarizeFileCategories(
  files: TorrentFileEntry[]
): { category: FileExtensionCategory; label: string; count: number; badgeClasses: string }[] {
  const map = new Map<
    FileExtensionCategory,
    { label: string; count: number; badgeClasses: string }
  >();

  for (const f of files) {
    const meta = getFileExtensionMeta(f.name, f.type);
    const existing = map.get(meta.category);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(meta.category, {
        label: meta.categoryLabel,
        count: 1,
        badgeClasses: meta.badgeClasses,
      });
    }
  }

  return Array.from(map.entries()).map(([category, info]) => ({
    category,
    ...info,
  }));
}

export type PayloadBreakdownBucketId =
  | 'video'
  | 'software'
  | 'audio'
  | 'docs'
  | 'other';

export interface PayloadBreakdownSegment {
  id: PayloadBreakdownBucketId;
  label: string;
  bytes: number;
  percent: number;
  fileCount: number;
  barColorClass: string;
  dotColorClass: string;
  badgeClasses: string;
}

export interface BatchSizeBreakdown {
  totalBytes: number;
  totalFiles: number;
  segments: PayloadBreakdownSegment[];
}

const BUCKET_META: Record<
  PayloadBreakdownBucketId,
  {
    label: string;
    barColorClass: string;
    dotColorClass: string;
    badgeClasses: string;
  }
> = {
  video: {
    label: 'Video',
    barColorClass: 'bg-sky-400',
    dotColorClass: 'bg-sky-400',
    badgeClasses: 'bg-sky-500/12 text-sky-300 border-sky-500/30',
  },
  software: {
    label: 'Software & ISOs',
    barColorClass: 'bg-indigo-400',
    dotColorClass: 'bg-indigo-400',
    badgeClasses: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/30',
  },
  audio: {
    label: 'Audio',
    barColorClass: 'bg-emerald-400',
    dotColorClass: 'bg-emerald-400',
    badgeClasses: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
  },
  docs: {
    label: 'Docs & Subtitles',
    barColorClass: 'bg-amber-400',
    dotColorClass: 'bg-amber-400',
    badgeClasses: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
  },
  other: {
    label: 'Images & Other',
    barColorClass: 'bg-rose-400',
    dotColorClass: 'bg-rose-400',
    badgeClasses: 'bg-rose-500/12 text-rose-300 border-rose-500/30',
  },
};

function getPrimaryBucketForTorrentCategory(
  category: TorrentItem['category']
): PayloadBreakdownBucketId {
  switch (category) {
    case 'Movies':
    case 'TV':
      return 'video';
    case 'Software':
    case 'Games':
      return 'software';
    case 'Audio':
      return 'audio';
    case 'Books':
      return 'docs';
    default:
      return 'other';
  }
}

export function computeBatchSizeBreakdown(
  torrents: TorrentItem[]
): BatchSizeBreakdown {
  const accum: Record<PayloadBreakdownBucketId, { bytes: number; fileCount: number }> = {
    video: { bytes: 0, fileCount: 0 },
    software: { bytes: 0, fileCount: 0 },
    audio: { bytes: 0, fileCount: 0 },
    docs: { bytes: 0, fileCount: 0 },
    other: { bytes: 0, fileCount: 0 },
  };

  let totalBytes = 0;
  let totalFiles = 0;

  for (const torrent of torrents) {
    const primaryBucket = getPrimaryBucketForTorrentCategory(torrent.category);

    if (torrent.files && torrent.files.length > 0) {
      let filesSum = 0;
      for (const file of torrent.files) {
        const meta = getFileExtensionMeta(file.name, file.type);
        let bucket: PayloadBreakdownBucketId = primaryBucket;

        if (meta.category === 'video') {
          bucket = 'video';
        } else if (
          meta.category === 'disc' ||
          meta.category === 'archive' ||
          meta.category === 'code'
        ) {
          bucket = 'software';
        } else if (meta.category === 'audio') {
          bucket = 'audio';
        } else if (meta.category === 'text' || meta.category === 'subtitle') {
          bucket = 'docs';
        } else if (meta.category === 'image') {
          bucket = 'other';
        }

        const safeBytes = Math.max(0, file.sizeBytes || 0);
        accum[bucket].bytes += safeBytes;
        accum[bucket].fileCount += 1;
        filesSum += safeBytes;
        totalFiles += 1;
      }

      if (torrent.sizeBytes > filesSum) {
        const diff = torrent.sizeBytes - filesSum;
        accum[primaryBucket].bytes += diff;
      }
      totalBytes += Math.max(torrent.sizeBytes, filesSum);
    } else {
      const safeTorrentBytes = Math.max(0, torrent.sizeBytes || 0);
      accum[primaryBucket].bytes += safeTorrentBytes;
      accum[primaryBucket].fileCount += 1;
      totalBytes += safeTorrentBytes;
      totalFiles += 1;
    }
  }

  const order: PayloadBreakdownBucketId[] = [
    'video',
    'software',
    'audio',
    'docs',
    'other',
  ];

  const segments: PayloadBreakdownSegment[] = order
    .filter((id) => accum[id].bytes > 0)
    .map((id) => {
      const { bytes, fileCount } = accum[id];
      const percent = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0;
      return {
        id,
        label: BUCKET_META[id].label,
        bytes,
        percent,
        fileCount,
        barColorClass: BUCKET_META[id].barColorClass,
        dotColorClass: BUCKET_META[id].dotColorClass,
        badgeClasses: BUCKET_META[id].badgeClasses,
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalBytes,
    totalFiles,
    segments,
  };
}

export function applyBatchRenameToFilename(
  originalName: string,
  prefix: string,
  suffix: string
): string {
  if (!prefix && !suffix) return originalName;
  const lowerExt = extractFileExtension(originalName);
  if (!lowerExt) {
    return `${prefix}${originalName}${suffix}`;
  }
  const stem = originalName.slice(0, originalName.length - lowerExt.length);
  const originalExt = originalName.slice(originalName.length - lowerExt.length);
  return `${prefix}${stem}${suffix}${originalExt}`;
}

export function applyBatchRenameToFiles(
  files: TorrentFileEntry[],
  config?: BatchRenameConfig
): TorrentFileEntry[] {
  if (!config || (!config.prefix && !config.suffix)) {
    return files.map((f) => ({
      ...f,
      originalName: f.originalName || f.name,
    }));
  }

  return files.map((f) => {
    const baseName = f.originalName || f.name;
    const extMeta = getFileExtensionMeta(baseName, f.type);
    const isMedia = extMeta.category === 'video' || extMeta.category === 'audio';
    const shouldRename = config.scope === 'all' || isMedia;

    if (!shouldRename) {
      return {
        ...f,
        name: baseName,
        originalName: baseName,
      };
    }

    const renamed = applyBatchRenameToFilename(
      baseName,
      config.prefix,
      config.suffix
    );
    return {
      ...f,
      name: renamed,
      originalName: baseName,
    };
  });
}


