import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().url().default('http://127.0.0.1:3000'),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
});

export function loadEnv(overrides = {}) {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid API environment: ${message}`);
  }

  const corsOrigins = parsed.data.CORS_ORIGINS
    ? parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [parsed.data.WEB_ORIGIN];

  return {
    ...parsed.data,
    corsOrigins,
    isProduction: parsed.data.NODE_ENV === 'production',
  };
}
