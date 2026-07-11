#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const PUBLIC_OPTIONS = new Set([
  "siteurl",
  "home",
  "blogname",
  "permalink_structure",
  "category_base",
  "tag_base",
  "timezone_string",
  "date_format",
  "time_format",
  "start_of_week",
  "default_category",
  "show_on_front",
  "page_on_front",
  "page_for_posts",
]);

const POST_FIELD_INDEXES = new Set([0, 2, 3, 7, 11, 14, 15, 17, 18, 20, 21, 22]);
const OPTION_FIELD_INDEXES = new Set([1, 2]);
const DEFAULT_REPORT_PATH = "docs/migration/wp-dump-inventory.report.json";

export function decodeSqlValue(rawValue) {
  const value = rawValue.trim();

  if (value.toUpperCase() === "NULL") {
    return null;
  }

  if (!value.startsWith("'") || !value.endsWith("'")) {
    return value;
  }

  const body = value.slice(1, -1);
  let decoded = "";

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char !== "\\") {
      decoded += char;
      continue;
    }

    const next = body[index + 1];
    index += 1;

    if (next === undefined) {
      decoded += "\\";
      continue;
    }

    decoded += {
      0: "\0",
      b: "\b",
      n: "\n",
      r: "\r",
      t: "\t",
      Z: "\u001a",
      "\\": "\\",
      "'": "'",
      '"': '"',
    }[next] ?? next;
  }

  return decoded;
}

export function* iterateSqlTuples(valuesSql) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let tupleStart = -1;

  for (let index = 0; index < valuesSql.length; index += 1) {
    const char = valuesSql[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        inString = false;
      }

      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === "(") {
      if (depth === 0) {
        tupleStart = index + 1;
      }

      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;

      if (depth === 0 && tupleStart >= 0) {
        yield valuesSql.slice(tupleStart, index);
        tupleStart = -1;
      }
    }
  }
}

export function pickSqlFields(tupleSql, wantedIndexes) {
  const fields = {};
  let inString = false;
  let escaped = false;
  let fieldIndex = 0;
  let fieldStart = 0;

  const captureField = (endIndex) => {
    if (wantedIndexes.has(fieldIndex)) {
      fields[fieldIndex] = decodeSqlValue(tupleSql.slice(fieldStart, endIndex));
    }

    fieldIndex += 1;
    fieldStart = endIndex + 1;
  };

  for (let index = 0; index < tupleSql.length; index += 1) {
    const char = tupleSql[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        inString = false;
      }

      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ",") {
      captureField(index);
    }
  }

  captureField(tupleSql.length);
  return fields;
}

export function parseInsertStatement(statement) {
  const match = statement.match(/^INSERT INTO `([^`]+)`(?:\s*\((?:`[^`]+`(?:,\s*)?)+\))?\s+VALUES\s*(.+);$/s);

  if (!match) {
    return null;
  }

  return {
    table: match[1],
    valuesSql: match[2],
  };
}

export function canonicalPathForPost(post, permalinkStructure) {
  if (!post.slug) {
    return null;
  }

  if (post.type === "post" && permalinkStructure === "/%postname%/") {
    return `/${post.slug}/`;
  }

  if (post.type === "page") {
    return post.parentId === "0" ? `/${post.slug}/` : null;
  }

  if (post.type === "product") {
    return `/producto/${post.slug}/`;
  }

  if (post.type === "web-story") {
    return `/web-stories/${post.slug}/`;
  }

  return null;
}

export async function inspectDump(dumpPath) {
  const absoluteDumpPath = path.resolve(dumpPath);

  if (!fs.existsSync(absoluteDumpPath)) {
    throw new Error(`No existe el dump: ${absoluteDumpPath}`);
  }

  const stats = fs.statSync(absoluteDumpPath);
  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      fileName: path.basename(absoluteDumpPath),
      sizeBytes: stats.size,
    },
    wordpress: {
      tablePrefix: null,
      options: {},
      tables: {},
      permalinkPolicy: null,
    },
    content: {
      countsByTypeAndStatus: {},
      publishedCanonicalSamples: {},
      totalRowsInPostsTable: 0,
    },
    seo: {
      canonicalBaseUrl: null,
      postCanonicalPattern: null,
      routeMigrationNotes: [],
    },
    security: {
      dumpCommitted: false,
      redaction: "El reporte conserva solo opciones publicas, conteos y muestras de URLs publicas.",
      excluded: "Credenciales, hashes, emails, sesiones, valores privados de plugins y contenido bruto.",
    },
  };

  const tableNames = new Set();
  let insertBuffer = "";
  let isBufferingInsert = false;

  const stream = fs.createReadStream(absoluteDumpPath, { encoding: "utf8", highWaterMark: 1024 * 1024 });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const createMatch = line.match(/^CREATE TABLE `([^`]+)`/);

    if (createMatch) {
      const tableName = createMatch[1];
      tableNames.add(tableName);

      if (tableName.endsWith("_posts")) {
        report.wordpress.tablePrefix = tableName.slice(0, -"posts".length);
      }
    }

    if (isBufferingInsert) {
      insertBuffer += `\n${line}`;

      if (line.trimEnd().endsWith(";")) {
        processInsertStatement(insertBuffer, report);
        insertBuffer = "";
        isBufferingInsert = false;
      }

      continue;
    }

    if (!line.startsWith("INSERT INTO `")) {
      continue;
    }

    const insertMatch = line.match(/^INSERT INTO `([^`]+)`/);
    const tableName = insertMatch?.[1] ?? "";

    if (!tableName.endsWith("_options") && !tableName.endsWith("_posts")) {
      continue;
    }

    insertBuffer = line;

    if (line.trimEnd().endsWith(";")) {
      processInsertStatement(insertBuffer, report);
      insertBuffer = "";
    } else {
      isBufferingInsert = true;
    }
  }

  report.wordpress.tables = summarizeTables([...tableNames].sort(), report.wordpress.tablePrefix);
  report.wordpress.permalinkPolicy = report.wordpress.options.permalink_structure ?? null;
  report.seo.canonicalBaseUrl = report.wordpress.options.home ?? report.wordpress.options.siteurl ?? null;
  report.seo.postCanonicalPattern = report.wordpress.permalinkPolicy === "/%postname%/" ? "/:post_slug/" : null;

  if (report.seo.postCanonicalPattern === "/:post_slug/") {
    report.seo.routeMigrationNotes.push(
      "Los posts publicados de WordPress deben resolverse en la raiz por slug para preservar canonicals e indexacion.",
    );
  }

  if (report.content.publishedCanonicalSamples.post?.length > 0) {
    report.seo.routeMigrationNotes.push(
      "La ruta temporal /articulo/[id] no debe ser canonical para posts migrados; usar la tabla routes con el path original.",
    );
  }

  return report;
}

function summarizeTables(tableNames, prefix) {
  const coreTables = [
    "commentmeta",
    "comments",
    "links",
    "options",
    "postmeta",
    "posts",
    "term_relationships",
    "term_taxonomy",
    "termmeta",
    "terms",
    "usermeta",
    "users",
  ];
  const prefixedCoreTables = coreTables.map((table) => `${prefix ?? ""}${table}`);

  return {
    total: tableNames.length,
    corePresent: Object.fromEntries(
      prefixedCoreTables.map((tableName) => [tableName.replace(prefix ?? "", ""), tableNames.includes(tableName)]),
    ),
    families: {
      wordpressCore: tableNames.filter((tableName) => prefixedCoreTables.includes(tableName)).length,
      buddypress: tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}bp_`)).length,
      peepso: tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}peepso_`)).length,
      woocommerce: tableNames.filter(
        (tableName) => tableName.startsWith(`${prefix ?? ""}woocommerce_`) || tableName.startsWith(`${prefix ?? ""}wc_`),
      ).length,
      mailpoet: tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}mailpoet_`)).length,
      elementor: tableNames.filter(
        (tableName) => tableName.startsWith(`${prefix ?? ""}e_`) || tableName.startsWith(`${prefix ?? ""}elementor_`),
      ).length,
      analyticsAndStats: tableNames.filter(
        (tableName) =>
          tableName.includes("statistics") ||
          tableName.includes("popularposts") ||
          tableName.includes("post_views") ||
          tableName.includes("analytics"),
      ).length,
      otherPluginTables:
        tableNames.length -
        tableNames.filter((tableName) => prefixedCoreTables.includes(tableName)).length -
        tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}bp_`)).length -
        tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}peepso_`)).length -
        tableNames.filter(
          (tableName) =>
            tableName.startsWith(`${prefix ?? ""}woocommerce_`) || tableName.startsWith(`${prefix ?? ""}wc_`),
        ).length -
        tableNames.filter((tableName) => tableName.startsWith(`${prefix ?? ""}mailpoet_`)).length -
        tableNames.filter(
          (tableName) => tableName.startsWith(`${prefix ?? ""}e_`) || tableName.startsWith(`${prefix ?? ""}elementor_`),
        ).length -
        tableNames.filter(
          (tableName) =>
            tableName.includes("statistics") ||
            tableName.includes("popularposts") ||
            tableName.includes("post_views") ||
            tableName.includes("analytics"),
        ).length,
    },
  };
}

function processInsertStatement(statement, report) {
  const insert = parseInsertStatement(statement);

  if (!insert) {
    return;
  }

  if (insert.table.endsWith("_options")) {
    processOptionsInsert(insert.valuesSql, report);
    return;
  }

  if (insert.table.endsWith("_posts")) {
    processPostsInsert(insert.valuesSql, report);
  }
}

function processOptionsInsert(valuesSql, report) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, OPTION_FIELD_INDEXES);
    const optionName = fields[1];

    if (typeof optionName !== "string" || !PUBLIC_OPTIONS.has(optionName)) {
      continue;
    }

    report.wordpress.options[optionName] = fields[2] ?? "";
  }
}

function processPostsInsert(valuesSql, report) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, POST_FIELD_INDEXES);
    const post = {
      id: fields[0],
      createdAt: fields[2],
      createdAtGmt: fields[3],
      status: fields[7],
      slug: fields[11],
      updatedAt: fields[14],
      updatedAtGmt: fields[15],
      parentId: fields[17],
      guid: fields[18],
      type: fields[20],
      mimeType: fields[21],
      commentCount: fields[22],
    };

    if (!post.type || !post.status) {
      continue;
    }

    report.content.totalRowsInPostsTable += 1;
    report.content.countsByTypeAndStatus[post.type] ??= {};
    report.content.countsByTypeAndStatus[post.type][post.status] ??= 0;
    report.content.countsByTypeAndStatus[post.type][post.status] += 1;

    if (post.status !== "publish") {
      continue;
    }

    const canonicalPath = canonicalPathForPost(post, report.wordpress.options.permalink_structure);

    if (!canonicalPath) {
      continue;
    }

    report.content.publishedCanonicalSamples[post.type] ??= [];

    if (report.content.publishedCanonicalSamples[post.type].length >= 12) {
      continue;
    }

    report.content.publishedCanonicalSamples[post.type].push({
      id: post.id,
      slug: post.slug,
      canonicalPath,
      modifiedGmt: post.updatedAtGmt,
    });
  }
}

function parseArgs(argv) {
  const args = {
    dump: null,
    out: DEFAULT_REPORT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dump") {
      args.dump = argv[index + 1];
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    }
  }

  if (!args.dump) {
    throw new Error("Uso: node scripts/wordpress/inspect-dump.mjs --dump <dump.sql> [--out <report.json>]");
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const report = await inspectDump(args.dump);
  const outputPath = path.resolve(args.out);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Reporte sanitizado generado en ${outputPath}`);
  console.log(`Prefijo WP: ${report.wordpress.tablePrefix ?? "no detectado"}`);
  console.log(`Permalinks: ${report.wordpress.permalinkPolicy ?? "no detectado"}`);
  console.log(`Filas wp_posts: ${report.content.totalRowsInPostsTable}`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
