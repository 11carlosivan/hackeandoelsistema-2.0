import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import * as cheerio from 'cheerio';
import RssParser from 'rss-parser';
import { storeMediaUpload } from './media-storage.js';

const SETTINGS_KEY = 'auto_post_config';
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);
const GEMINI_MODEL = process.env.AUTO_POST_GEMINI_MODEL || 'gemini-3.5-flash';
const DEFAULT_CONFIG = {
  isEnabled: false,
  intervalMinutes: 30,
  sources: '',
  aiProvider: 'gemini',
  apiKeyEncrypted: '',
  postStatus: 'DRAFT',
  categoryIds: [],
  processedHashes: [],
  lastRunAt: null,
  lastRunStatus: null,
};

const parser = new RssParser();

function encryptionKey(app) {
  return createHash('sha256').update(app.config.AUTH_JWT_SECRET).digest();
}

function encryptSecret(app, value) {
  const plainText = String(value || '').trim();
  if (!plainText) return '';

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(app), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(app, value) {
  const raw = String(value || '');
  if (!raw.startsWith('enc:v1:')) return raw;

  const [, , ivRaw, tagRaw, encryptedRaw] = raw.split(':');
  if (!ivRaw || !tagRaw || !encryptedRaw) return '';

  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(app), Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

function publicConfig(config) {
  return {
    isEnabled: Boolean(config.isEnabled),
    intervalMinutes: Number(config.intervalMinutes) || 30,
    sources: config.sources || '',
    aiProvider: config.aiProvider || 'gemini',
    apiKeyConfigured: Boolean(config.apiKeyEncrypted),
    apiKeyStatus: config.apiKeyEncrypted ? 'configured' : 'missing',
    postStatus: config.postStatus || 'DRAFT',
    categoryIds: Array.isArray(config.categoryIds) ? config.categoryIds : [],
    processedCount: Array.isArray(config.processedHashes) ? config.processedHashes.length : 0,
    lastRunAt: config.lastRunAt || null,
    lastRunStatus: config.lastRunStatus || null,
  };
}

export async function getAutoPostConfig(app, { includeSecret = false } = {}) {
  const row = await app.prisma.siteSetting.findUnique({
    where: { settingKey: SETTINGS_KEY },
  });
  const config = {
    ...DEFAULT_CONFIG,
    ...(row?.value && typeof row.value === 'object' ? row.value : {}),
  };

  if (!includeSecret) {
    return publicConfig(config);
  }

  const apiKey = decryptSecret(app, config.apiKeyEncrypted);

  return {
    ...config,
    apiKey,
    apiKeyDecryptFailed: Boolean(config.apiKeyEncrypted && !apiKey),
  };
}

export async function saveAutoPostConfig(app, input) {
  const current = await getAutoPostConfig(app, { includeSecret: true });
  const next = {
    ...DEFAULT_CONFIG,
    ...current,
    isEnabled: input.isEnabled !== undefined ? Boolean(input.isEnabled) : current.isEnabled,
    intervalMinutes: Number(input.intervalMinutes) || current.intervalMinutes || 30,
    sources: String(input.sources || '')
      .split(/\r?\n/)
      .map((source) => source.trim())
      .filter((source) => source && !source.startsWith('#'))
      .filter(Boolean)
      .join('\n'),
    aiProvider: input.aiProvider || current.aiProvider,
    postStatus: input.postStatus || current.postStatus,
    categoryIds: [...new Set(input.categoryIds || current.categoryIds || [])],
  };

  if (input.clearApiKey) {
    next.apiKeyEncrypted = '';
  } else if (input.apiKey?.trim()) {
    next.apiKeyEncrypted = encryptSecret(app, input.apiKey);
  }

  delete next.apiKey;
  delete next.apiKeyDecryptFailed;

  await app.prisma.siteSetting.upsert({
    where: { settingKey: SETTINGS_KEY },
    create: { settingKey: SETTINGS_KEY, value: next },
    update: { value: next },
  });

  return publicConfig(next);
}

export async function toggleAutoPostEnabled(app, forceState) {
  const current = await getAutoPostConfig(app, { includeSecret: true });
  const nextState = forceState !== undefined ? Boolean(forceState) : !current.isEnabled;

  const next = {
    ...DEFAULT_CONFIG,
    ...current,
    isEnabled: nextState,
  };

  delete next.apiKey;
  delete next.apiKeyDecryptFailed;

  await app.prisma.siteSetting.upsert({
    where: { settingKey: SETTINGS_KEY },
    create: { settingKey: SETTINGS_KEY, value: next },
    update: { value: next },
  });

  if (nextState) {
    setImmediate(() => {
      checkAndRunAutoPost(app, { force: true }).catch((err) => {
        app.log.warn({ err }, 'Auto-post background execution failed after enabling');
      });
    });
  }

  return publicConfig(next);
}

let schedulerInterval = null;
let isJobRunning = false;

export async function checkAndRunAutoPost(app, { force = false } = {}) {
  if (isJobRunning) return null;

  try {
    const config = await getAutoPostConfig(app, { includeSecret: true });
    if (!config.isEnabled && !force) return null;

    const intervalMinutes = Number(config.intervalMinutes) || 30;
    const intervalMs = intervalMinutes * 60 * 1000;
    const lastRunTime = config.lastRunAt ? new Date(config.lastRunAt).getTime() : 0;
    const elapsed = Date.now() - lastRunTime;

    // Si la última ejecución quedó en cola por alta demanda de la IA, reintentar a los 60 segundos
    const isQueuedHighDemand = config.lastRunStatus?.includes('reintento en 1 minuto');
    const effectiveIntervalMs = isQueuedHighDemand ? 60 * 1000 : intervalMs;

    if (!force && elapsed < effectiveIntervalMs) {
      return null;
    }

    isJobRunning = true;
    const result = await processAndPublishAutoPost(app, { limit: 2 });
    return result;
  } catch (err) {
    app.log.warn({ err }, 'Error checking or running auto-post');
    return null;
  } finally {
    isJobRunning = false;
  }
}

export function startAutoPostScheduler(app) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Check every 60 seconds if scheduled auto-post is due
  schedulerInterval = setInterval(() => {
    checkAndRunAutoPost(app).catch((err) => {
      app.log.warn({ err }, 'Error in auto-post scheduler loop');
    });
  }, 60 * 1000);

  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }

  if (typeof app.addHook === 'function') {
    app.addHook('onClose', (_instance, done) => {
      if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
      }
      done();
    });
  }
}

function isPrivateIp(address) {
  if (!address) return true;

  if (net.isIP(address) === 4) {
    const parts = address.split('.').map((part) => Number.parseInt(part, 10));
    const [a, b] = parts;

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

async function assertPublicHttpUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('URL invalida.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Solo se permiten URLs http/https.');
  }

  const hostname = url.hostname.toLowerCase();
  if (['localhost', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local')) {
    throw new Error('Host no permitido.');
  }

  const records = await lookup(hostname, { all: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('La URL apunta a una red privada o no permitida.');
  }

  return url.href;
}

async function fetchExternalText(rawUrl, { timeoutMs = 15000 } = {}) {
  const url = await assertPublicHttpUrl(rawUrl);
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'HackeandoElSistemaBot/1.0 (+https://hackeandoelsistema.net/)',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al leer fuente.`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      throw new Error('Respuesta externa demasiado grande.');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function mimeFromContentType(value) {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function safeImageFileName(imageUrl, slug, mimeType) {
  const extension = IMAGE_MIME_EXTENSIONS.get(mimeType) || 'jpg';
  let stem = slug || 'auto-post';

  try {
    const parsed = new URL(imageUrl);
    const baseName = path.basename(parsed.pathname, path.extname(parsed.pathname));
    if (baseName) {
      stem = baseName;
    }
  } catch {
    // Keep the generated slug fallback.
  }

  const cleanStem = String(stem)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'auto-post';

  return `${cleanStem}.${extension}`;
}

async function downloadExternalImage(rawUrl, { timeoutMs = 15000 } = {}) {
  const url = await assertPublicHttpUrl(rawUrl);
  const response = await fetch(url, {
    headers: {
      Accept: 'image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1',
      'User-Agent': 'HackeandoElSistemaBot/1.0 (+https://hackeandoelsistema.net/)',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al leer imagen.`);
  }

  const mimeType = mimeFromContentType(response.headers.get('content-type'));
  if (!IMAGE_MIME_EXTENSIONS.has(mimeType)) {
    throw new Error('La imagen externa no tiene un formato permitido.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
      throw new Error('Imagen externa vacia o demasiado grande.');
    }
    return { buffer, mimeType, finalUrl: response.url || url };
  }

  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      throw new Error('Imagen externa demasiado grande.');
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks);
  if (!buffer.length) {
    throw new Error('Imagen externa vacia.');
  }

  return { buffer, mimeType, finalUrl: response.url || url };
}

async function createAutoPostMedia(app, { imageUrl, slug, title }) {
  if (!imageUrl) {
    return null;
  }

  try {
    const image = await downloadExternalImage(imageUrl);
    const stored = await storeMediaUpload({
      config: app.config,
      file: {
        buffer: image.buffer,
        filename: safeImageFileName(image.finalUrl, slug, image.mimeType),
        mimetype: image.mimeType,
      },
    });
    const { localFilePath, ...storedMedia } = stored;

    return app.prisma.mediaAsset.create({
      data: {
        ...storedMedia,
        uploadedById: null,
        originalUrl: imageUrl,
        altText: title,
        caption: title,
      },
    });
  } catch (error) {
    app.log.warn({ error, imageUrl }, 'Auto-post image could not be imported into media storage');
    return null;
  }
}

const LOGO_WATERMARK_PATTERNS = [
  /logo/i,
  /logotipo/i,
  /watermark/i,
  /marca[-_]?de[-_]?agua/i,
  /banner/i,
  /header/i,
  /brand/i,
  /marca/i,
  /favicon/i,
  /icon/i,
  /placeholder/i,
  /default[-_]?(image|post|thumb)/i,
  /avatar/i,
  /profile/i,
  /autor/i,
  /author/i,
  /sponsor/i,
  /publicidad/i,
  /site[-_]?logo/i,
  /header[-_]?logo/i,
  /footer[-_]?logo/i,
  /compartir/i,
  /share/i,
  /social[-_]?card/i,
];

export function isLikelyLogoOrWatermarked(imageUrl, sourceUrl = '') {
  if (!imageUrl) return true;

  try {
    const parsedImg = new URL(imageUrl);
    const pathname = parsedImg.pathname.toLowerCase();
    const filename = path.basename(pathname);

    for (const pattern of LOGO_WATERMARK_PATTERNS) {
      if (pattern.test(filename) || pattern.test(pathname)) {
        return true;
      }
    }

    if (sourceUrl) {
      try {
        const sourceHost = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
        const hostParts = sourceHost.split('.')[0];
        if (hostParts.length > 2) {
          if (
            filename.includes(hostParts) &&
            (filename.includes('logo') || filename.includes('icon') || filename.includes('main') || filename.length < hostParts.length + 8)
          ) {
            return true;
          }
        }
      } catch {
        // Ignore domain parsing errors
      }
    }
  } catch {
    return true;
  }

  return false;
}

export async function searchCleanInternetPhoto(searchQuery) {
  if (!searchQuery || typeof searchQuery !== 'string') return null;
  const cleanQuery = searchQuery.trim().slice(0, 80);
  if (cleanQuery.length < 3) return null;

  const apis = [
    `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=3&pithumbsize=1200`,
    `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=3&pithumbsize=1200`,
  ];

  for (const apiUrl of apis) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'HackeandoElSistemaBot/1.0 (+https://hackeandoelsistema.net/)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const pages = data?.query?.pages;
      if (!pages) continue;

      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const thumbUrl = page?.thumbnail?.source;
        if (thumbUrl && !thumbUrl.endsWith('.svg')) {
          if (!page.thumbnail?.width || page.thumbnail.width >= 400) {
            return thumbUrl;
          }
        }
      }
    } catch {
      // Try next
    }
  }

  return null;
}

export async function getOrCreateHesBrandMedia(app, articleTitle = '') {
  try {
    const existing = await app.prisma.mediaAsset.findFirst({
      where: { originalUrl: 'hes://official-brand-cover' },
      select: {
        id: true,
        url: true,
        width: true,
        height: true,
      },
    });

    if (existing) {
      return existing;
    }

    let buffer = null;
    const possiblePaths = [
      path.resolve(process.cwd(), '../frontend/public/logo.png'),
      path.resolve(process.cwd(), 'frontend/public/logo.png'),
      path.resolve(process.cwd(), '../frontend/public/logo_texto.png'),
      path.resolve(process.cwd(), 'public/logo.png'),
    ];

    for (const p of possiblePaths) {
      try {
        const fileBuf = await readFile(p);
        if (fileBuf && fileBuf.length > 0) {
          buffer = fileBuf;
          break;
        }
      } catch {
        // Try next candidate
      }
    }

    if (!buffer) {
      try {
        const res = await fetch('https://hackeandoelsistema.net/logo.png', {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
        }
      } catch {
        // Fallback below
      }
    }

    if (!buffer) {
      return null;
    }

    const stored = await storeMediaUpload({
      config: app.config,
      file: {
        buffer,
        filename: 'portada-oficial-hackeandoelsistema.png',
        mimetype: 'image/png',
      },
    });
    const { localFilePath, ...storedMedia } = stored;

    return await app.prisma.mediaAsset.create({
      data: {
        ...storedMedia,
        uploadedById: null,
        originalUrl: 'hes://official-brand-cover',
        altText: 'Hackeando el Sistema - Información Oficial',
        caption: articleTitle ? `Hackeando el Sistema | ${articleTitle}` : 'Hackeando el Sistema',
      },
    });
  } catch (err) {
    app.log.warn({ err }, 'Failed to create official HES brand media cover');
    return null;
  }
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sourceHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function scrapeFullArticleBody(url) {
  try {
    const html = await fetchExternalText(url, { timeoutMs: 10000 });
    const $ = cheerio.load(html);
    const paragraphs = [];

    $('article p, main p, .entry-content p, .post-content p, p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 40) {
        paragraphs.push(text);
      }
    });

    return paragraphs.slice(0, 30).join('\n\n');
  } catch {
    return '';
  }
}

async function extractImage(url, rawHtml = '') {
  let imageUrl = '';

  if (rawHtml) {
    const $ = cheerio.load(rawHtml);
    imageUrl = $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('img[src]').attr('src') ||
      '';
  }

  if (!imageUrl && url) {
    try {
      const html = await fetchExternalText(url, { timeoutMs: 10000 });
      const $ = cheerio.load(html);
      imageUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('img[src]').attr('src') ||
        '';
    } catch {
      imageUrl = '';
    }
  }

  if (!imageUrl) return '';

  try {
    return new URL(imageUrl, url).href;
  } catch {
    return '';
  }
}

export async function resolveFeedXml(sourceUrl) {
  const initialText = await fetchExternalText(sourceUrl);
  const isHtml = /<!doctype\s+html/i.test(initialText) || /<html[\s>]/i.test(initialText);

  if (!isHtml) {
    return { xml: initialText, resolvedUrl: sourceUrl };
  }

  // 1. Look for <link rel="alternate" type="application/rss+xml" href="..."> in HTML
  try {
    const $ = cheerio.load(initialText);
    const linkRss = $('link[type*="rss+xml"], link[type*="atom+xml"]').first().attr('href');
    if (linkRss) {
      const feedUrl = new URL(linkRss, sourceUrl).href;
      const testXml = await fetchExternalText(feedUrl);
      if (!/<!doctype\s+html/i.test(testXml) && !/<html[\s>]/i.test(testXml)) {
        return { xml: testXml, resolvedUrl: feedUrl };
      }
    }
  } catch {
    // Continue to standard candidates
  }

  // 2. Try common Dominican and standard news feed patterns
  try {
    const parsed = new URL(sourceUrl);
    const origin = parsed.origin;
    const candidates = [
      `${origin}/rss/portada.xml`,
      `${origin}/rss/noticias.xml`,
      `${origin}/rss/home.xml`,
      `${origin}/feed/`,
      `${origin}/rss/`,
    ];

    for (const candidate of candidates) {
      if (candidate === sourceUrl) continue;
      try {
        const testXml = await fetchExternalText(candidate, { timeoutMs: 6000 });
        if (!/<!doctype\s+html/i.test(testXml) && !/<html[\s>]/i.test(testXml)) {
          return { xml: testXml, resolvedUrl: candidate };
        }
      } catch {
        // try next candidate
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    'Es una página web HTML y no tiene un canal RSS público disponible. Usa un feed RSS directo (ej. /rss/portada.xml o /feed/).'
  );
}

async function getUnprocessedRssArticles({ sources, processedHashes, limit }) {
  const articles = [];

  for (const source of sources) {
    if (articles.length >= limit) break;

    try {
      const { xml } = await resolveFeedXml(source);
      const feed = await parser.parseString(xml);

      for (const item of (feed.items || []).slice(0, 8)) {
        if (articles.length >= limit) break;

        const url = item.link || item.guid;
        const hash = sourceHash(url);
        const content = item['content:encoded'] || item.content || item.summary || item.contentSnippet || '';
        let text = stripTags(content);

        if (!url || processedHashes.includes(hash)) continue;

        if (text.length < 300) {
          const scrapedText = await scrapeFullArticleBody(url);
          if (scrapedText.length > text.length) {
            text = scrapedText;
          }
        }

        if (item.title && text.length > 100) {
          articles.push({
            url,
            hash,
            title: item.title.trim(),
            content: text,
            rawContent: content,
          });
        }
      }
    } catch (error) {
      articles.push({ sourceError: `Fuente ${source}: ${error.message}` });
    }
  }

  return articles;
}

function buildPrompt({ title, content, allowedCategories }) {
  const categoryInstruction = allowedCategories.length
    ? `Elige exactamente una categoria de esta lista: ${allowedCategories.join(', ')}.`
    : 'Elige una categoria periodistica breve en espanol.';

  return `Redacta una noticia original en espanol neutro, con enfoque periodistico, basada en esta fuente. No copies frases literales largas ni menciones el nombre del medio fuente original. Devuelve JSON valido sin markdown.

Titulo fuente: ${title}
Texto fuente:
${content.slice(0, 7000)}

Requisitos:
- Titulo SEO atractivo, maximo 90 caracteres.
- Resumen de 1 a 2 oraciones.
- Contenido HTML con parrafos <p>, subtitulos <h2> y listas <ul><li> si aporta valor.
- ${categoryInstruction}
- imageSearchTerm: 1 a 3 palabras clave del tema o persona principal (ej: "Luis Abinader", "Policia Nacional", "Android 15", "Banco Central") para buscar una fotografia periodistica limpia y sin marcas de agua en internet.

Formato:
{"title":"...","summary":"...","category":"...","content":"<p>...</p>","imageSearchTerm":"..."}`;
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

async function callGemini(apiKey, prompt) {
  const envModel = (process.env.AUTO_POST_GEMINI_MODEL || '').trim();
  const deprecatedOrSpiking = [
    'gemini-3.7-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ];

  const models = [
    envModel && !deprecatedOrSpiking.includes(envModel) ? envModel : 'gemini-3.5-flash',
    ...CANDIDATE_GEMINI_MODELS,
  ].filter(Boolean);

  const uniqueModels = [...new Set(models)];
  let lastError = null;
  let encounteredHighDemand = false;

  for (const model of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.65, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          const errMsg = error?.error?.message || `HTTP ${response.status}`;

          const isHighDemand = response.status === 503 ||
            response.status === 429 ||
            /high demand|overloaded|spikes in demand/i.test(errMsg);

          if (isHighDemand) {
            encounteredHighDemand = true;
            lastError = new Error(
              `Alta demanda en Google Gemini (${model}): "${errMsg}". Conmutando a modelo alternativo o quedando en cola para reintento en 1 minuto.`
            );
            if (attempt === 1) {
              await new Promise((resolve) => setTimeout(resolve, 3000));
              continue;
            }
            break; // Try next model candidate
          }

          if (response.status === 404 || response.status === 400) {
            if (!encounteredHighDemand) {
              lastError = new Error(`Gemini (${model}): ${errMsg}`);
            }
            break;
          }

          throw new Error(`Gemini (${model}): ${errMsg}`);
        }

        const json = await response.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Gemini (${model}) no devolvió contenido.`);

        return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim());
      } catch (err) {
        if (!encounteredHighDemand) {
          lastError = err;
        }
        if (err.message.includes('404') || err.message.includes('not found') || err.message.includes('Alta demanda')) {
          break;
        }
        throw err;
      }
    }
  }

  if (encounteredHighDemand) {
    throw new Error('Alta demanda temporal en los servidores de Google Gemini. La tarea ha quedado en cola y el motor volverá a intentar automáticamente en 1 minuto.');
  }

  throw lastError || new Error('No se pudo comunicar con los modelos de Gemini disponibles.');
}


async function callOpenAi(apiKey, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.65,
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI no devolvio contenido.');

  return JSON.parse(text);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

async function uniqueSlug(prisma, title) {
  const base = slugify(title) || `auto-post-${Date.now()}`;
  let slug = base;
  let suffix = 2;

  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }

  return slug;
}

async function findAuthorId(prisma) {
  const admin = await prisma.user.findFirst({
    where: {
      status: 'ACTIVE',
      roles: { some: { role: { name: 'ADMIN' } } },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (admin?.id) return admin.id;

  const user = await prisma.user.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!user?.id) {
    throw new Error('No hay usuario activo para asignar como autor.');
  }

  return user.id;
}

export async function processAndPublishAutoPost(app, { limit = 2 } = {}) {
  const config = await getAutoPostConfig(app, { includeSecret: true });
  const sources = String(config.sources || '').split(/\r?\n/).map((source) => source.trim()).filter(Boolean);
  const apiKey = config.apiKey;
  const processedHashes = Array.isArray(config.processedHashes) ? config.processedHashes : [];
  const categoryIds = Array.isArray(config.categoryIds) ? config.categoryIds : [];

  if (!sources.length) {
    return { success: false, message: 'No hay fuentes RSS configuradas.' };
  }

  if (config.apiKeyDecryptFailed) {
    return {
      success: false,
      message: 'La clave API guardada no se pudo descifrar. Guardala nuevamente desde la configuracion.',
    };
  }

  if (!apiKey) {
    return { success: false, message: 'Falta configurar la clave API de IA.' };
  }

  const categories = categoryIds.length
    ? await app.prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
    : await app.prisma.category.findMany({ take: 20, select: { id: true, name: true } });
  const allowedCategories = categories.map((category) => category.name);
  const articles = await getUnprocessedRssArticles({
    sources,
    processedHashes,
    limit: Math.min(5, Math.max(1, limit)),
  });

  const results = {
    processed: 0,
    success: 0,
    createdPosts: [],
    errors: articles.filter((item) => item.sourceError).map((item) => item.sourceError),
  };

  const authorId = await findAuthorId(app.prisma);
  const nextProcessedHashes = [...processedHashes];

  for (const article of articles.filter((item) => !item.sourceError)) {
    try {
      results.processed += 1;
      const prompt = buildPrompt({ title: article.title, content: article.content, allowedCategories });
      const generated = config.aiProvider === 'openai'
        ? await callOpenAi(apiKey, prompt)
        : await callGemini(apiKey, prompt);

      if (!generated?.title || !generated?.content) {
        throw new Error('La IA devolvio una respuesta incompleta.');
      }

      const slug = await uniqueSlug(app.prisma, generated.title);
      const matchedCategory = categories.find((category) =>
        category.name.toLowerCase() === String(generated.category || '').toLowerCase()
      ) || categories[0];

      // 1. Try to search internet for clean, related photo without watermark
      const searchTerm = generated.imageSearchTerm || generated.title;
      let cleanImageUrl = await searchCleanInternetPhoto(searchTerm);
      let media = null;

      if (cleanImageUrl) {
        media = await createAutoPostMedia(app, {
          imageUrl: cleanImageUrl,
          slug,
          title: generated.title,
        });
      }

      // 2. If no clean photo from search, evaluate source article image
      if (!media) {
        const sourceImageUrl = await extractImage(article.url, article.rawContent);
        const isBranded = isLikelyLogoOrWatermarked(sourceImageUrl, article.url);

        if (sourceImageUrl && !isBranded) {
          media = await createAutoPostMedia(app, {
            imageUrl: sourceImageUrl,
            slug,
            title: generated.title,
          });
        } else if (sourceImageUrl && isBranded) {
          app.log.info({ sourceImageUrl }, 'Imagen de la fuente descartada por contener logotipo o marca de agua.');
        }
      }

      // 3. If still no media, fallback to Hackeando el Sistema official brand cover
      if (!media) {
        media = await getOrCreateHesBrandMedia(app, generated.title);
      }

      const requestedPublished = config.postStatus === 'PUBLISHED';
      const status = requestedPublished && media?.id ? 'PUBLISHED' : 'DRAFT';
      const publishedAt = status === 'PUBLISHED' ? new Date() : null;

      const post = await app.prisma.$transaction(async (tx) => {
        const createdPost = await tx.post.create({
          data: {
            authorId,
            featuredMediaId: media?.id,
            title: generated.title,
            slug,
            excerpt: generated.summary || null,
            contentHtml: generated.content,
            contentText: stripTags(generated.content),
            status,
            postType: 'NEWS',
            visibility: 'PUBLIC',
            publishedAt,
            publishedGmtAt: publishedAt,
          },
        });
        const isPublished = status === 'PUBLISHED';

        const route = await tx.route.create({
          data: {
            path: `/${slug}/`,
            entityType: 'POST',
            entityId: createdPost.id,
            status: isPublished ? 'ACTIVE' : 'GONE',
            httpStatus: isPublished ? 200 : 404,
            includeInSitemap: isPublished,
            lastmodAt: new Date(),
          },
        });

        await tx.seoMetadata.create({
          data: {
            routeId: route.id,
            title: generated.title,
            description: generated.summary || null,
            robotsIndex: isPublished ? 'INDEX' : 'NOINDEX',
            robotsFollow: 'FOLLOW',
          },
        });

        if (matchedCategory?.id) {
          await tx.postCategory.create({
            data: {
              postId: createdPost.id,
              categoryId: matchedCategory.id,
              isPrimary: true,
            },
          });
        }

        return createdPost;
      });

      nextProcessedHashes.push(article.hash);
      results.success += 1;
      results.createdPosts.push({ id: post.id, title: post.title, slug: post.slug, status: post.status });
    } catch (error) {
      results.errors.push(`Error en "${article.title}": ${error.message}`);
    }
  }

  const hadHighDemand = (results.errors || []).some((e) => /alta demanda|high demand|overloaded|spikes in demand|503/i.test(e));
  let runStatus = '';
  if (results.success > 0) {
    runStatus = `Éxito: ${results.success} creados`;
  } else if (hadHighDemand) {
    runStatus = 'En cola (reintento en 1 minuto): Alta demanda temporal en servidores de IA. Reintentando automáticamente.';
  } else {
    runStatus = results.errors?.[0] || 'Sin noticias nuevas';
  }

  const updatedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    lastRunAt: new Date().toISOString(),
    lastRunStatus: runStatus,
    processedHashes: [...new Set(nextProcessedHashes)].slice(-2000),
  };
  delete updatedConfig.apiKey;
  delete updatedConfig.apiKeyDecryptFailed;

  await app.prisma.siteSetting.upsert({
    where: { settingKey: SETTINGS_KEY },
    create: { settingKey: SETTINGS_KEY, value: updatedConfig },
    update: { value: updatedConfig },
  });

  return {
    ok: true,
    ...results,
    isQueued: hadHighDemand,
    message: results.success
      ? `Auto-Post finalizado: ${results.success} artículo(s) procesado(s).`
      : hadHighDemand
      ? 'Alta demanda temporal en los servidores de Google Gemini. La tarea ha quedado en cola y el motor volverá a intentar automáticamente en 1 minuto.'
      : 'No se crearon publicaciones nuevas.',
  };
}
