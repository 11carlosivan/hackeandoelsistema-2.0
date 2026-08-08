import { z } from 'zod';
import {
  getAutoPostConfig,
  processAndPublishAutoPost,
  saveAutoPostConfig,
} from '../services/auto-post.js';
import { noStoreHeaders } from '../utils/http.js';

const autoPostSettingsSchema = z.object({
  sources: z.string().max(8000).optional().default(''),
  aiProvider: z.enum(['gemini', 'openai']).default('gemini'),
  apiKey: z.string().max(500).optional().default(''),
  clearApiKey: z.boolean().optional().default(false),
  postStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  categoryIds: z.array(z.string().min(1).max(80)).max(20).optional().default([]),
});

const runSchema = z.object({
  limit: z.coerce.number().int().min(1).max(5).default(2),
});

export async function registerAutoPostRoutes(app) {
  app.get('/api/v1/cms/auto-post/settings', {
    preHandler: app.requirePermission('posts:manage'),
  }, async (request, reply) => {
    noStoreHeaders(reply);
    const settings = await getAutoPostConfig(app);

    return { data: { settings } };
  });

  app.post('/api/v1/cms/auto-post/settings', {
    preHandler: app.requirePermission('posts:manage'),
  }, async (request, reply) => {
    noStoreHeaders(reply);
    const parsed = autoPostSettingsSchema.safeParse(request.body);

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Configuracion de Auto-Post invalida.');
    }

    const settings = await saveAutoPostConfig(app, parsed.data);
    return { data: { settings, message: 'Configuracion guardada.' } };
  });

  app.post('/api/v1/cms/auto-post/run', {
    preHandler: app.requirePermission('posts:manage'),
  }, async (request, reply) => {
    noStoreHeaders(reply);
    const parsed = runSchema.safeParse(request.body || {});

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Payload de ejecucion invalido.');
    }

    const result = await processAndPublishAutoPost(app, parsed.data);
    return { data: result };
  });
}
