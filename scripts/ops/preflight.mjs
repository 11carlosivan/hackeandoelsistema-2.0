#!/usr/bin/env node
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { buildApp } from '../../api/app.js';
import { loadEnv } from '../../api/config/env.js';

const REPORT_PATH = path.resolve('docs/operations/preflight.report.json');

export function createCheck(name, status, details = {}) {
  return {
    name,
    status,
    details,
  };
}

export function summarizeChecks(checks) {
  const failures = checks.filter((check) => check.status === 'FAIL').length;
  const warnings = checks.filter((check) => check.status === 'WARN').length;

  return {
    status: failures > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS',
    failures,
    warnings,
    passed: checks.filter((check) => check.status === 'PASS').length,
  };
}

function safeJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function summarizeEndpointBody(url, body) {
  if (!body) {
    return null;
  }

  if (url === '/api/v1/public/site-summary') {
    return {
      counts: body.data?.counts,
      latestImportRun: body.data?.latestImportRun
        ? {
            id: body.data.latestImportRun.id,
            source: body.data.latestImportRun.source,
            status: body.data.latestImportRun.status,
            startedAt: body.data.latestImportRun.startedAt,
            finishedAt: body.data.latestImportRun.finishedAt,
          }
        : null,
      recentPosts: body.data?.recentPosts?.length ?? 0,
    };
  }

  if (url.startsWith('/api/v1/public/posts')) {
    return {
      meta: body.meta,
      firstPost: body.data?.[0]
        ? {
            id: body.data[0].id,
            slug: body.data[0].slug,
            title: body.data[0].title,
            canonicalPath: body.data[0].canonicalPath,
          }
        : null,
    };
  }

  if (url === '/api/v1/public/sitemap-routes') {
    return {
      total: body.data?.length ?? 0,
      samples: (body.data || []).slice(0, 5).map((route) => ({
        path: route.path,
        entityType: route.entityType,
        lastmodAt: route.lastmodAt,
      })),
    };
  }

  return body;
}

async function checkEndpoint(app, { name, method = 'GET', url, expectedStatus = 200 }) {
  try {
    const response = await app.inject({ method, url });
    const body = safeJson(response);

    return createCheck(response.statusCode === expectedStatus ? name : `${name} (${response.statusCode})`, response.statusCode === expectedStatus ? 'PASS' : 'FAIL', {
      method,
      url,
      statusCode: response.statusCode,
      body: summarizeEndpointBody(url, body),
    });
  } catch (error) {
    return createCheck(name, 'FAIL', {
      method,
      url,
      error: error.message,
    });
  }
}

async function checkDatabase(prisma) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return createCheck('database:connection', 'PASS', { provider: 'postgresql' });
  } catch (error) {
    return createCheck('database:connection', 'FAIL', { error: error.message });
  }
}

async function checkCoreCounts(prisma) {
  try {
    const [posts, pages, routes, sitemapRoutes, media, categories, users, latestImportRun] = await Promise.all([
      prisma.post.count({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' } }),
      prisma.page.count(),
      prisma.route.count(),
      prisma.route.count({ where: { status: 'ACTIVE', includeInSitemap: true } }),
      prisma.mediaAsset.count(),
      prisma.category.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.importRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);

    const missing = [];
    if (posts < 1) missing.push('posts');
    if (routes < 1) missing.push('routes');
    if (sitemapRoutes < 1) missing.push('sitemapRoutes');
    if (categories < 1) missing.push('categories');
    if (!latestImportRun) missing.push('latestImportRun');

    return createCheck('database:core-counts', missing.length > 0 ? 'FAIL' : 'PASS', {
      posts,
      pages,
      routes,
      sitemapRoutes,
      media,
      categories,
      activeUsers: users,
      latestImportRun: latestImportRun
        ? {
            id: latestImportRun.id,
            source: latestImportRun.source,
            status: latestImportRun.status,
            startedAt: latestImportRun.startedAt,
            finishedAt: latestImportRun.finishedAt,
            stats: latestImportRun.stats,
          }
        : null,
      missing,
    });
  } catch (error) {
    return createCheck('database:core-counts', 'FAIL', { error: error.message });
  }
}

async function checkOptionalAdminLogin(app) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return createCheck('auth:admin-login', 'WARN', {
      reason: 'ADMIN_EMAIL y ADMIN_PASSWORD no estan definidos; login protegido no probado.',
    });
  }

  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    const body = safeJson(login);
    const accessToken = body?.data?.accessToken;

    if (login.statusCode !== 200 || !accessToken) {
      return createCheck('auth:admin-login', 'FAIL', {
        statusCode: login.statusCode,
        body,
      });
    }

    const adminCheck = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/admin-check',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    return createCheck('auth:admin-login', adminCheck.statusCode === 200 ? 'PASS' : 'FAIL', {
      loginStatusCode: login.statusCode,
      adminCheckStatusCode: adminCheck.statusCode,
      user: {
        id: body.data.user?.id,
        username: body.data.user?.username,
        displayName: body.data.user?.displayName,
        roles: body.data.user?.roles,
      },
    });
  } catch (error) {
    return createCheck('auth:admin-login', 'FAIL', { error: error.message });
  }
}

export async function runPreflight() {
  const checks = [];
  let env;
  const prisma = new PrismaClient({ log: ['error', 'warn'] });
  let app;

  try {
    env = loadEnv();
    checks.push(createCheck('env:api', 'PASS', {
      nodeEnv: env.NODE_ENV,
      webOrigin: env.WEB_ORIGIN,
      apiHost: env.API_HOST,
      apiPort: env.API_PORT,
      authCookieSecure: env.AUTH_COOKIE_SECURE,
      mediaUploadDir: env.MEDIA_UPLOAD_DIR,
      mediaPublicBasePath: env.MEDIA_PUBLIC_BASE_PATH,
    }));
  } catch (error) {
    checks.push(createCheck('env:api', 'FAIL', { error: error.message }));
  }

  checks.push(await checkDatabase(prisma));
  checks.push(await checkCoreCounts(prisma));

  if (env) {
    try {
      app = await buildApp({ env, prisma, logger: false });
      checks.push(await checkEndpoint(app, { name: 'api:health', url: '/health' }));
      checks.push(await checkEndpoint(app, { name: 'api:ready', url: '/ready' }));
      checks.push(await checkEndpoint(app, { name: 'api:public-summary', url: '/api/v1/public/site-summary' }));
      checks.push(await checkEndpoint(app, { name: 'api:public-posts', url: '/api/v1/public/posts?page=1&limit=1' }));
      checks.push(await checkEndpoint(app, { name: 'api:sitemap-routes', url: '/api/v1/public/sitemap-routes' }));
      checks.push(await checkOptionalAdminLogin(app));
    } catch (error) {
      checks.push(createCheck('api:bootstrap', 'FAIL', { error: error.message }));
    }
  }

  const summary = summarizeChecks(checks);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'ops-preflight',
    summary,
    checks,
  };

  if (app) {
    await app.close();
  }
  await prisma.$disconnect();

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreflight()
    .then((report) => {
      console.log(`Preflight generado en ${REPORT_PATH}`);
      console.log(`Estado: ${report.summary.status}`);
      console.log(`Checks OK: ${report.summary.passed}`);
      console.log(`Warnings: ${report.summary.warnings}`);
      console.log(`Fallos: ${report.summary.failures}`);
      process.exitCode = report.summary.failures > 0 ? 1 : 0;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
