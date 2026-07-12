#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  canonicalPathForPost,
  parseInsertStatement,
  pickSqlFields,
  iterateSqlTuples,
} from "./inspect-dump.mjs";
import { YOAST_META_KEYS } from "./yoast-metadata.mjs";

const DEFAULT_REPORT_PATH = "docs/migration/wp-import-dry-run.report.json";

const OPTIONS_FIELDS = new Set([1, 2]);
const POSTS_FIELDS = new Set([0, 1, 2, 3, 7, 11, 14, 15, 17, 18, 20, 21, 22]);
const POST_CONTENT_FIELDS = new Set([4, 5, 6]);
const USERS_FIELDS = new Set([0, 1, 3, 8, 9]);
const TERMS_FIELDS = new Set([0, 1, 2]);
const TERM_TAXONOMY_FIELDS = new Set([0, 1, 2, 4, 5]);
const TERM_RELATIONSHIP_FIELDS = new Set([0, 1]);
const POSTMETA_FIELDS = new Set([1, 2, 3]);

const PUBLIC_OPTIONS = new Set(["siteurl", "home", "blogname", "permalink_structure", "category_base", "tag_base"]);
const IMPORTABLE_POST_TYPES = new Set(["post", "page", "product", "web-story"]);
const MEDIA_META_KEYS = new Set([
  "_wp_attached_file",
  "_wp_attachment_metadata",
  "_wp_attachment_image_alt",
  "_thumbnail_id",
]);
const CAPTURED_POST_META_KEYS = new Set([...MEDIA_META_KEYS, ...YOAST_META_KEYS]);

export async function buildImportDryRun(dumpPath) {
  const state = await buildWordPressImportState(dumpPath);

  return createDryRunReport(state);
}

export async function buildWordPressImportState(dumpPath, options = {}) {
  const absoluteDumpPath = path.resolve(dumpPath);

  if (!fs.existsSync(absoluteDumpPath)) {
    throw new Error(`No existe el dump: ${absoluteDumpPath}`);
  }

  const stats = fs.statSync(absoluteDumpPath);
  const state = {
    source: {
      fileName: path.basename(absoluteDumpPath),
      sizeBytes: stats.size,
    },
    wordpress: {
      tablePrefix: null,
      options: {},
    },
    users: new Map(),
    posts: new Map(),
    postMetaByPostId: new Map(),
    terms: new Map(),
    termTaxonomies: new Map(),
    relationshipsByObjectId: new Map(),
    includePostContent: options.includePostContent ?? false,
    contentLimit: options.contentLimit ?? null,
    contentPostsStored: 0,
  };

  await scanDump(absoluteDumpPath, state);

  return state;
}

export function wordpressStatusToTarget(status, postType) {
  if (status === "publish") {
    return postType === "page" ? "PUBLISHED" : "PUBLISHED";
  }

  if (status === "future") {
    return "SCHEDULED";
  }

  if (status === "pending") {
    return "PENDING_REVIEW";
  }

  if (status === "draft" || status === "auto-draft") {
    return "DRAFT";
  }

  return "SKIP";
}

export function categoryPathForTerm(termTaxonomy, terms, termTaxonomiesByTermId, categoryBase = "category") {
  const slugs = [];
  let current = termTaxonomy;
  const visited = new Set();

  while (current && !visited.has(current.termTaxonomyId)) {
    visited.add(current.termTaxonomyId);

    const term = terms.get(current.termId);

    if (term?.slug) {
      slugs.unshift(term.slug);
    }

    if (!current.parent || current.parent === "0") {
      break;
    }

    current = termTaxonomiesByTermId.get(current.parent);
  }

  return `/${trimSlashes(categoryBase || "category")}/${slugs.map(trimSlashes).filter(Boolean).join("/")}/`;
}

export function pagePathForPost(page, postsById) {
  const slugs = [];
  let current = page;
  const visited = new Set();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);

    if (current.slug) {
      slugs.unshift(current.slug);
    }

    if (!current.parentId || current.parentId === "0") {
      break;
    }

    current = postsById.get(current.parentId);
  }

  return slugs.length > 0 ? `/${slugs.map(trimSlashes).filter(Boolean).join("/")}/` : null;
}

export function detectRouteCollisions(routes) {
  const byPath = new Map();

  for (const route of routes) {
    byPath.set(route.path, [...(byPath.get(route.path) ?? []), route]);
  }

  return [...byPath.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([path, entries]) => ({
      path,
      entries: entries.map(({ legacyId, entityType, sourceType }) => ({ legacyId, entityType, sourceType })),
    }));
}

async function scanDump(absoluteDumpPath, state) {
  let insertBuffer = "";
  let isBufferingInsert = false;

  const stream = fs.createReadStream(absoluteDumpPath, { encoding: "utf8", highWaterMark: 1024 * 1024 });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const createMatch = line.match(/^CREATE TABLE `([^`]+)`/);

    if (createMatch?.[1]?.endsWith("_posts")) {
      state.wordpress.tablePrefix = createMatch[1].slice(0, -"posts".length);
    }

    if (isBufferingInsert) {
      insertBuffer += `\n${line}`;

      if (line.trimEnd().endsWith(";")) {
        processInsert(insertBuffer, state);
        insertBuffer = "";
        isBufferingInsert = false;
      }

      continue;
    }

    if (!line.startsWith("INSERT INTO `")) {
      continue;
    }

    const tableName = line.match(/^INSERT INTO `([^`]+)`/)?.[1] ?? "";

    if (!isSupportedTable(tableName)) {
      continue;
    }

    insertBuffer = line;

    if (line.trimEnd().endsWith(";")) {
      processInsert(insertBuffer, state);
      insertBuffer = "";
    } else {
      isBufferingInsert = true;
    }
  }
}

function isSupportedTable(tableName) {
  return (
    tableName.endsWith("_options") ||
    tableName.endsWith("_posts") ||
    tableName.endsWith("_postmeta") ||
    tableName.endsWith("_users") ||
    tableName.endsWith("_terms") ||
    tableName.endsWith("_term_taxonomy") ||
    tableName.endsWith("_term_relationships")
  );
}

function processInsert(statement, state) {
  const insert = parseInsertStatement(statement);

  if (!insert) {
    return;
  }

  if (insert.table.endsWith("_options")) {
    processOptions(insert.valuesSql, state);
  } else if (insert.table.endsWith("_posts")) {
    processPosts(insert.valuesSql, state);
  } else if (insert.table.endsWith("_postmeta")) {
    processPostMeta(insert.valuesSql, state);
  } else if (insert.table.endsWith("_users")) {
    processUsers(insert.valuesSql, state);
  } else if (insert.table.endsWith("_terms")) {
    processTerms(insert.valuesSql, state);
  } else if (insert.table.endsWith("_term_taxonomy")) {
    processTermTaxonomies(insert.valuesSql, state);
  } else if (insert.table.endsWith("_term_relationships")) {
    processTermRelationships(insert.valuesSql, state);
  }
}

function processOptions(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, OPTIONS_FIELDS);
    const optionName = fields[1];

    if (typeof optionName === "string" && PUBLIC_OPTIONS.has(optionName)) {
      state.wordpress.options[optionName] = fields[2] ?? "";
    }
  }
}

function processUsers(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, USERS_FIELDS);

    state.users.set(fields[0], {
      id: fields[0],
      login: fields[1],
      nicename: fields[3],
      status: fields[8],
      displayName: fields[9],
    });
  }
}

function processPosts(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, POSTS_FIELDS);
    const post = {
      id: fields[0],
      authorId: fields[1],
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

    if (shouldCapturePostContent(post, state)) {
      const contentFields = pickSqlFields(tupleSql, POST_CONTENT_FIELDS);
      post.contentHtml = contentFields[4];
      post.title = contentFields[5];
      post.excerpt = contentFields[6];
      state.contentPostsStored += 1;
    }

    state.posts.set(post.id, post);
  }
}

function processPostMeta(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, POSTMETA_FIELDS);
    const postId = fields[1];
    const metaKey = fields[2];

    if (!postId || !CAPTURED_POST_META_KEYS.has(metaKey)) {
      continue;
    }

    const current = state.postMetaByPostId.get(postId) ?? {};
    current[metaKey] = fields[3];
    state.postMetaByPostId.set(postId, current);
  }
}

function shouldCapturePostContent(post, state) {
  if (!state.includePostContent) {
    return false;
  }

  if (state.contentLimit !== null && state.contentPostsStored >= state.contentLimit) {
    return false;
  }

  return (post.status === "publish" && IMPORTABLE_POST_TYPES.has(post.type)) || post.type === "attachment";
}

function processTerms(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, TERMS_FIELDS);

    state.terms.set(fields[0], {
      termId: fields[0],
      name: fields[1],
      slug: fields[2],
    });
  }
}

function processTermTaxonomies(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, TERM_TAXONOMY_FIELDS);

    state.termTaxonomies.set(fields[0], {
      termTaxonomyId: fields[0],
      termId: fields[1],
      taxonomy: fields[2],
      parent: fields[4],
      count: Number(fields[5] ?? 0),
    });
  }
}

function processTermRelationships(valuesSql, state) {
  for (const tupleSql of iterateSqlTuples(valuesSql)) {
    const fields = pickSqlFields(tupleSql, TERM_RELATIONSHIP_FIELDS);
    const objectId = fields[0];

    if (!objectId) {
      continue;
    }

    state.relationshipsByObjectId.set(objectId, [
      ...(state.relationshipsByObjectId.get(objectId) ?? []),
      fields[1],
    ]);
  }
}

export function createDryRunReport(state) {
  const termTaxonomiesByTermId = new Map(
    [...state.termTaxonomies.values()].map((termTaxonomy) => [termTaxonomy.termId, termTaxonomy]),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    source: state.source,
    wordpress: {
      tablePrefix: state.wordpress.tablePrefix,
      home: state.wordpress.options.home ?? state.wordpress.options.siteurl ?? null,
      permalinkStructure: state.wordpress.options.permalink_structure ?? null,
      categoryBase: state.wordpress.options.category_base || "category",
      tagBase: state.wordpress.options.tag_base || "tag",
    },
    target: {
      prismaModels: ["User", "Category", "Tag", "MediaAsset", "Post", "Page", "Product", "WebStory", "Route", "ImportMapping"],
      writesDatabase: false,
    },
    plan: {
      users: {},
      taxonomies: {},
      content: {},
      media: {},
      routes: {},
      importMappings: {},
    },
    warnings: [],
  };

  const routes = [];
  const importMappings = [];
  const authorIds = new Set();
  const postsByStatus = {};
  const postsByType = {};
  const skippedByReason = {};
  let publishedImportableContentWithCategory = 0;
  let publishedImportableContentWithTag = 0;
  let importableMedia = 0;
  let contentWithThumbnail = 0;

  for (const post of state.posts.values()) {
    postsByType[post.type] ??= {};
    postsByType[post.type][post.status] ??= 0;
    postsByType[post.type][post.status] += 1;
    postsByStatus[post.status] ??= 0;
    postsByStatus[post.status] += 1;

    if (post.authorId && IMPORTABLE_POST_TYPES.has(post.type)) {
      authorIds.add(post.authorId);
    }

    const targetStatus = wordpressStatusToTarget(post.status, post.type);

    if (targetStatus === "SKIP") {
      skippedByReason[`status:${post.status}`] ??= 0;
      skippedByReason[`status:${post.status}`] += 1;
    }

    if (post.status !== "publish" || !IMPORTABLE_POST_TYPES.has(post.type)) {
      if (post.type === "attachment" && post.status === "inherit") {
        importableMedia += 1;
      }

      continue;
    }

    const route = routeForPublishedPost(post, state.posts, state.wordpress.options.permalink_structure);

    if (route) {
      routes.push(route);
      importMappings.push({
        objectType: importObjectTypeForPost(post.type),
        legacyId: post.id,
        legacyUrl: route.path,
        newUrl: route.path,
      });
    }

    const relationships = state.relationshipsByObjectId.get(post.id) ?? [];

    if (relationships.some((termTaxonomyId) => state.termTaxonomies.get(termTaxonomyId)?.taxonomy === "category")) {
      publishedImportableContentWithCategory += 1;
    }

    if (relationships.some((termTaxonomyId) => state.termTaxonomies.get(termTaxonomyId)?.taxonomy === "post_tag")) {
      publishedImportableContentWithTag += 1;
    }

    if (state.postMetaByPostId.get(post.id)?._thumbnail_id) {
      contentWithThumbnail += 1;
    }
  }

  const categories = [...state.termTaxonomies.values()].filter((termTaxonomy) => termTaxonomy.taxonomy === "category");
  const tags = [...state.termTaxonomies.values()].filter((termTaxonomy) => termTaxonomy.taxonomy === "post_tag");

  for (const category of categories) {
    const path = categoryPathForTerm(category, state.terms, termTaxonomiesByTermId, report.wordpress.categoryBase);
    routes.push({
      path,
      entityType: "CATEGORY",
      legacyId: category.termId,
      sourceType: "category",
    });
    importMappings.push({
      objectType: "CATEGORY",
      legacyId: category.termId,
      legacyUrl: path,
      newUrl: path,
    });
  }

  for (const tag of tags) {
    const term = state.terms.get(tag.termId);

    if (!term?.slug) {
      continue;
    }

    const tagPath = `/${trimSlashes(report.wordpress.tagBase)}/${trimSlashes(term.slug)}/`;

    routes.push({
      path: tagPath,
      entityType: "TAG",
      legacyId: tag.termId,
      sourceType: "post_tag",
    });
    importMappings.push({
      objectType: "TAG",
      legacyId: tag.termId,
      legacyUrl: tagPath,
      newUrl: tagPath,
    });
  }

  const routeCollisions = detectRouteCollisions(routes);
  const missingAuthors = [...authorIds].filter((authorId) => !state.users.has(authorId));

  report.plan.users = {
    wordpressUsersFound: state.users.size,
    authorsReferencedByImportableContent: authorIds.size,
    authorsMissingInUsersTable: missingAuthors.length,
    credentialPolicy: "No se migran hashes de WordPress; las credenciales deben regenerarse en el sistema nuevo.",
  };
  report.plan.taxonomies = {
    categories: categories.length,
    tags: tags.length,
    publishedImportableContentWithAtLeastOneCategory: publishedImportableContentWithCategory,
    publishedImportableContentWithAtLeastOneTag: publishedImportableContentWithTag,
  };
  report.plan.content = {
    postsTableRows: state.posts.size,
    byTypeAndStatus: postsByType,
    byStatus: postsByStatus,
    plannedPublishedPosts: postsByType.post?.publish ?? 0,
    plannedPublishedPages: postsByType.page?.publish ?? 0,
    plannedProducts: postsByType.product?.publish ?? 0,
    plannedWebStories: postsByType["web-story"]?.publish ?? 0,
    mediaInventoryOnly: postsByType.attachment?.inherit ?? 0,
    skippedByReason,
  };
  report.plan.media = {
    importableAttachments: importableMedia,
    contentWithFeaturedMediaMeta: contentWithThumbnail,
  };
  report.plan.routes = {
    plannedActiveRoutes: routes.length,
    collisions: routeCollisions,
    sampleRoutes: routes.slice(0, 24),
    canonicalPolicy: {
      post: "/{post_slug}/",
      page: "/{page_slug}/ or hierarchical /{parent_slug}/{page_slug}/",
      category: `/${trimSlashes(report.wordpress.categoryBase)}/{category_slug}/`,
      tag: `/${trimSlashes(report.wordpress.tagBase)}/{tag_slug}/`,
      product: "/producto/{product_slug}/",
      webStory: "/web-stories/{story_slug}/",
    },
  };
  report.plan.importMappings = {
    plannedRows: importMappings.length,
    sampleMappings: importMappings.slice(0, 24),
  };

  if (routeCollisions.length > 0) {
    report.warnings.push("Hay rutas duplicadas; el importador real debe resolverlas antes de escribir en routes.path.");
  }

  if (missingAuthors.length > 0) {
    report.warnings.push("Hay contenido importable con autores que no aparecen en wp_users.");
  }

  if (report.wordpress.permalinkStructure !== "/%postname%/") {
    report.warnings.push("La estructura permalink no coincide con /%postname%/; validar canonicals contra sitemap antes de importar.");
  }

  return report;
}

function routeForPublishedPost(post, postsById, permalinkStructure) {
  if (post.type === "page") {
    const pagePath = pagePathForPost(post, postsById);

    return pagePath
      ? {
          path: pagePath,
          entityType: "PAGE",
          legacyId: post.id,
          sourceType: post.type,
        }
      : null;
  }

  const pathValue = canonicalPathForPost(post, permalinkStructure);

  if (!pathValue) {
    return null;
  }

  return {
    path: pathValue,
    entityType: routeEntityTypeForPost(post.type),
    legacyId: post.id,
    sourceType: post.type,
  };
}

function routeEntityTypeForPost(postType) {
  return {
    post: "POST",
    product: "PRODUCT",
    "web-story": "WEB_STORY",
  }[postType];
}

function importObjectTypeForPost(postType) {
  return {
    post: "POST",
    page: "PAGE",
    product: "PRODUCT",
    "web-story": "WEB_STORY",
  }[postType];
}

function trimSlashes(value) {
  return String(value ?? "").replace(/^\/+|\/+$/g, "");
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
    throw new Error("Uso: node scripts/wordpress/import-dry-run.mjs --dump <dump.sql> [--out <report.json>]");
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const report = await buildImportDryRun(args.dump);
  const outputPath = path.resolve(args.out);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Dry-run generado en ${outputPath}`);
  console.log(`Posts publicados planificados: ${report.plan.content.plannedPublishedPosts}`);
  console.log(`Paginas publicadas planificadas: ${report.plan.content.plannedPublishedPages}`);
  console.log(`Rutas activas planificadas: ${report.plan.routes.plannedActiveRoutes}`);
  console.log(`Colisiones de ruta: ${report.plan.routes.collisions.length}`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
