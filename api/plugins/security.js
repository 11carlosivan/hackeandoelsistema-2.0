import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { AUTH_COOKIE_NAMES } from '../services/auth.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set(['/api/v1/auth/login', '/api/v1/auth/refresh']);

function getCookieValue(cookieHeader, name) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function hasCookieAuth(request) {
  const cookieHeader = request.headers.cookie;

  return Boolean(
    getCookieValue(cookieHeader, AUTH_COOKIE_NAMES.access) ||
      getCookieValue(cookieHeader, AUTH_COOKIE_NAMES.refresh),
  );
}

function hasBearerAuth(request) {
  return String(request.headers.authorization || '').toLowerCase().startsWith('bearer ');
}

function csrfTokensMatch(cookieToken, headerToken) {
  return Boolean(cookieToken && headerToken && cookieToken.length >= 32 && cookieToken === headerToken);
}

export async function registerSecurityPlugins(app, env) {
  await app.register(sensible);

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, env.corsOrigins.includes(origin));
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    hook: 'onRequest',
  });

  app.addHook('preHandler', async (request) => {
    if (!UNSAFE_METHODS.has(request.method) || CSRF_EXEMPT_PATHS.has(request.url.split('?')[0])) {
      return;
    }

    if (!hasCookieAuth(request) || hasBearerAuth(request)) {
      return;
    }

    const cookieToken = getCookieValue(request.headers.cookie, AUTH_COOKIE_NAMES.csrf);
    const headerToken = request.headers['x-csrf-token'];

    if (!csrfTokensMatch(cookieToken, Array.isArray(headerToken) ? headerToken[0] : headerToken)) {
      throw app.httpErrors.forbidden('Invalid CSRF token');
    }
  });
}
