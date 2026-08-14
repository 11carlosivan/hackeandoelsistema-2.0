import { lookup } from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { storeMediaUpload } from './media-storage.js';

const IMAGE_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;
const DEFAULT_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_ORIGIN || 'https://hackeandoelsistema.net').replace(/\/+$/g, '');
const MAX_FEATURED_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

function cleanImageUrl(value, siteUrl = DEFAULT_SITE_URL) {
  const rawValue = String(value || '').trim();

  if (!rawValue || rawValue.startsWith('data:') || rawValue.startsWith('blob:') || rawValue.startsWith('javascript:')) {
    return null;
  }

  try {
    const url = rawValue.startsWith('/') ? new URL(rawValue, siteUrl) : new URL(rawValue);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function firstImageUrlFromHtml(value, { siteUrl = DEFAULT_SITE_URL } = {}) {
  const match = IMAGE_SRC_RE.exec(String(value || ''));
  const rawUrl = match?.[1] || match?.[2] || match?.[3];

  return cleanImageUrl(rawUrl, siteUrl);
}

function diskForImageUrl(value, siteUrl = DEFAULT_SITE_URL) {
  try {
    const url = new URL(value);
    const site = new URL(siteUrl);

    if (url.hostname === 'image.hackeandoelsistema.net') {
      return 'remote_php';
    }

    if (url.hostname === site.hostname && url.pathname.startsWith('/uploads/cms/')) {
      return 'local';
    }

    if (url.pathname.startsWith('/wp-content/uploads/')) {
      return 'wordpress';
    }
  } catch {
    return 'external';
  }

  return 'external';
}

function mimeTypeForImageUrl(value) {
  const pathname = (() => {
    try {
      return new URL(value).pathname.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';

  return 'image/jpeg';
}

function fileNameForImageUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const fileName = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '').trim();

    return fileName || 'featured-image.jpg';
  } catch {
    return 'featured-image.jpg';
  }
}

function isPrivateIp(address) {
  if (!address) return true;

  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map((part) => Number.parseInt(part, 10));
    return a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      address === '0.0.0.0';
  }

  if (net.isIP(address) === 6) {
    const lower = address.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }

  return true;
}

async function assertPublicImageUrl(rawUrl) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  if (!['http:', 'https:'].includes(url.protocol) || ['localhost', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local')) {
    throw new Error('Image URL is not allowed');
  }

  const records = await lookup(hostname, { all: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('Image URL resolves to a private network');
  }

  return url.href;
}

function cleanDownloadedImageFileName(imageUrl, fallbackName, mimeType) {
  const extension = IMAGE_MIME_EXTENSIONS.get(mimeType) || 'jpg';
  const sourceFileName = fileNameForImageUrl(imageUrl);
  const rawStem = path.basename(sourceFileName, path.extname(sourceFileName)) || fallbackName || 'featured-image';
  const stem = String(rawStem)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'featured-image';

  return `${stem}.${extension}`;
}

async function downloadImageForStorage(imageUrl) {
  const url = await assertPublicImageUrl(imageUrl);
  const response = await fetch(url, {
    headers: {
      Accept: 'image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1',
      'User-Agent': 'HackeandoElSistemaBot/1.0 (+https://hackeandoelsistema.net/)',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while reading featured image`);
  }

  const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!IMAGE_MIME_EXTENSIONS.has(mimeType)) {
    throw new Error('Featured image format is not allowed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_FEATURED_IMAGE_BYTES) {
      throw new Error('Featured image is empty or too large');
    }
    return { buffer, mimeType, finalUrl: response.url || url };
  }

  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FEATURED_IMAGE_BYTES) {
      throw new Error('Featured image is too large');
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) {
    throw new Error('Featured image is empty');
  }

  return { buffer, mimeType, finalUrl: response.url || url };
}

async function importFeaturedImageToStorage(prisma, post, imageUrl, { config, log }) {
  if (!config) {
    return null;
  }

  try {
    const image = await downloadImageForStorage(imageUrl);
    const storedMedia = await storeMediaUpload({
      config,
      file: {
        buffer: image.buffer,
        filename: cleanDownloadedImageFileName(image.finalUrl, post?.slug || post?.title, image.mimeType),
        mimetype: image.mimeType,
      },
    });
    const media = await prisma.mediaAsset.create({
      data: {
        ...storedMedia,
        uploadedById: null,
        originalUrl: imageUrl,
        altText: String(post?.title || '').trim().slice(0, 255) || null,
        caption: String(post?.title || '').trim() || null,
      },
      select: {
        id: true,
      },
    });

    return media.id;
  } catch (error) {
    log?.warn?.({ error, postId: post?.id, imageUrl }, 'Unable to import featured image into media storage');
    return null;
  }
}

export async function ensureFeaturedMediaFromPostContent(prisma, post, { siteUrl = DEFAULT_SITE_URL, config = null, log = null } = {}) {
  if (post?.featuredMediaId) {
    return post.featuredMediaId;
  }

  const imageUrl = firstImageUrlFromHtml(post?.contentHtml, { siteUrl });

  if (!imageUrl) {
    return null;
  }

  const url = new URL(imageUrl);
  const path = url.pathname;
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      OR: [
        { url: imageUrl },
        { originalUrl: imageUrl },
        { path },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existing?.id) {
    return existing.id;
  }

  const disk = diskForImageUrl(imageUrl, siteUrl);
  if (config && (disk === 'remote_php' || disk === 'local')) {
    const media = await prisma.mediaAsset.create({
      data: {
        disk,
        url: imageUrl,
        path,
        originalUrl: imageUrl,
        mimeType: mimeTypeForImageUrl(imageUrl),
        fileName: fileNameForImageUrl(imageUrl),
        altText: String(post?.title || '').trim().slice(0, 255) || null,
        caption: String(post?.title || '').trim() || null,
      },
      select: {
        id: true,
      },
    });

    return media.id;
  }

  const importedMediaId = await importFeaturedImageToStorage(prisma, post, imageUrl, { config, log });
  if (importedMediaId) {
    return importedMediaId;
  }

  if (config) {
    return null;
  }

  const media = await prisma.mediaAsset.create({
    data: {
      disk: diskForImageUrl(imageUrl, siteUrl),
      url: imageUrl,
      path,
      originalUrl: imageUrl,
      mimeType: mimeTypeForImageUrl(imageUrl),
      fileName: fileNameForImageUrl(imageUrl),
      altText: String(post?.title || '').trim().slice(0, 255) || null,
      caption: String(post?.title || '').trim() || null,
    },
    select: {
      id: true,
    },
  });

  return media.id;
}
