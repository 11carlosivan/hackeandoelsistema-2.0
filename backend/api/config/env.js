import 'dotenv/config';
import { z } from 'zod';

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;

  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}, z.boolean());

const optionalUrlEnv = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().url().optional());

const optionalStringEnv = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().optional());

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
  MEDIA_STORAGE_DRIVER: z.enum(['local', 'remote_php']).default('local'),
  MEDIA_UPLOAD_DIR: z.string().min(1).default('../frontend/public/uploads/cms'),
  MEDIA_PUBLIC_BASE_PATH: z.string().min(1).default('/uploads/cms'),
  MEDIA_MAX_FILE_SIZE_BYTES: z.coerce.number().int().min(1024).max(25 * 1024 * 1024).default(8 * 1024 * 1024),
  MEDIA_REMOTE_UPLOAD_URL: optionalUrlEnv,
  MEDIA_REMOTE_PUBLIC_BASE_URL: optionalUrlEnv,
  MEDIA_REMOTE_SECRET: optionalStringEnv,
  MEDIA_REMOTE_FILE_FIELD: z.string().min(1).default('file'),
  MEDIA_REMOTE_AUTH_MODE: z.enum(['signed', 'bearer']).default('signed'),
  MEDIA_REMOTE_RESPONSE_MODE: z.enum(['media_object', 'simple_url']).default('media_object'),
  MEDIA_REMOTE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(15000),
  BANAHOC_API_URL: optionalUrlEnv,
  BANAHOC_UPLOAD_TOKEN: optionalStringEnv,
  LEGACY_MEDIA_BASE_URL: optionalUrlEnv,
  WEATHER_API_URL: optionalUrlEnv,
  EXCHANGE_RATE_SOURCE_URL: optionalUrlEnv,
  PUBLIC_STATS_CACHE_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  PUBLIC_STATS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(15000).default(5000),
}).superRefine((env, ctx) => {
  if (env.MEDIA_STORAGE_DRIVER !== 'remote_php') {
    return;
  }

  if (!env.MEDIA_REMOTE_UPLOAD_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MEDIA_REMOTE_UPLOAD_URL'],
      message: 'MEDIA_REMOTE_UPLOAD_URL is required when MEDIA_STORAGE_DRIVER=remote_php',
    });
  }

  if (!env.MEDIA_REMOTE_PUBLIC_BASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MEDIA_REMOTE_PUBLIC_BASE_URL'],
      message: 'MEDIA_REMOTE_PUBLIC_BASE_URL is required when MEDIA_STORAGE_DRIVER=remote_php',
    });
  }

  if (!env.MEDIA_REMOTE_SECRET || env.MEDIA_REMOTE_SECRET.length < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MEDIA_REMOTE_SECRET'],
      message: 'MEDIA_REMOTE_SECRET must be at least 32 characters when MEDIA_STORAGE_DRIVER=remote_php',
    });
  }
});

export function loadEnv(overrides = {}) {
  const rawEnv = { ...process.env, ...overrides };
  const mediaRemoteUploadUrl = rawEnv.MEDIA_REMOTE_UPLOAD_URL || rawEnv.BANAHOC_API_URL;
  const mediaRemoteSecret = rawEnv.MEDIA_REMOTE_SECRET || rawEnv.BANAHOC_UPLOAD_TOKEN;
  const parsed = envSchema.safeParse({
    ...rawEnv,
    API_PORT: rawEnv.API_PORT ?? rawEnv.PORT,
    MEDIA_REMOTE_UPLOAD_URL: mediaRemoteUploadUrl,
    MEDIA_REMOTE_SECRET: mediaRemoteSecret,
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
