import 'dotenv/config';
import { z } from 'zod';

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_ORIGIN: z.string().url().default('http://127.0.0.1:3000'),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET must be at least 32 characters'),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_COOKIE_SECURE: booleanEnv.default(true),
  AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  AUTH_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  SECURITY_CSP_REPORT_ONLY: booleanEnv.default(false),
  MEDIA_UPLOAD_DIR: z.string().min(1).default('../frontend/public/uploads/cms'),
  MEDIA_PUBLIC_BASE_PATH: z.string().min(1).default('/uploads/cms'),
  MEDIA_MAX_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(25 * 1024 * 1024).default(8 * 1024 * 1024),
});

export function loadEnv(overrides = {}) {
  const rawEnv = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse({
    ...rawEnv,
    API_PORT: rawEnv.API_PORT ?? rawEnv.PORT,
  });

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
