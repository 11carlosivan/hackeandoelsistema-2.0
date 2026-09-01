import 'dotenv/config';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { storeLocalMediaUpload } from '../../api/services/media-storage.js';

const DEFAULT_SITE_URL = 'https://hackeandoelsistema.net';
const WP_UPLOAD_MARKER = '/wp-content/uploads/';
const IMAGE_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;
const MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));

  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function numberArg(name, fallback) {
  const value = Number(argValue(name, fallback));

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function limitArg() {
  if (hasFlag('all')) return null;

  const raw = argValue('limit', '250');

  if (String(raw).toLowerCase() === 'all') return null;

  const value = Number(raw);

  return Number.isInteger(value) && value > 0 ? value : 250;
}

function localConfigFromEnv() {
  return {
    MEDIA_UPLOAD_DIR: process.env.MEDIA_UPLOAD_DIR || '../frontend/public/uploads/cms',
    MEDIA_PUBLIC_BASE_PATH: process.env.MEDIA_PUBLIC_BASE_PATH || '/uploads/cms',
    MEDIA_MAX_FILE_SIZE_BYTES: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES || 8 * 1024 * 1024),
  };
}

function decodeHtmlUrl(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/gi, '&')
    .replace(/&#x26;/gi, '&')
    .trim();
}

function legacyMediaBaseUrl() {
  return String(process.env.LEGACY_MEDIA_BASE_URL || 'https://image.hackeandoelsistema.net/uploads').replace(/\/+$/g, '');
}

function normalizeMediaSourceUrl(value) {
  const rawValue = decodeHtmlUrl(value);

  if (!rawValue || /^(?:data|blob|javascript):/i.test(rawValue)) {
    return null;
  }

  let url;

  try {
    url = rawValue.startsWith('/') ? new URL(rawValue, DEFAULT_SITE_URL) : new URL(rawValue);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return null;
  }

  url.hash = '';

  if (url.pathname.startsWith(WP_UPLOAD_MARKER)) {
    const relativePath = url.pathname.slice(WP_UPLOAD_MARKER.length).replace(/^\/+/, '');

    return `${legacyMediaBaseUrl()}/${relativePath}${url.search}`;
  }

  return url.href;
}

function firstImageFromHtml(value) {
  const match = IMAGE_SRC_RE.exec(String(value || ''));
  const rawUrl = match?.[1] || match?.[2] || match?.[3];

  return normalizeMediaSourceUrl(rawUrl);
}

function fileNameForUrl(value, fallback = 'media') {
  try {
    const url = new URL(value);
    const decoded = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');

    return decoded || `${fallback}.jpg`;
  } catch {
    return `${fallback}.jpg`;
  }
}

function fileNameForMime(sourceUrl, mimeType, fallback) {
  const originalName = fileNameForUrl(sourceUrl, fallback);
  const extension = MIME_EXTENSIONS.get(mimeType) || 'jpg';
  const currentExtension = path.extname(originalName).replace('.', '').toLowerCase();

  if ([...MIME_EXTENSIONS.values()].includes(currentExtension)) {
    return originalName;
  }

  return `${path.basename(originalName, path.extname(originalName)) || fallback}.${extension}`;
}

function sourceUrlForMedia(media) {
  const candidates = [
    media.originalUrl,
    media.url,
    media.legacyGuid,
    media.path,
  ];

  for (const candidate of candidates) {
    const sourceUrl = normalizeMediaSourceUrl(candidate);

    if (sourceUrl) {
      return sourceUrl;
    }
  }

  return null;
}

async function downloadImage(sourceUrl, { timeoutMs, maxBytes }) {
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: 'image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1',
      'User-Agent': 'HackeandoElSistemaMediaMirror/1.0 (+https://hackeandoelsistema.net/)',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

  if (!MIME_EXTENSIONS.has(mimeType)) {
    throw new Error(`Unsupported content-type ${mimeType || 'unknown'}`);
  }

  const reader = response.body?.getReader();
  const chunks = [];
  let size = 0;

  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length || buffer.length > maxBytes) {
      throw new Error('Invalid image size');
    }

    return { buffer, mimeType, finalUrl: response.url || sourceUrl };
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.byteLength;
    if (size > maxBytes) {
      throw new Error('Image exceeds maximum size');
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);

  if (!buffer.length) {
    throw new Error('Empty image');
  }

  return { buffer, mimeType, finalUrl: response.url || sourceUrl };
}

async function findExistingLocalMedia(prisma, sourceUrl) {
  return prisma.mediaAsset.findFirst({
    where: {
      disk: 'local',
      OR: [
        { originalUrl: sourceUrl },
        { legacyGuid: sourceUrl },
      ],
    },
    select: {
      id: true,
      url: true,
      path: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      width: true,
      height: true,
    },
  });
}

async function mirrorSourceToLocal(prisma, sourceUrl, { config, timeoutMs, fallbackName }) {
  const existing = await findExistingLocalMedia(prisma, sourceUrl);

  if (existing) {
    return { media: existing, reused: true };
  }

  const image = await downloadImage(sourceUrl, {
    timeoutMs,
    maxBytes: config.MEDIA_MAX_FILE_SIZE_BYTES,
  });
  const stored = await storeLocalMediaUpload({
    config,
    file: {
      buffer: image.buffer,
      filename: fileNameForMime(image.finalUrl, image.mimeType, fallbackName),
      mimetype: image.mimeType,
    },
  });
  const { localFilePath, ...storedMedia } = stored;
  const media = await prisma.mediaAsset.create({
    data: {
      ...storedMedia,
      originalUrl: sourceUrl,
      legacyGuid: sourceUrl,
      legacyMetadata: {
        source: 'media-local-mirror',
        mirroredAt: new Date().toISOString(),
      },
    },
    select: {
      id: true,
      url: true,
      path: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      width: true,
      height: true,
    },
  });

  return { media, reused: false, localFilePath };
}

async function probeSourceForDryRun(prisma, sourceUrl, { config, timeoutMs }) {
  const existing = await findExistingLocalMedia(prisma, sourceUrl);

  if (existing) {
    return { reused: true };
  }

  await downloadImage(sourceUrl, {
    timeoutMs,
    maxBytes: config.MEDIA_MAX_FILE_SIZE_BYTES,
  });

  return { reused: false };
}

async function collectFeaturedMedia(prisma, limit) {
  return prisma.mediaAsset.findMany({
    where: {
      disk: { not: 'local' },
      mimeType: { startsWith: 'image/' },
      featuredPosts: {
        some: {
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || undefined,
    select: {
      id: true,
      url: true,
      path: true,
      originalUrl: true,
      legacyGuid: true,
      fileName: true,
      mimeType: true,
    },
  });
}

async function collectPostsWithoutFeaturedMedia(prisma, limit) {
  return prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      featuredMediaId: null,
      contentHtml: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit || undefined,
    select: {
      id: true,
      title: true,
      slug: true,
      contentHtml: true,
    },
  });
}

async function runQueue(items, worker, concurrency) {
  const results = [];
  let index = 0;

  async function runNext() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;

      results[currentIndex] = await worker(items[currentIndex], currentIndex).catch((error) => ({
        ok: false,
        error: error.message,
        item: items[currentIndex],
      }));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));

  return results;
}

async function main() {
  const apply = hasFlag('apply');
  const includeContentFallbacks = hasFlag('promote-content');
  const limit = limitArg();
  const concurrency = numberArg('concurrency', 4);
  const timeoutMs = numberArg('timeout-ms', 20000);
  const prisma = new PrismaClient();
  const config = localConfigFromEnv();
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    limit: limit || 'all',
    featured: { scanned: 0, mirrored: 0, reused: 0, failed: 0 },
    promotedContent: { scanned: 0, promoted: 0, reused: 0, failed: 0 },
    failures: [],
  };

  try {
    const mediaAssets = await collectFeaturedMedia(prisma, limit);
    summary.featured.scanned = mediaAssets.length;

    await runQueue(mediaAssets, async (media) => {
      const sourceUrl = sourceUrlForMedia(media);

      if (!sourceUrl) {
        summary.featured.failed += 1;
        summary.failures.push({ type: 'featured', id: media.id, error: 'No source URL' });
        return;
      }

      try {
        const result = apply
          ? await mirrorSourceToLocal(prisma, sourceUrl, {
            config,
            timeoutMs,
            fallbackName: media.fileName || media.id,
          })
          : await probeSourceForDryRun(prisma, sourceUrl, { config, timeoutMs });

        if (apply && result.media?.id) {
          await prisma.post.updateMany({
            where: { featuredMediaId: media.id },
            data: { featuredMediaId: result.media.id },
          });
        }

        if (result.reused) {
          summary.featured.reused += 1;
        } else {
          summary.featured.mirrored += 1;
        }
      } catch (error) {
        summary.featured.failed += 1;
        summary.failures.push({ type: 'featured', id: media.id, sourceUrl, error: error.message });
      }
    }, concurrency);

    if (includeContentFallbacks) {
      const posts = await collectPostsWithoutFeaturedMedia(prisma, limit);
      summary.promotedContent.scanned = posts.length;

      await runQueue(posts, async (post) => {
        const sourceUrl = firstImageFromHtml(post.contentHtml);

        if (!sourceUrl) {
          summary.promotedContent.failed += 1;
          summary.failures.push({ type: 'content', id: post.id, error: 'No image in content' });
          return;
        }

        try {
          const result = apply
            ? await mirrorSourceToLocal(prisma, sourceUrl, {
              config,
              timeoutMs,
              fallbackName: post.slug || post.id,
            })
            : await probeSourceForDryRun(prisma, sourceUrl, { config, timeoutMs });

          if (apply && result.media?.id) {
            await prisma.post.update({
              where: { id: post.id },
              data: { featuredMediaId: result.media.id },
            });
          }

          if (result.reused) {
            summary.promotedContent.reused += 1;
          } else {
            summary.promotedContent.promoted += 1;
          }
        } catch (error) {
          summary.promotedContent.failed += 1;
          summary.failures.push({ type: 'content', id: post.id, sourceUrl, error: error.message });
        }
      }, concurrency);
    }

    summary.failures = summary.failures.slice(0, 25);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
