import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'hes_access_token';
const REFRESH_COOKIE = 'hes_refresh_token';
const CMS_ROLES = new Set(['ADMIN', 'EDITOR']);
const PUBLIC_ROUTE_SKIP_PREFIXES = ['/api/', '/_next/', '/cms/'];

function redirectToLogin(request) {
  const loginUrl = new URL('/iniciar-sesion', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function getProxyApiBaseUrl() {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).replace(/\/+$/g, '');
}

async function verifyCmsAccessToken(token, secret) {
  if (!token || !secret || secret.length < 32) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'hackeando-api',
      audience: 'hackeando-cms',
    });

    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    if (!roles.some((role) => CMS_ROLES.has(role))) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function forwardSetCookieHeaders(source, target) {
  if (typeof source.headers.getSetCookie === 'function') {
    for (const cookie of source.headers.getSetCookie()) {
      target.headers.append('set-cookie', cookie);
    }
    return;
  }

  const setCookie = source.headers.get('set-cookie');

  if (setCookie) {
    target.headers.append('set-cookie', setCookie);
  }
}

export function replaceRequestCookie(cookieHeader, name, value) {
  const cookies = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith(`${name}=`));

  cookies.push(`${name}=${value}`);

  return cookies.join('; ');
}

async function tryRefreshCmsSession(request, secret) {
  const apiBaseUrl = getProxyApiBaseUrl();
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!apiBaseUrl || !refreshToken) {
    return null;
  }

  try {
    const refreshResponse = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: '{}',
      cache: 'no-store',
    });

    if (!refreshResponse.ok) {
      return null;
    }

    const body = await refreshResponse.json();
    const nextAccessToken = body?.data?.accessToken;
    const payload = await verifyCmsAccessToken(nextAccessToken, secret);

    if (!payload) {
      return null;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      'cookie',
      replaceRequestCookie(request.headers.get('cookie'), ACCESS_COOKIE, nextAccessToken),
    );

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    forwardSetCookieHeaders(refreshResponse, response);
    return response;
  } catch {
    return null;
  }
}

export function shouldReturnGoneResponse(route) {
  return route?.status === 'GONE' && route?.httpStatus === 410;
}

export function publicRouteLookupFetchOptions() {
  return {
    headers: { accept: 'application/json' },
    next: { revalidate: 120 },
  };
}

async function authorizeCmsRequest(request) {
  const secret = process.env.AUTH_JWT_SECRET;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const payload = await verifyCmsAccessToken(token, secret);

  if (payload) {
    return NextResponse.next();
  }

  return (await tryRefreshCmsSession(request, secret)) || redirectToLogin(request);
}

function shouldCheckPublicRoute(request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return false;
  }

  const pathname = request.nextUrl.pathname;

  if (PUBLIC_ROUTE_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  return !/\.[a-z0-9]+$/i.test(pathname);
}

async function maybeGoneResponse(request) {
  const apiBaseUrl = getProxyApiBaseUrl();

  if (!apiBaseUrl || !shouldCheckPublicRoute(request)) {
    return null;
  }

  const routePath = request.nextUrl.pathname === '/' ? '/' : `${request.nextUrl.pathname.replace(/\/+$/g, '')}/`;

  try {
    const routeResponse = await fetch(`${apiBaseUrl}/api/v1/public/route?path=${encodeURIComponent(routePath)}`, {
      ...publicRouteLookupFetchOptions(),
    });

    if (!routeResponse.ok) {
      return null;
    }

    const body = await routeResponse.json();
    const route = body?.data;

    if (!shouldReturnGoneResponse(route)) {
      return null;
    }

    return new NextResponse(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>Contenido retirado</title></head><body><h1>Contenido retirado</h1></body></html>',
      {
        status: 410,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=300, stale-while-revalidate=1800',
          'x-robots-tag': 'noindex, follow',
        },
      },
    );
  } catch {
    return null;
  }
}

export async function proxy(request) {
  if (request.nextUrl.pathname === '/cms' || request.nextUrl.pathname.startsWith('/cms/')) {
    return authorizeCmsRequest(request);
  }

  return (await maybeGoneResponse(request)) || NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|icons.svg|isotipo.png|logo.png|logo_texto.png).*)'],
};
