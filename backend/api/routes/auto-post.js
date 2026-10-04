import { z } from 'zod';
import {
  getAutoPostConfig,
  processAndPublishAutoPost,
  saveAutoPostConfig,
  toggleAutoPostEnabled,
  startAutoPostScheduler,
} from '../services/auto-post.js';
import { noStoreHeaders } from '../utils/http.js';

function normalizeOptionalString(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeEnum(value, fallback) {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toUpperCase() : fallback;
}

function normalizeCategoryIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (item && typeof item === 'object') {
        return item.id;
      }

      return item;
    })
    .map(normalizeOptionalString)
    .filter(Boolean);
}

function validationDetails(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || 'payload',
    message: issue.message,
  }));
}

const autoPostSettingsSchema = z.object({
  isEnabled: z.coerce.boolean().optional(),
  intervalMinutes: z.coerce.number().int().min(5).max(1440).optional(),
  sources: z.preprocess(normalizeOptionalString, z.string().max(20000)).default(''),
  aiProvider: z.preprocess((value) => normalizeOptionalString(value) || 'gemini', z.enum(['gemini', 'openai'])),
  apiKey: z.preprocess(normalizeOptionalString, z.string().max(4096)).default(''),
  clearApiKey: z.coerce.boolean().optional().default(false),
  postStatus: z.preprocess((value) => normalizeEnum(value, 'DRAFT'), z.enum(['DRAFT', 'PUBLISHED'])),
  categoryIds: z.preprocess(
    normalizeCategoryIds,
    z.array(z.string().min(1).max(80)).max(100),
  ).default([]),
});

const toggleSchema = z.object({
  isEnabled: z.coerce.boolean().optional(),
});

const runSchema = z.object({
  limit: z.coerce.number().int().min(1).max(5).default(2),
});

export async function registerAutoPostRoutes(app) {
  // Start background auto-post scheduler loop
  startAutoPostScheduler(app);

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
      reply.code(400);
      return {
        error: 'Bad Request',
        message: 'Configuracion de Auto-Post invalida.',
        details: validationDetails(parsed.error),
      };
    }

    const settings = await saveAutoPostConfig(app, parsed.data);
    return { data: { settings, message: 'Configuracion guardada.' } };
  });

  app.post('/api/v1/cms/auto-post/toggle', {
    preHandler: app.requirePermission('posts:manage'),
  }, async (request, reply) => {
    noStoreHeaders(reply);
    const parsed = toggleSchema.safeParse(request.body || {});

    if (!parsed.success) {
      throw app.httpErrors.badRequest('Payload de toggle invalido.');
    }

    const settings = await toggleAutoPostEnabled(app, parsed.data.isEnabled);
    return {
      data: {
        settings,
        message: settings.isEnabled
          ? 'Auto-Post encendido: la IA buscará y publicará noticias automáticamente.'
          : 'Auto-Post apagado: la automatización se ha pausado.',
      },
    };
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

