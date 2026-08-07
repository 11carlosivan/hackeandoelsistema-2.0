import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { AUTH_COOKIE_NAMES } from '../services/auth.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set(['/api/v1/auth/login', '/api/v1/auth/refresh']);
const INTERNAL_HOSTS = new Set(['backend', 'localhost', '127.0.0.1', '::1']);

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

function isPrivateAddress(address) {
  const value = String(address || '').replace(/^::ffff:/, '');

  return (
    value === '::1' ||
    value === '127.0.0.1' ||
    value.startsWith('10.') ||
    value.startsWith('172.16.') ||
    value.startsWith('172.17.') ||
    value.startsWith('172.18.') ||
    value.startsWith('172.19.') ||
    value.startsWith('172.20.') ||
    value.startsWith('172.21.') ||
    value.startsWith('172.22.') ||
    value.startsWith('172.23.') ||
    value.startsWith('172.24.') ||
    value.startsWith('172.25.') ||
    value.startsWith('172.26.') ||
    value.startsWith('172.27.') ||
    value.startsWith('172.28.') ||
    value.startsWith('172.29.') ||
    value.startsWith('172.30.') ||
    value.startsWith('172.31.') ||
    value.startsWith('192.168.')
  );
}

function isInternalServerRequest(request) {
  const host = String(request.headers.host || '').toLowerCase().split(':')[0];
  const forwardedFor = request.headers['x-forwarded-for'];
  const remoteAddress = request.socket?.remoteAddress || request.raw?.socket?.remoteAddress || request.ip;

  return INTERNAL_HOSTS.has(host) && !forwardedFor && isPrivateAddress(remoteAddress);
}

export async function registerSecurityPlugins(app, env) {
  await app.register(sensible);

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      reportOnly: env.SECURITY_CSP_REPORT_ONLY,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://hackeandoelsistema.net', 'https://image.hackeandoelsistema.net'],
        connectSrc: ["'self'", ...env.corsOrigins],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
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
    allowList: (request) => isInternalServerRequest(request),
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
