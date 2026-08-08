import rssParser from 'rss-parser';
import * as cheerio from 'cheerio';
import { randomUUID } from 'node:crypto';

const parser = new rssParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  },
  timeout: 15000,
});

/**
 * Clean basic HTML tags from raw content
 */
function stripTags(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape full article body paragraphs if RSS summary is too short
 */
async function scrapeFullArticleBody(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return '';

    const html = await response.text();
    const $ = cheerio.load(html);

    const paragraphs = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40) {
        paragraphs.push(text);
      }
    });

    return paragraphs.join('\n\n');
  } catch (err) {
    return '';
  }
}

/**
 * Extract og:image or first <img> from HTML or URL
 */
async function extractOgOrFirstImage(url, rawHtml = '') {
  let imageUrl = '';

  if (rawHtml) {
    const $ = cheerio.load(rawHtml);
    imageUrl = $('meta[property="og:image"]').attr('content') ||
               $('meta[content][property="og:image"]').attr('content') ||
               $('img[src]').attr('src') || '';
  }

  if (!imageUrl && url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[content][property="og:image"]').attr('content') ||
                   $('img[src]').attr('src') || '';
      }
    } catch (_) {}
  }

  if (imageUrl && imageUrl.startsWith('//')) {
    imageUrl = 'https:' + imageUrl;
  }

  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1024&auto=format&fit=crop';
  }

  return imageUrl;
}

/**
 * Scrape unprocessed RSS articles
 */
export async function getUnprocessedRssArticles({ sources = [], processedHashes = [], limit = 3 }) {
  const articles = [];

  for (const sourceUrl of sources) {
    if (!sourceUrl || articles.length >= limit) break;

    try {
      const feed = await parser.parseURL(sourceUrl.trim());
      const items = (feed.items || []).slice(0, 5);

      for (const item of items) {
        if (articles.length >= limit) break;

        const permalink = item.link || item.guid;
        if (!permalink) continue;

        // Hash link to prevent duplicates
        const urlHash = Buffer.from(permalink).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        if (processedHashes.includes(urlHash) || processedHashes.includes(permalink)) {
          continue;
        }

        const title = item.title?.trim();
        let content = item['content:encoded'] || item.content || item.summary || item.contentSnippet || '';
        let cleanContent = stripTags(content);

        if (cleanContent.length < 300) {
          const scrapedText = await scrapeFullArticleBody(permalink);
          if (scrapedText.length > cleanContent.length) {
            cleanContent = scrapedText;
          }
        }

        if (title && cleanContent.length > 100) {
          articles.push({
            url: permalink,
            urlHash,
            originalTitle: title,
            originalContent: cleanContent,
            rawContent: content,
            date: item.pubDate || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn(`[AutoPost] Error parsing feed ${sourceUrl}:`, err.message);
    }
  }

  return articles;
}

/**
 * Build journalistic rewrite prompt for Gemini or OpenAI
 */
function buildRewritePrompt(title, content, allowedCategories = []) {
  let catInstruction = "Clasifica la noticia en una sola palabra principal en español (ej: Deportes, Política, Economía, Tecnología, Entretenimiento, Internacional, Sociedad, Ciencia, Cultura, Salud).";

  if (Array.isArray(allowedCategories) && allowedCategories.length > 0) {
    const catsList = allowedCategories.join(', ');
    catInstruction = `DEBES elegir OBLIGATORIAMENTE la categoría que mejor encaje únicamente dentro de esta lista de categorías permitidas: [${catsList}]. No inventes otra categoría.`;
  }

  return `Actúa como un periodista profesional senior y redactor jefe de un prestigioso periódico digital internacional.
Tu objetivo principal es tomar la noticia de origen y redactar un ARTÍCULO PERIODÍSTICO EXTENSO, COMPLETO, PROFUNDO Y 100% INÉDITO en español neutro. La redacción debe ser rica en detalles, fluida y estructurada formalmente (mínimo entre 400 y 700 palabras) para cumplir estrictamente con los estándares de contenido de alto valor de Google AdSense.

NOTICIA DE ORIGEN:
Título original: ${title}
Texto de origen:
${content}

REQUISITOS OBLIGATORIOS DE REDACCIÓN:
1. PARÁFRASEOPROFUNDO: No copies frases literales ni la estructura original. Vuelve a redactar los hechos con un vocabulario periodístico amplio, analítico e imparcial.
2. EXTENSIÓN Y DETALLE: Desarrolla a fondo el tema. Expande los antecedentes, el contexto de los hechos, los implicados y las repercusiones o implicaciones a futuro. El artículo NUNCA debe ser un resumen corto.
3. ESTRUCTURA HTML RICO: Organiza la nota usando:
   - Una introducción impactante que responda al 'Qué, Quién, Cuándo, Dónde y Por qué' (Pirámide Invertida).
   - Al menos dos o tres subtítulos <h2> descriptivos e informativos.
   - Múltiples párrafos desarrollados (<p>).
   - Listas de puntos <ul> / <li> para destacar datos clave si aplica.
   - Una conclusión o reflexión final.
4. CATEGORÍA: ${catInstruction}
5. TÍTULO SEO: Un titular completamente nuevo, profesional, sin amarillismo pero muy atractivo para Google Noticias (máximo 80 caracteres).
6. RESUMEN: Una meta-descripción de 2 oraciones para redes sociales y motores de búsqueda.
7. PROMPT DE IMAGEN: Un prompt en inglés detallado para generar una fotografía periodística fotorrealista de alta calidad relacionada con el tema (sin texto).

DEBES RESPONDER EXCLUSIVAMENTE EN FORMATO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA (sin bloques de markdown ni comillas extrañas):

{
  "title": "Nuevo Titular Periodístico Impresionante",
  "category": "NombreDeCategoriaPermitida",
  "content": "<p>Introducción extensa...</p><h2>Contexto del Suceso</h2><p>Párrafo detallado 1...</p><p>Párrafo detallado 2...</p><h2>Repercusiones e Implicaciones</h2><p>Más análisis...</p>",
  "summary": "Resumen conciso y profesional del artículo...",
  "image_prompt": "Editorial news photograph showing..."
}`;
}

/**
 * Call Gemini API
 */
async function callGeminiApi(apiKey, prompt) {
  const cleanKey = apiKey.trim();
  let validModels = ['models/gemini-1.5-flash', 'models/gemini-2.0-flash', 'models/gemini-1.5-flash-latest'];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, { signal: AbortSignal.timeout(10000) });
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData.models)) {
        const discovered = listData.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name);
        if (discovered.length > 0) validModels = discovered;
      }
    }
  } catch (_) {}

  let lastError = null;

  for (const modelPath of validModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${cleanKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${res.status}`;
        continue;
      }

      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleanJson = rawText.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed?.title && parsed?.content) return parsed;
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(`Gemini API Error: ${lastError || 'No se pudo generar contenido.'}`);
}

/**
 * Call OpenAI API
 */
async function callOpenAiApi(apiKey, prompt) {
  const cleanKey = apiKey.trim();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API Error (${res.status}): ${errJson?.error?.message || 'Failed'}`);
  }

  const json = await res.json();
  const rawText = json?.choices?.[0]?.message?.content;
  if (rawText) {
    const parsed = JSON.parse(rawText);
    if (parsed?.title && parsed?.content) return parsed;
  }

  throw new Error('Respuesta inválida de la API de OpenAI.');
}

/**
 * Main Auto-Post Processor Execution
 */
export async function processAndPublishAutoPost(app, { limit = 2 } = {}) {
  const prisma = app.prisma;

  // Read settings
  const settingsRows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'auto_post_sources',
          'auto_post_ai_provider',
          'auto_post_ai_api_key',
          'auto_post_processed_urls',
          'auto_post_status',
          'auto_post_categories',
        ],
      },
    },
  });

  const settings = {};
  settingsRows.forEach(row => { settings[row.key] = row.value; });

  const sourcesRaw = settings.auto_post_sources || '';
  const sources = sourcesRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const aiProvider = settings.auto_post_ai_provider || 'gemini';
  const apiKey = settings.auto_post_ai_api_key || '';
  const processedHashes = JSON.parse(settings.auto_post_processed_urls || '[]');
  const postStatus = settings.auto_post_status || 'DRAFT';
  const selectedCategoryIds = JSON.parse(settings.auto_post_categories || '[]');

  if (!sources.length) {
    return { success: false, message: 'No hay fuentes RSS configuradas.' };
  }

  if (!apiKey) {
    return { success: false, message: 'Falta configurar la clave API de IA.' };
  }

  // Load allowed category names
  let allowedCategories = [];
  if (selectedCategoryIds.length > 0) {
    const categories = await prisma.category.findMany({
      where: { id: { in: selectedCategoryIds } },
      select: { id: true, name: true },
    });
    allowedCategories = categories.map(c => c.name);
  }

  const articles = await getUnprocessedRssArticles({ sources, processedHashes, limit });

  if (!articles.length) {
    return { success: true, processedCount: 0, message: 'No hay noticias nuevas para procesar.' };
  }

  const results = {
    processed: 0,
    success: 0,
    errors: [],
    createdPosts: [],
  };

  for (const article of articles) {
    results.processed++;

    try {
      const prompt = buildRewritePrompt(article.originalTitle, article.originalContent, allowedCategories);
      let aiResult = null;

      if (aiProvider === 'gemini') {
        aiResult = await callGeminiApi(apiKey, prompt);
      } else {
        aiResult = await callOpenAiApi(apiKey, prompt);
      }

      // Match category
      let categoryId = selectedCategoryIds[0] || null;
      if (aiResult.category) {
        const matchedCat = await prisma.category.findFirst({
          where: { name: { equals: aiResult.category.trim() } },
        });
        if (matchedCat) {
          categoryId = matchedCat.id;
        }
      }

      // Download / Extract news image
      const imageUrl = await extractOgOrFirstImage(article.url, article.rawContent);

      // Create Featured Media asset
      let mediaId = null;
      if (imageUrl) {
        const media = await prisma.mediaAsset.create({
          data: {
            fileName: `${aiResult.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            url: imageUrl,
            storagePath: imageUrl,
            altText: aiResult.title,
            caption: aiResult.title,
          },
        });
        mediaId = media.id;
      }

      // Embed image tag at top of HTML content
      let contentHtml = aiResult.content;
      if (imageUrl) {
        contentHtml = `<p><img src="${imageUrl}" alt="${aiResult.title}" class="w-full h-auto rounded-none mb-6 border border-terminal-gray" /></p>${contentHtml}`;
      }

      // Generate slug
      const slug = aiResult.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .substring(0, 80) + `-${Date.now().toString().slice(-4)}`;

      // Admin author
      const adminUser = await prisma.user.findFirst({ where: { username: 'admin1' } });

      const post = await prisma.post.create({
        data: {
          title: aiResult.title,
          slug,
          excerpt: aiResult.summary || null,
          contentHtml,
          contentText: stripTags(contentHtml),
          status: postStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
          postType: 'NEWS',
          visibility: 'PUBLIC',
          authorId: adminUser?.id || undefined,
          featuredMediaId: mediaId,
          publishedAt: postStatus === 'PUBLISHED' ? new Date() : null,
          routes: {
            create: {
              path: `/${slug}/`,
              entityType: 'POST',
              status: 'ACTIVE',
            },
          },
        },
      });

      if (categoryId) {
        await prisma.postCategory.create({
          data: {
            postId: post.id,
            categoryId: categoryId,
            isPrimary: true,
          },
        });
      }

      // Save processed hash
      processedHashes.push(article.urlHash);
      await prisma.systemSetting.upsert({
        where: { key: 'auto_post_processed_urls' },
        create: { key: 'auto_post_processed_urls', value: JSON.stringify(processedHashes) },
        update: { value: JSON.stringify(processedHashes) },
      });

      results.success++;
      results.createdPosts.push({ id: post.id, title: post.title, slug: post.slug });
    } catch (err) {
      results.errors.push(`Error en "${article.originalTitle}": ${err.message}`);
    }
  }

  return {
    success: true,
    ...results,
  };
}
