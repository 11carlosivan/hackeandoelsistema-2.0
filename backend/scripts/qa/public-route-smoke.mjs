// #!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { buildApp } from "../../api/app.js";
import { loadEnv } from "../../api/config/env.js";
import { disconnectPrismaClient, getPrismaClient } from "../../api/db/prisma.js";

const DEFAULT_REPORT_PATH = "../docs/qa/public-route-smoke.report.json";
const DEFAULT_LIMIT_PER_TYPE = 3;

export function entityEndpointForRoute(route) {
  if (!route?.entityType) {
    return null;
  }

  if (route.entityType === "POST") {
    return `/api/v1/public/posts/id/${route.entityId}`;
  }

  if (route.entityType === "PAGE" || route.entityType === "HOME") {
    return route.entityId ? `/api/v1/public/pages/id/${route.entityId}` : null;
  }

  if (route.entityType === "AUTHOR") {
    return `/api/v1/public/authors/id/${route.entityId}`;
  }

  if (route.entityType === "PRODUCT") {
    return `/api/v1/public/products/id/${route.entityId}`;
  }

  if (route.entityType === "WEB_STORY") {
    return `/api/v1/public/web-stories/id/${route.entityId}`;
  }

  if (route.entityType === "CATEGORY") {
    return `/api/v1/public/categories/id/${route.entityId}/posts`;
  }

  if (route.entityType === "TAG") {
    return `/api/v1/public/tags/id/${route.entityId}/posts`;
  }

  if (route.entityType === "STATIC" || route.entityType === "SEARCH") {
    return null;
  }

  return null;
}

export async function runPublicRouteSmoke({
  limitPerType = DEFAULT_LIMIT_PER_TYPE,
  out = DEFAULT_REPORT_PATH,
  app,
  prisma,
} = {}) {
  const ownPrisma = !prisma;
  const ownApp = !app;
  const client = prisma ?? getPrismaClient();
  const fastify = app ?? (await buildApp({ env: loadEnv(), prisma: client, logger: false }));

  try {
    const routes = await collectRoutesByType({ prisma: client, limitPerType });
    const checks = [];

    for (const route of routes) {
      checks.push(await checkRoute({ app: fastify, route }));
    }

    const failures = checks.filter((check) => check.status !== "PASS");
    const report = {
      generatedAt: new Date().toISOString(),
      mode: "public-route-smoke",
      limitPerType,
      checkedRoutes: checks.length,
      failures: failures.length,
      byEntityType: countBy(checks, "entityType"),
      checks,
    };
    const outputPath = writeJsonReport(out, report);

    return { report, outputPath };
  } finally {
    if (ownApp) {
      await fastify.close();
    }

    if (ownPrisma) {
      await disconnectPrismaClient();
    }
  }
}

async function collectRoutesByType({ prisma, limitPerType }) {
  const activeRoutes = await prisma.route.findMany({
    where: {
      status: "ACTIVE",
      includeInSitemap: true,
    },
    orderBy: [{ entityType: "asc" }, { path: "asc" }],
    select: {
      id: true,
      path: true,
      entityType: true,
      entityId: true,
      httpStatus: true,
    },
  });
  const counts = new Map();
  const selected = [];

  for (const route of activeRoutes) {
    const count = counts.get(route.entityType) ?? 0;

    if (count >= limitPerType) {
      continue;
    }

    selected.push(route);
    counts.set(route.entityType, count + 1);
  }

  return selected;
}

async function checkRoute({ app, route }) {
  const routeResponse = await app.inject({
    method: "GET",
    url: `/api/v1/public/route?path=${encodeURIComponent(route.path)}`,
  });
  const routePassed = routeResponse.statusCode === 200;
  const routeBody = safeJson(routeResponse);
  const entityEndpoint = entityEndpointForRoute(routeBody.data || route);

  if (!routePassed) {
    return {
      status: "FAIL",
      path: route.path,
      entityType: route.entityType,
      routeStatusCode: routeResponse.statusCode,
      entityEndpoint,
      reason: "route_lookup_failed",
    };
  }

  if (!entityEndpoint) {
    return {
      status: "PASS",
      path: route.path,
      entityType: route.entityType,
      routeStatusCode: routeResponse.statusCode,
      entityEndpoint: null,
    };
  }

  const entityResponse = await app.inject({
    method: "GET",
    url: entityEndpoint,
  });

  return {
    status: entityResponse.statusCode === 200 ? "PASS" : "FAIL",
    path: route.path,
    entityType: route.entityType,
    routeStatusCode: routeResponse.statusCode,
    entityEndpoint,
    entityStatusCode: entityResponse.statusCode,
    reason: entityResponse.statusCode === 200 ? null : "entity_lookup_failed",
  };
}

function countBy(items, key) {
  return items.reduce((accumulator, item) => {
    accumulator[item[key]] = (accumulator[item[key]] ?? 0) + 1;
    return accumulator;
  }, {});
}

function safeJson(response) {
  try {
    return response.json();
  } catch {
    return {};
  }
}

function writeJsonReport(outputPath, report) {
  const absoluteOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return absoluteOutputPath;
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_REPORT_PATH,
    limitPerType: DEFAULT_LIMIT_PER_TYPE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--limit-per-type") {
      args.limitPerType = Number(argv[index + 1]);
      index += 1;
    }
  }

  if (!Number.isInteger(args.limitPerType) || args.limitPerType <= 0) {
    throw new Error("--limit-per-type debe ser un entero positivo.");
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const { report, outputPath } = await runPublicRouteSmoke(args);

  console.log(`Smoke de rutas publicas generado en ${outputPath}`);
  console.log(`Rutas revisadas: ${report.checkedRoutes}`);
  console.log(`Fallos: ${report.failures}`);

  if (report.failures > 0) {
    process.exitCode = 1;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
