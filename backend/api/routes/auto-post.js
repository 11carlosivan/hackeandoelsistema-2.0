import { z } from 'zod';
import { processAndPublishAutoPost } from '../services/auto-post.js';
import { noStoreHeaders } from '../utils/http.js';

const autoPostSettingsSchema = z.object({
  sources: z.string().optional().default(''),
  aiProvider: z.enum(['gemini', 'openai']).default('gemini'),
  apiKey: z.string().optional().default(''),
  postStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  categoryIds: z.array(z.string()).optional().default([]),
});

export async function registerAutoPostRoutes(app) {
  // GET settings
  app.get('/api/v1/cms/auto-post/settings', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    noStoreHeaders(reply);

    const rows = await app.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'auto_post_sources',
            'auto_post_ai_provider',
            'auto_post_ai_api_key',
            'auto_post_status',
            'auto_post_categories',
            'auto_post_processed_urls',
          ],
        },
      },
    });

    const settings = {
      sources: '',
      aiProvider: 'gemini',
      apiKey: '',
      postStatus: 'DRAFT',
      categoryIds: [],
      processedCount: 0,
    };

    rows.forEach(row => {
      if (row.key === 'auto_post_sources') settings.sources = row.value;
      if (row.key === 'auto_post_ai_provider') settings.aiProvider = row.value;
      if (row.key === 'auto_post_ai_api_key') settings.apiKey = row.value;
      if (row.key === 'auto_post_status') settings.postStatus = row.value;
      if (row.key === 'auto_post_categories') {
        try { settings.categoryIds = JSON.parse(row.value); } catch (_) {}
      }
      if (row.key === 'auto_post_processed_urls') {
        try { settings.processedCount = JSON.parse(row.value).length; } catch (_) {}
      }
    });

    return { data: { settings } };
  });

  // POST save settings
  app.post('/api/v1/cms/auto-post/settings', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    noStoreHeaders(reply);
    const body = autoPostSettingsSchema.safeParse(request.body);

    if (!body.success) {
      throw app.httpErrors.badRequest('Payload de configuración inválido');
    }

    const { sources, aiProvider, apiKey, postStatus, categoryIds } = body.data;

    const upserts = [
      app.prisma.systemSetting.upsert({
        where: { key: 'auto_post_sources' },
        create: { key: 'auto_post_sources', value: sources },
        update: { value: sources },
      }),
      app.prisma.systemSetting.upsert({
        where: { key: 'auto_post_ai_provider' },
        create: { key: 'auto_post_ai_provider', value: aiProvider },
        update: { value: aiProvider },
      }),
      app.prisma.systemSetting.upsert({
        where: { key: 'auto_post_ai_api_key' },
        create: { key: 'auto_post_ai_api_key', value: apiKey },
        update: { value: apiKey },
      }),
      app.prisma.systemSetting.upsert({
        where: { key: 'auto_post_status' },
        create: { key: 'auto_post_status', value: postStatus },
        update: { value: postStatus },
      }),
      app.prisma.systemSetting.upsert({
        where: { key: 'auto_post_categories' },
        create: { key: 'auto_post_categories', value: JSON.stringify(categoryIds) },
        update: { value: JSON.stringify(categoryIds) },
      }),
    ];

    await Promise.all(upserts);

    return { data: { message: 'Configuración de Auto-Post AI guardada correctamente.' } };
  });

  // POST run auto post execution
  app.post('/api/v1/cms/auto-post/run', { preHandler: app.requirePermission('posts:manage') }, async (request, reply) => {
    noStoreHeaders(reply);

    const limit = Math.min(5, Math.max(1, parseInt(request.body?.limit || 2, 10)));
    const result = await processAndPublishAutoPost(app, { limit });

    return { data: result };
  });
}
