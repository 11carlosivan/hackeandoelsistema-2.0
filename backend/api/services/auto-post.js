import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import RssParser from 'rss-parser';

const SETTINGS_KEY = 'auto_post_config';
const MAX_RESPONSE_BYTES = 2_000_000;
const DEFAULT_CONFIG = {
  sources: '',
  aiProvider: 'gemini',
  apiKeyEncrypted: '',
  postStatus: 'DRAFT',
  categoryIds: [],
  processedHashes: [],
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
    sources: config.sources || '',
    aiProvider: config.aiProvider || 'gemini',
    apiKeyConfigured: Boolean(config.apiKeyEncrypted),
    apiKeyStatus: config.apiKeyEncrypted ? 'configured' : 'missing',
    postStatus: config.postStatus || 'DRAFT',
    categoryIds: Array.isArray(config.categoryIds) ? config.categoryIds : [],
    processedCount: Array.isArray(config.processedHashes) ? config.processedHashes.length : 0,
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
    sources: String(input.sources || '')
      .split(/\r?\n/)
      .map((source) => source.trim())
      .filter(Boolean)
      .join('\n'),
    aiProvider: input.aiProvider,
    postStatus: input.postStatus,
    categoryIds: [...new Set(input.categoryIds || [])],
  };

  if (input.clearApiKey) {
    next.apiKeyEncrypted = '';
  } else if (input.apiKey?.trim()) {
    next.apiKeyEncrypted = encryptSecret(app, input.apiKey);
  }

  delete next.apiKey;

  await app.prisma.siteSetting.upsert({
    where: { settingKey: SETTINGS_KEY },
    create: { settingKey: SETTINGS_KEY, value: next },
    update: { value: next },
  });

  return publicConfig(next);
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

async function getUnprocessedRssArticles({ sources, processedHashes, limit }) {
  const articles = [];

  for (const source of sources) {
    if (articles.length >= limit) break;

    try {
      const xml = await fetchExternalText(source);
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

  return `Redacta una noticia original en espanol neutro, con enfoque periodistico, basada en esta fuente. No copies frases literales largas. Devuelve JSON valido sin markdown.

Titulo fuente: ${title}
Texto fuente:
${content.slice(0, 7000)}

Requisitos:
- Titulo SEO atractivo, maximo 90 caracteres.
- Resumen de 1 a 2 oraciones.
- Contenido HTML con parrafos <p>, subtitulos <h2> y listas <ul><li> si aporta valor.
- ${categoryInstruction}

Formato:
{"title":"...","summary":"...","category":"...","content":"<p>...</p>"}`;
}

async function callGemini(apiKey, prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
    throw new Error(error?.error?.message || `Gemini HTTP ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvio contenido.');

  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim());
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
      const imageUrl = await extractImage(article.url, article.rawContent);
      const status = config.postStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

      const post = await app.prisma.$transaction(async (tx) => {
        const media = imageUrl ? await tx.mediaAsset.create({
          data: {
            disk: 'external',
            url: imageUrl,
            path: imageUrl,
            originalUrl: imageUrl,
            mimeType: 'image/jpeg',
            fileName: `${slug}.jpg`,
            altText: generated.title,
            caption: generated.title,
          },
        }) : null;
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
            publishedAt: status === 'PUBLISHED' ? new Date() : null,
          },
        });

        await tx.route.create({
          data: {
            path: `/${slug}/`,
            entityType: 'POST',
            entityId: createdPost.id,
            status: 'ACTIVE',
            lastmodAt: new Date(),
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
      results.createdPosts.push({ id: post.id, title: post.title, slug: post.slug });
    } catch (error) {
      results.errors.push(`Error en "${article.title}": ${error.message}`);
    }
  }

  const updatedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    processedHashes: [...new Set(nextProcessedHashes)].slice(-2000),
  };
  delete updatedConfig.apiKey;

  await app.prisma.siteSetting.upsert({
    where: { settingKey: SETTINGS_KEY },
    create: { settingKey: SETTINGS_KEY, value: updatedConfig },
    update: { value: updatedConfig },
  });

  return {
    ok: true,
    ...results,
    message: results.success ? 'Auto-Post finalizado.' : 'No se crearon publicaciones nuevas.',
  };
}
