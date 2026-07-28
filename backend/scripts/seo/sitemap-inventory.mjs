// #!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const DEFAULT_SITEMAP_URL = "https://hackeandoelsistema.net/sitemap.xml";
const DEFAULT_REPORT_PATH = "../docs/migration/sitemap-inventory.report.json";
const DISCOVERED_FROM = "wordpress-sitemap";

export async function runSitemapInventory({
  sitemapUrl = DEFAULT_SITEMAP_URL,
  out = DEFAULT_REPORT_PATH,
  write = false,
  compareDb = false,
  prisma,
  fetchImpl = fetch,
}) {
  const crawled = await crawlSitemaps({ sitemapUrl, fetchImpl });
  const baseReport = buildSitemapInventoryReport({ sitemapUrl, crawled });

  if (!write && !compareDb) {
    const outputPath = writeJsonReport(out, {
      ...baseReport,
      mode: "sitemap-dry-run",
      writesDatabase: false,
    });

    return { report: baseReport, outputPath };
  }

  if (!process.env.DATABASE_URL && !prisma) {
    throw new Error("DATABASE_URL es obligatorio para --write o --compare-db.");
  }

  const client = prisma ?? new PrismaClient({ log: ["error", "warn"] });
  const ownsClient = !prisma;

  try {
    const comparison = await compareUrlsWithRoutes({ prisma: client, urls: crawled.urls });
    const writeStats = write ? await writeUrlInventory({ prisma: client, urls: crawled.urls, comparison }) : null;
    const report = {
      ...baseReport,
      mode: write ? "sitemap-write" : "sitemap-compare",
      writesDatabase: write,
      database: {
        matchedRoutes: comparison.matchedRoutes,
        missingRoutes: comparison.missingRoutes,
        missingSamples: comparison.missingSamples,
        written: writeStats?.written ?? 0,
      },
    };
    const outputPath = writeJsonReport(out, report);

    return { report, outputPath };
  } finally {
    if (ownsClient) {
      await client.$disconnect();
    }
  }
}

export async function crawlSitemaps({ sitemapUrl, fetchImpl = fetch, maxDepth = 3 }) {
  const queue = [{ url: sitemapUrl, depth: 0 }];
  const visited = new Set();
  const sitemaps = [];
  const urlsByLoc = new Map();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current.url) || current.depth > maxDepth) {
      continue;
    }

    visited.add(current.url);
    const xml = await fetchText(current.url, fetchImpl);
    const parsed = parseSitemapXml(xml);
    sitemaps.push({
      url: current.url,
      type: parsed.type,
      entries: parsed.type === "index" ? parsed.sitemaps.length : parsed.urls.length,
    });

    for (const child of parsed.sitemaps) {
      queue.push({ url: child.loc, depth: current.depth + 1 });
    }

    for (const item of parsed.urls) {
      if (!urlsByLoc.has(item.loc)) {
        urlsByLoc.set(item.loc, {
          url: item.loc,
          path: pathFromUrl(item.loc),
          lastmod: item.lastmod,
          sitemap: current.url,
          inferredEntityType: inferEntityTypeFromPath(pathFromUrl(item.loc)),
        });
      }
    }
  }

  return {
    sitemaps,
    urls: [...urlsByLoc.values()].filter((item) => item.path),
  };
}

export function parseSitemapXml(xml) {
  const cleanXml = String(xml || "");
  const isIndex = /<sitemapindex[\s>]/i.test(cleanXml);
  const sitemapBlocks = extractBlocks(cleanXml, "sitemap");
  const urlBlocks = extractBlocks(cleanXml, "url");

  return {
    type: isIndex ? "index" : "urlset",
    sitemaps: sitemapBlocks.map(parseSitemapEntry).filter((entry) => entry.loc),
    urls: urlBlocks.map(parseSitemapEntry).filter((entry) => entry.loc),
  };
}

export function inferEntityTypeFromPath(value) {
  const routePath = normalizePath(value);

  if (routePath === "/") {
    return "HOME";
  }

  if (routePath.startsWith("/category/")) {
    return "CATEGORY";
  }

  if (routePath.startsWith("/tag/")) {
    return "TAG";
  }

  if (routePath.startsWith("/author/")) {
    return "AUTHOR";
  }

  if (routePath.startsWith("/producto/")) {
    return "PRODUCT";
  }

  if (routePath.startsWith("/web-stories/")) {
    return "WEB_STORY";
  }

  return "POST";
}

export function normalizePath(value) {
  if (!value) {
    return null;
  }

  const rawPath = String(value).split("#")[0].split("?")[0] || "/";
  const prefixed = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = prefixed.replace(/\/{2,}/g, "/");

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function buildSitemapInventoryReport({ sitemapUrl, crawled }) {
  const byInferredType = crawled.urls.reduce((accumulator, item) => {
    accumulator[item.inferredEntityType] = (accumulator[item.inferredEntityType] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    sitemapUrl,
    sitemapsCrawled: crawled.sitemaps.length,
    urlsFound: crawled.urls.length,
    byInferredType,
    sitemapSamples: crawled.sitemaps.slice(0, 20),
    urlSamples: crawled.urls.slice(0, 25),
  };
}

async function compareUrlsWithRoutes({ prisma, urls }) {
  const paths = urls.map((item) => item.path).filter(Boolean);
  const routes = await prisma.route.findMany({
    where: { path: { in: paths } },
    select: {
      path: true,
      entityType: true,
      entityId: true,
      httpStatus: true,
    },
  });
  const routeByPath = new Map(routes.map((route) => [route.path, route]));
  const missing = urls.filter((item) => !routeByPath.has(item.path));

  return {
    routeByPath,
    matchedRoutes: urls.length - missing.length,
    missingRoutes: missing.length,
    missingSamples: missing.slice(0, 25),
  };
}

async function writeUrlInventory({ prisma, urls, comparison }) {
  const now = new Date();
  let written = 0;

  for (const item of urls) {
    const route = comparison.routeByPath.get(item.path);

    await prisma.urlInventory.upsert({
      where: { url: item.url },
      create: {
        url: item.url,
        path: item.path,
        discoveredFrom: DISCOVERED_FROM,
        entityType: route?.entityType ?? item.inferredEntityType,
        entityId: route?.entityId ?? null,
        httpStatus: route?.httpStatus ?? null,
        canonicalUrl: item.url,
        lastSeenAt: now,
        migratedAt: route ? now : null,
        notes: route ? "matched-route" : "missing-route",
      },
      update: {
        path: item.path,
        discoveredFrom: DISCOVERED_FROM,
        entityType: route?.entityType ?? item.inferredEntityType,
        entityId: route?.entityId ?? null,
        httpStatus: route?.httpStatus ?? null,
        canonicalUrl: item.url,
        lastSeenAt: now,
        migratedAt: route ? now : null,
        notes: route ? "matched-route" : "missing-route",
      },
    });
    written += 1;
  }

  return { written };
}

async function fetchText(url, fetchImpl) {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`No se pudo leer sitemap ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function parseSitemapEntry(block) {
  return {
    loc: decodeXml(extractTag(block, "loc")),
    lastmod: decodeXml(extractTag(block, "lastmod")),
  };
}

function extractBlocks(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${tagName}[\\s\\S]*?<\\/${tagName}>`, "gi"))].map((match) => match[0]);
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));

  return match ? match[1].trim() : null;
}

function pathFromUrl(value) {
  try {
    return normalizePath(new URL(value).pathname);
  } catch {
    return null;
  }
}

function decodeXml(value) {
  if (!value) {
    return null;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function writeJsonReport(outputPath, report) {
  const absoluteOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return absoluteOutputPath;
}

function parseArgs(argv) {
  const args = {
    sitemap: DEFAULT_SITEMAP_URL,
    out: DEFAULT_REPORT_PATH,
    write: false,
    compareDb: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--sitemap") {
      args.sitemap = argv[index + 1];
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--compare-db") {
      args.compareDb = true;
    }
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const { report, outputPath } = await runSitemapInventory({
    sitemapUrl: args.sitemap,
    out: args.out,
    write: args.write,
    compareDb: args.compareDb,
  });

  console.log(`Inventario sitemap generado en ${outputPath}`);
  console.log(`Sitemaps: ${report.sitemapsCrawled}`);
  console.log(`URLs: ${report.urlsFound}`);

  if (report.database) {
    console.log(`Routes encontradas: ${report.database.matchedRoutes}`);
    console.log(`Routes faltantes: ${report.database.missingRoutes}`);
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
