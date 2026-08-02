import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { storeRemotePhpMediaUpload } from '../../api/services/media-storage.js';

const DEFAULT_SITE_URL = 'https://hackeandoelsistema.net';
const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), '../tmp/wordpress-media-remote-cache.json');
const WP_UPLOAD_RE = /(?:https?:\/\/(?:www\.)?hackeandoelsistema\.net)?\/wp-content\/uploads\/[^"'<>\s)]+/gi;
const WP_UPLOAD_MARKER = '/wp-content/uploads/';
const IMAGE_EXTENSION_RE = /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i;

const contentModels = [
  {
    name: 'posts',
    delegate: 'post',
    htmlFields: ['contentHtml'],
    jsonFields: ['contentJson'],
    defaultWhere: { status: 'PUBLISHED', visibility: 'PUBLIC' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  },
  {
    name: 'pages',
    delegate: 'page',
    htmlFields: ['contentHtml'],
    jsonFields: ['contentJson'],
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  },
  {
    name: 'webStories',
    delegate: 'webStory',
    htmlFields: [],
    jsonFields: ['contentJson'],
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  },
  {
    name: 'products',
    delegate: 'product',
    htmlFields: ['descriptionHtml'],
    jsonFields: [],
    orderBy: [{ createdAt: 'desc' }],
  },
];

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

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function limitArg() {
  if (hasFlag('all')) {
    return null;
  }

  const raw = argValue('limit', '100');

  if (String(raw).toLowerCase() === 'all') {
    return null;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value > 0 ? value : 100;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlUrl(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/gi, '&')
    .replace(/&#x26;/gi, '&');
}

function normalizeSourceUrl(value) {
  if (!value) return null;

  try {
    const decodedValue = decodeHtmlUrl(value);
    const url = decodedValue.startsWith('/')
      ? new URL(decodedValue, DEFAULT_SITE_URL)
      : new URL(decodedValue);

    if (!url.pathname.startsWith(WP_UPLOAD_MARKER)) {
      return null;
    }

    url.hash = '';

    return url.href;
  } catch {
    return null;
  }
}

function stripWordPressGeneratedSize(pathname) {
  return pathname
    .replace(/-\d{2,5}x\d{2,5}(?=\.(?:jpe?g|png|webp|gif)$)/i, '')
    .replace(/-scaled(?=\.(?:jpe?g|png|webp|gif)$)/i, '');
}

function sourceUrlVariants(sourceUrl) {
  const url = new URL(sourceUrl);
  const originalPathname = stripWordPressGeneratedSize(url.pathname);
  const withoutQuery = `${url.origin}${url.pathname}`;
  const originalWithoutQuery = `${url.origin}${originalPathname}`;

  return [...new Set([
    sourceUrl,
    withoutQuery,
    originalWithoutQuery,
    `${url.pathname}${url.search}`,
    url.pathname,
    originalPathname,
    `${DEFAULT_SITE_URL}${url.pathname}${url.search}`,
    `${DEFAULT_SITE_URL}${url.pathname}`,
    `${DEFAULT_SITE_URL}${originalPathname}`,
    `https://www.hackeandoelsistema.net${url.pathname}${url.search}`,
    `https://www.hackeandoelsistema.net${url.pathname}`,
    `https://www.hackeandoelsistema.net${originalPathname}`,
  ])];
}

function chunks(values, size = 500) {
  const batches = [];

  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }

  return batches;
}

function extractWordPressImageUrls(...values) {
  const urls = new Set();

  for (const value of values) {
    if (!value) continue;

    for (const match of String(value).matchAll(WP_UPLOAD_RE)) {
      const normalized = normalizeSourceUrl(match[0]);

      if (normalized && IMAGE_EXTENSION_RE.test(normalized)) {
        urls.add(normalized);
      }
    }
  }

  return [...urls];
}

function jsonToSearchableText(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

async function readCache(cachePath) {
  try {
    return JSON.parse(await readFile(cachePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

async function writeCache(cachePath, cache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function remoteConfigFromEnv() {
  const uploadUrl = process.env.MEDIA_REMOTE_UPLOAD_URL || process.env.BANAHOC_API_URL;
  const secret = process.env.MEDIA_REMOTE_SECRET || process.env.BANAHOC_UPLOAD_TOKEN;

  if (!uploadUrl || !process.env.MEDIA_REMOTE_PUBLIC_BASE_URL || !secret) {
    throw new Error('Missing remote media env. Set MEDIA_REMOTE_UPLOAD_URL, MEDIA_REMOTE_PUBLIC_BASE_URL and MEDIA_REMOTE_SECRET.');
  }

  return {
    MEDIA_REMOTE_UPLOAD_URL: uploadUrl,
    MEDIA_REMOTE_PUBLIC_BASE_URL: process.env.MEDIA_REMOTE_PUBLIC_BASE_URL,
    MEDIA_REMOTE_SECRET: secret,
    MEDIA_REMOTE_TIMEOUT_MS: Number(process.env.MEDIA_REMOTE_TIMEOUT_MS || 15000),
    MEDIA_REMOTE_FILE_FIELD: process.env.MEDIA_REMOTE_FILE_FIELD || 'file',
    MEDIA_REMOTE_AUTH_MODE: process.env.MEDIA_REMOTE_AUTH_MODE || 'signed',
    MEDIA_REMOTE_RESPONSE_MODE: process.env.MEDIA_REMOTE_RESPONSE_MODE || 'media_object',
    MEDIA_MAX_FILE_SIZE_BYTES: Number(process.env.MEDIA_MAX_FILE_SIZE_BYTES || 8 * 1024 * 1024),
  };
}

function remoteConfigFromEnvIfPresent() {
  const uploadUrl = process.env.MEDIA_REMOTE_UPLOAD_URL || process.env.BANAHOC_API_URL;
  const secret = process.env.MEDIA_REMOTE_SECRET || process.env.BANAHOC_UPLOAD_TOKEN;

  if (!uploadUrl && !process.env.MEDIA_REMOTE_PUBLIC_BASE_URL && !secret) {
    return null;
  }

  return remoteConfigFromEnv();
}

function selectForContentModel(model) {
  const select = {
    id: true,
    slug: true,
    title: true,
    ...Object.fromEntries(model.htmlFields.map((field) => [field, true])),
    ...Object.fromEntries(model.jsonFields.map((field) => [field, true])),
  };

  if (model.delegate === 'post' || model.delegate === 'webStory' || model.delegate === 'product') {
    select.featuredMedia = true;
  }

  return select;
}

async function collectContentRecords(prisma, { limit, all }) {
  const recordsByModel = {};

  for (const model of contentModels) {
    const take = all ? undefined : limit;
    const where = all ? undefined : model.defaultWhere;

    if (!all && !model.defaultWhere) {
      recordsByModel[model.name] = [];
      continue;
    }

    recordsByModel[model.name] = await prisma[model.delegate].findMany({
      ...(where ? { where } : {}),
      ...(take ? { take } : {}),
      orderBy: model.orderBy,
      select: selectForContentModel(model),
    });
  }

  return recordsByModel;
}

async function collectSeoRecords(prisma, { all, sourceUrls }) {
  if (!all && sourceUrls.size === 0) {
    return [];
  }

  if (all) {
    return prisma.seoMetadata.findMany({
      where: {
        ogImageUrl: {
          contains: WP_UPLOAD_MARKER,
        },
      },
      select: {
        id: true,
        ogImageUrl: true,
      },
    });
  }

  const variants = [...sourceUrls].flatMap(sourceUrlVariants);

  return prisma.seoMetadata.findMany({
    where: {
      ogImageUrl: {
        in: variants,
      },
    },
    select: {
      id: true,
      ogImageUrl: true,
    },
  });
}

async function collectMediaAssetRecords(prisma, { all, sourceUrls }) {
  if (all) {
    return prisma.mediaAsset.findMany({
      where: {
        OR: [
          { url: { contains: WP_UPLOAD_MARKER } },
          { path: { contains: WP_UPLOAD_MARKER } },
          { originalUrl: { contains: WP_UPLOAD_MARKER } },
        ],
      },
      select: mediaAssetSelect(),
    });
  }

  const variants = [...sourceUrls].flatMap(sourceUrlVariants);

  if (variants.length === 0) {
    return [];
  }

  return prisma.mediaAsset.findMany({
    where: {
      OR: [
        { url: { in: variants } },
        { path: { in: variants } },
        { originalUrl: { in: variants } },
      ],
    },
    select: mediaAssetSelect(),
  });
}

function mediaAssetSelect() {
  return {
    id: true,
    disk: true,
    url: true,
    path: true,
    originalUrl: true,
    fileName: true,
    mimeType: true,
    fileSize: true,
    width: true,
    height: true,
  };
}

async function collectExistingRemoteMappings(prisma, sourceUrls) {
  if (sourceUrls.length === 0) return {};

  const variants = sourceUrls.flatMap(sourceUrlVariants);
  const mediaAssets = [];

  for (const variantBatch of chunks(variants, 500)) {
    mediaAssets.push(...await prisma.mediaAsset.findMany({
      where: {
        OR: [
          { originalUrl: { in: variantBatch } },
          { url: { in: variantBatch } },
          { path: { in: variantBatch } },
        ],
      },
      select: mediaAssetSelect(),
    }));
  }

  const mappings = {};

  for (const media of mediaAssets) {
    const original = normalizeSourceUrl(media.originalUrl);

    if (!original || media.disk !== 'remote_php') {
      continue;
    }

    mappings[original] = {
      disk: 'remote_php',
      url: media.url,
      path: media.path,
      fileName: media.fileName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      width: media.width,
      height: media.height,
      migratedAt: new Date().toISOString(),
      source: 'db',
    };
  }

  return mappings;
}

function collectSourceUrls({ contentRecords, seoRecords, mediaAssets }) {
  const sourceUrls = new Set();

  for (const model of contentModels) {
    for (const record of contentRecords[model.name] || []) {
      for (const field of model.htmlFields) {
        for (const url of extractWordPressImageUrls(record[field])) {
          sourceUrls.add(url);
        }
      }

      for (const field of model.jsonFields) {
        for (const url of extractWordPressImageUrls(jsonToSearchableText(record[field]))) {
          sourceUrls.add(url);
        }
      }

      const featuredUrl = normalizeSourceUrl(record.featuredMedia?.originalUrl || record.featuredMedia?.url || record.featuredMedia?.path);

      if (featuredUrl && IMAGE_EXTENSION_RE.test(featuredUrl)) {
        sourceUrls.add(featuredUrl);
      }
    }
  }

  for (const seo of seoRecords) {
    for (const url of extractWordPressImageUrls(seo.ogImageUrl)) {
      sourceUrls.add(url);
    }
  }

  for (const media of mediaAssets) {
    for (const url of [media.originalUrl, media.url, media.path]) {
      const normalized = normalizeSourceUrl(url);

      if (normalized && IMAGE_EXTENSION_RE.test(normalized)) {
        sourceUrls.add(normalized);
      }
    }
  }

  return sourceUrls;
}

function responseMimeType(response, sourceUrl) {
  const header = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();

  if (header?.startsWith('image/')) {
    return header;
  }

  const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';

  return header || 'application/octet-stream';
}

async function downloadSourceImage(sourceUrl, timeoutMs) {
  const candidates = sourceUrlVariants(sourceUrl)
    .filter((candidate) => /^https?:\/\//i.test(candidate))
    .map((candidate) => {
      const url = new URL(candidate);
      url.hash = '';
      return url.href;
    });
  const failures = [];

  for (const candidate of [...new Set(candidates)]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'HackeandoElSistemaMediaMigrator/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        failures.push(`${candidate} => ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      return {
        filename: path.basename(new URL(candidate).pathname),
        mimetype: responseMimeType(response, candidate),
        buffer,
      };
    } catch (error) {
      failures.push(`${candidate} => ${error?.name === 'AbortError' ? 'timeout' : error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Source download failed (${failures.slice(0, 3).join('; ')})`);
}

async function withConcurrency(items, concurrency, worker) {
  const results = [];
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));

  return results;
}

async function uploadMissingMedia({ sourceUrls, cache, config, apply, concurrency, delayMs, timeoutMs, cachePath }) {
  const missing = sourceUrls.filter((sourceUrl) => !cache[sourceUrl]?.url);
  const uploaded = [];
  const failed = [];

  if (!apply) {
    return { uploaded, failed, pending: missing.length };
  }

  await withConcurrency(missing, concurrency, async (sourceUrl) => {
    try {
      const file = await downloadSourceImage(sourceUrl, timeoutMs);
      const stored = await storeRemotePhpMediaUpload({ config, file });
      cache[sourceUrl] = {
        ...stored,
        migratedAt: new Date().toISOString(),
        source: 'remote_upload',
      };
      uploaded.push(sourceUrl);

      if (uploaded.length % 25 === 0) {
        await writeCache(cachePath, cache);
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (error) {
      failed.push({ sourceUrl, error: error.message });
    }
  });

  return { uploaded, failed, pending: 0 };
}

function replaceMediaUrls(value, cache) {
  if (!value) return { value, changed: false };

  let changed = false;
  const nextValue = String(value).replace(WP_UPLOAD_RE, (matchedUrl) => {
    const normalized = normalizeSourceUrl(matchedUrl);
    const migrated = normalized ? cache[normalized] : null;

    if (!migrated?.url) {
      return matchedUrl;
    }

    changed = true;
    return migrated.url;
  });

  return { value: nextValue, changed };
}

function replaceJsonMediaUrls(value, cache) {
  if (!value) return { value, changed: false };

  const jsonText = jsonToSearchableText(value);
  const replaced = replaceMediaUrls(jsonText, cache);

  if (!replaced.changed) {
    return { value, changed: false };
  }

  try {
    return { value: JSON.parse(replaced.value), changed: true };
  } catch {
    return { value, changed: false };
  }
}

async function updateContentRecords({ prisma, contentRecords, cache, apply }) {
  const updatedByModel = {};

  for (const model of contentModels) {
    let updated = 0;

    for (const record of contentRecords[model.name] || []) {
      const data = {};

      for (const field of model.htmlFields) {
        const replaced = replaceMediaUrls(record[field], cache);
        if (replaced.changed) data[field] = replaced.value;
      }

      for (const field of model.jsonFields) {
        const replaced = replaceJsonMediaUrls(record[field], cache);
        if (replaced.changed) data[field] = replaced.value;
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      updated += 1;

      if (apply) {
        await prisma[model.delegate].update({
          where: { id: record.id },
          data,
        });
      }
    }

    updatedByModel[model.name] = updated;
  }

  return updatedByModel;
}

async function updateSeoRecords({ prisma, seoRecords, cache, apply }) {
  let updatedSeoMetadata = 0;

  for (const seo of seoRecords) {
    const replaced = replaceMediaUrls(seo.ogImageUrl, cache);

    if (!replaced.changed) {
      continue;
    }

    updatedSeoMetadata += 1;

    if (apply) {
      await prisma.seoMetadata.update({
        where: { id: seo.id },
        data: { ogImageUrl: replaced.value },
      });
    }
  }

  return updatedSeoMetadata;
}

async function updateMediaAssets({ prisma, mediaAssets, cache, apply }) {
  let updatedMediaAssets = 0;

  for (const media of mediaAssets) {
    const sourceUrl = normalizeSourceUrl(media.originalUrl) || normalizeSourceUrl(media.url) || normalizeSourceUrl(media.path);
    const migrated = sourceUrl ? cache[sourceUrl] : null;

    if (!migrated?.url) {
      continue;
    }

    const alreadyMatches = media.disk === (migrated.disk || 'remote_php') &&
      media.url === migrated.url &&
      media.path === migrated.path &&
      media.fileName === migrated.fileName &&
      media.mimeType === migrated.mimeType &&
      media.fileSize === migrated.fileSize &&
      media.width === migrated.width &&
      media.height === migrated.height &&
      Boolean(media.originalUrl);

    if (alreadyMatches) {
      continue;
    }

    updatedMediaAssets += 1;

    if (apply) {
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: {
          disk: migrated.disk || 'remote_php',
          url: migrated.url,
          path: migrated.path,
          originalUrl: media.originalUrl || media.url || sourceUrl,
          fileName: migrated.fileName,
          mimeType: migrated.mimeType,
          fileSize: migrated.fileSize,
          width: migrated.width,
          height: migrated.height,
        },
      });
    }
  }

  return updatedMediaAssets;
}

async function auditWordPressMediaDependencies(prisma) {
  const [
    mediaAssets,
    seoMetadata,
    postsHtml,
    postsJson,
    pagesHtml,
    pagesJson,
    storiesJson,
    productsHtml,
  ] = await Promise.all([
    prisma.mediaAsset.count({
      where: {
        OR: [
          { url: { contains: WP_UPLOAD_MARKER } },
          { path: { contains: WP_UPLOAD_MARKER } },
        ],
      },
    }),
    prisma.seoMetadata.count({
      where: {
        ogImageUrl: { contains: WP_UPLOAD_MARKER },
      },
    }),
    prisma.post.count({
      where: {
        contentHtml: { contains: WP_UPLOAD_MARKER },
      },
    }),
    countJsonReferences(prisma.post, 'contentJson'),
    prisma.page.count({
      where: {
        contentHtml: { contains: WP_UPLOAD_MARKER },
      },
    }),
    countJsonReferences(prisma.page, 'contentJson'),
    countJsonReferences(prisma.webStory, 'contentJson'),
    prisma.product.count({
      where: {
        descriptionHtml: { contains: WP_UPLOAD_MARKER },
      },
    }),
  ]);

  const summary = {
    mediaAssets,
    seoMetadata,
    postsHtml,
    postsJson,
    pagesHtml,
    pagesJson,
    storiesJson,
    productsHtml,
  };
  const total = Object.values(summary).reduce((sum, value) => sum + value, 0);

  return {
    total,
    summary,
    status: total === 0 ? 'PASS' : 'FAIL',
  };
}

async function countJsonReferences(delegate, field) {
  const records = await delegate.findMany({
    select: {
      id: true,
      [field]: true,
    },
  });

  return records.filter((record) => jsonToSearchableText(record[field]).includes(WP_UPLOAD_MARKER)).length;
}

async function main() {
  const apply = hasFlag('apply');
  const auditOnly = hasFlag('audit-only');
  const all = hasFlag('all') || String(argValue('limit', '')).toLowerCase() === 'all';
  const limit = limitArg();
  const concurrency = numberArg('concurrency', 2);
  const delayMs = numberArg('delay-ms', 250);
  const timeoutMs = numberArg('timeout-ms', 20000);
  const cachePath = path.resolve(argValue('cache', DEFAULT_CACHE_PATH));
  const prisma = new PrismaClient();

  try {
    if (auditOnly) {
      const audit = await auditWordPressMediaDependencies(prisma);
      console.log(JSON.stringify({ mode: 'audit-only', audit }, null, 2));
      process.exitCode = audit.status === 'PASS' ? 0 : 2;
      return;
    }

    const remoteConfig = remoteConfigFromEnvIfPresent();
    const cache = await readCache(cachePath);
    const contentRecords = await collectContentRecords(prisma, { limit, all });
    let sourceUrls = collectSourceUrls({
      contentRecords,
      seoRecords: [],
      mediaAssets: [],
    });
    const mediaAssets = await collectMediaAssetRecords(prisma, { all, sourceUrls });
    const seoRecords = await collectSeoRecords(prisma, { all, sourceUrls });

    sourceUrls = collectSourceUrls({ contentRecords, seoRecords, mediaAssets });
    Object.assign(cache, await collectExistingRemoteMappings(prisma, [...sourceUrls]));

    const beforeCached = [...sourceUrls].filter((sourceUrl) => cache[sourceUrl]?.url).length;
    const uploadResult = remoteConfig
      ? await uploadMissingMedia({
          sourceUrls: [...sourceUrls],
          cache,
          config: remoteConfig,
          apply,
          concurrency,
          delayMs,
          timeoutMs,
          cachePath,
        })
      : { uploaded: [], failed: [], pending: [...sourceUrls].filter((sourceUrl) => !cache[sourceUrl]?.url).length };
    const updatedContent = await updateContentRecords({ prisma, contentRecords, cache, apply });
    const updatedMediaAssets = await updateMediaAssets({ prisma, mediaAssets, cache, apply });
    const updatedSeoMetadata = await updateSeoRecords({ prisma, seoRecords, cache, apply });

    if (apply) {
      await writeCache(cachePath, cache);
    }

    const audit = apply ? await auditWordPressMediaDependencies(prisma) : null;
    const summary = {
      mode: apply ? 'apply' : 'dry-run',
      scope: all ? 'all' : 'pilot',
      limit: limit || 'all',
      records: Object.fromEntries(Object.entries(contentRecords).map(([key, value]) => [key, value.length])),
      mediaAssets: mediaAssets.length,
      seoRecords: seoRecords.length,
      uniqueWordPressImages: sourceUrls.size,
      alreadyCached: beforeCached,
      pendingUpload: uploadResult.pending,
      uploaded: uploadResult.uploaded.length,
      failed: uploadResult.failed.length,
      updatedContent,
      updatedMediaAssets,
      updatedSeoMetadata,
      audit,
      cachePath,
      failures: uploadResult.failed.slice(0, 20),
    };

    console.log(JSON.stringify(summary, null, 2));

    if (uploadResult.failed.length > 0 || audit?.status === 'FAIL') {
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
