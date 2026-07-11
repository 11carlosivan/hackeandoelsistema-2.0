import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const CMS_ROLES = new Set(['ADMIN', 'EDITOR']);

function redirectToLogin(request) {
  const loginUrl = new URL('/iniciar-sesion', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request) {
  const token = request.cookies.get('hes_access_token')?.value;
  const secret = process.env.AUTH_JWT_SECRET;

  if (!token || !secret || secret.length < 32) {
    return redirectToLogin(request);
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'hackeando-api',
      audience: 'hackeando-cms',
    });
    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    if (!roles.some((role) => CMS_ROLES.has(role))) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ['/cms/:path*'],
};
