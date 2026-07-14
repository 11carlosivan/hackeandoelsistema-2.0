#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sanitizeHtml from "sanitize-html";

import {
  buildImportDryRun,
  buildWordPressImportState,
  categoryPathForTerm,
  createDryRunReport,
  isPasswordProtectedPost,
  pagePathForPost,
} from "./import-dry-run.mjs";
import { canonicalPathForPost } from "./inspect-dump.mjs";
import { buildYoastSeoPayload } from "./yoast-metadata.mjs";

const DEFAULT_REPORT_PATH = "../docs/migration/wp-import-core.report.json";
const IMPORT_SOURCE = "wordpress-core";
const LEGACY_STATIC_ARCHIVE_ROUTES = [
  {
    path: "/shop/",
    title: "Tienda",
    description: "Archivo heredado de tienda y planes publicados en WordPress.",
    icon: "storefront",
  },
  {
    path: "/web-stories/",
    title: "Web Stories",
    description: "Archivo heredado de Web Stories publicadas en WordPress.",
    icon: "auto_stories",
  },
  {
    path: "/categoria-producto/sin-categorizar/",
    title: "Productos sin categorizar",
    description: "Archivo heredado de categoria de producto desde WordPress.",
    icon: "inventory_2",
  },
];

const HTML_SANITIZE_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "figure",
    "figcaption",
    "iframe",
    "picture",
    "source",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "id", "title", "aria-label", "aria-describedby"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "srcset", "alt", "title", "width", "height", "loading", "decoding"],
    iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "loading", "title"],
    source: ["src", "srcset", "type", "media", "sizes"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com", "www.facebook.com"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export async function runWordPressCoreImport({ dumpPath, write = false, out = DEFAULT_REPORT_PATH, limit = null, prisma }) {
  const resolvedDumpPath = dumpPath;

  if (!write) {
    const report = await buildImportDryRun(resolvedDumpPath);
    const outputPath = writeJsonReport(out, {
      ...report,
      mode: "core-dry-run",
      note: "Usa --write para escribir en MySQL. Este modo no toca la base de datos.",
    });

    return { report, outputPath };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatorio para ejecutar --write.");
  }

  const state = await buildWordPressImportState(resolvedDumpPath, {
    includePostContent: true,
    contentLimit: limit,
  });
  const dryRun = createDryRunReport(state);
  const blockers = collectWriteBlockers(dryRun);

  if (blockers.length > 0) {
    const outputPath = writeJsonReport(out, {
      ...dryRun,
      mode: "core-write-blocked",
      blockers,
      writesDatabase: false,
    });

    throw new Error(`Importacion bloqueada. Revisa ${outputPath}`);
  }

  const client = prisma ?? new PrismaClient({ log: ["error", "warn"] });
  const ownsClient = !prisma;

  try {
    const writeReport = await writeCoreImport({ prisma: client, state, dryRun, limit });
    const outputPath = writeJsonReport(out, writeReport);

    return { report: writeReport, outputPath };
  } finally {
    if (ownsClient) {
      await client.$disconnect();
    }
  }
}

export function sanitizeLegacyHtml(value) {
  if (!value) {
    return null;
  }

  return sanitizeHtml(value, HTML_SANITIZE_OPTIONS).trim() || null;
}

export function legacyPlaceholderEmail(userId) {
  return `wp-user-${userId}@legacy.hackeando.local`;
}

export function safeSlug(value, fallback = "legacy") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || fallback;
}

export function normalizeTitle(value, fallback, maxLength = 255) {
  return String(value || fallback || "Sin titulo").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function parseWordPressDate(value) {
  if (!value || value.startsWith("0000-00-00")) {
    return null;
  }

  const parsed = new Date(`${value.replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function checksumForPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function isWordPressFrontPage(state, post) {
  return post.type === "page" && post.id === state.wordpress.options.page_on_front;
}

export function buildAuthorSeoPayload({ displayName, legacyAuthorUrl, siteUrl, siteName = "Hackeando El Sistema" }) {
  const title = normalizeTitle(displayName, "Autor", 160);
  const canonicalUrl = absoluteUrlForPath(legacyAuthorUrl, siteUrl);

  return {
    title: `${title} - ${siteName}`.slice(0, 255),
    description: `Articulos y publicaciones de ${title} en ${siteName}.`.slice(0, 320),
    canonicalUrl,
    robotsIndex: "INDEX",
    robotsFollow: "FOLLOW",
    robotsDirectives: null,
    ogTitle: `${title} - ${siteName}`.slice(0, 255),
    ogDescription: `Articulos y publicaciones de ${title} en ${siteName}.`.slice(0, 320),
    ogType: "profile",
    ogImageUrl: null,
    twitterTitle: `${title} - ${siteName}`.slice(0, 255),
    twitterDescription: `Articulos y publicaciones de ${title} en ${siteName}.`.slice(0, 320),
    twitterCard: "summary",
    yoastHeadJson: null,
    importedFromYoast: false,
  };
}

export function buildStaticArchiveSeoPayload({ archive, siteUrl, siteName = "Hackeando El Sistema" }) {
  const title = normalizeTitle(archive.title, "Archivo", 160);

  return {
    title: `${title} - ${siteName}`.slice(0, 255),
    description: String(archive.description || `Archivo heredado de ${siteName}.`).slice(0, 320),
    canonicalUrl: absoluteUrlForPath(archive.path, siteUrl),
    robotsIndex: "INDEX",
    robotsFollow: "FOLLOW",
    robotsDirectives: null,
    ogTitle: `${title} - ${siteName}`.slice(0, 255),
    ogDescription: String(archive.description || `Archivo heredado de ${siteName}.`).slice(0, 320),
    ogType: "website",
    ogImageUrl: null,
    twitterTitle: `${title} - ${siteName}`.slice(0, 255),
    twitterDescription: String(archive.description || `Archivo heredado de ${siteName}.`).slice(0, 320),
    twitterCard: "summary",
    schemaJson: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: archive.description,
      url: absoluteUrlForPath(archive.path, siteUrl),
    },
    yoastHeadJson: null,
    importedFromYoast: false,
  };
}

function collectWriteBlockers(dryRun) {
  const blockers = [];

  if (dryRun.plan.routes.collisions.length > 0) {
    blockers.push({
      code: "ROUTE_COLLISIONS",
      message: "Hay rutas canonicas duplicadas.",
      count: dryRun.plan.routes.collisions.length,
    });
  }

  if (dryRun.plan.users.authorsMissingInUsersTable > 0) {
    blockers.push({
      code: "MISSING_AUTHORS",
      message: "Hay contenido importable con autores ausentes en wp_users.",
      count: dryRun.plan.users.authorsMissingInUsersTable,
    });
  }

  if (dryRun.wordpress.permalinkStructure !== "/%postname%/") {
    blockers.push({
      code: "UNEXPECTED_PERMALINK",
      message: "La politica de permalinks no coincide con /%postname%/.",
      value: dryRun.wordpress.permalinkStructure,
    });
  }

  return blockers;
}

async function writeCoreImport({ prisma, state, dryRun, limit }) {
  const startedAt = new Date();
  const importRun = await prisma.importRun.create({
    data: {
      source: IMPORT_SOURCE,
      startedAt,
      status: "RUNNING",
      stats: {
        mode: "write",
        source: state.source,
        dryRunSummary: {
          plannedRoutes: dryRun.plan.routes.plannedActiveRoutes,
          plannedPublishedPosts: dryRun.plan.content.plannedPublishedPosts,
          plannedPublishedPages: dryRun.plan.content.plannedPublishedPages,
        },
      },
    },
  });

  const counters = {
    users: 0,
    categories: 0,
    tags: 0,
    media: 0,
    posts: 0,
    pages: 0,
    products: 0,
    webStories: 0,
    routes: 0,
    homeRoutes: 0,
    authorRoutes: 0,
    staticRoutes: 0,
    seoMetadata: 0,
    yoastMetadata: 0,
    importMappings: 0,
    skipped: 0,
  };

  try {
    const authorIds = collectReferencedAuthorIds(state);
    const userIdByLegacyId = await upsertUsers({ prisma, state, importRunId: importRun.id, authorIds, counters });
    const termTaxonomiesByTermId = new Map(
      [...state.termTaxonomies.values()].map((termTaxonomy) => [termTaxonomy.termId, termTaxonomy]),
    );
    const categoryIdByTermId = await upsertCategories({
      prisma,
      state,
      termTaxonomiesByTermId,
      importRunId: importRun.id,
      counters,
    });
    const tagIdByTermId = await upsertTags({ prisma, state, importRunId: importRun.id, counters });
    const mediaIdByLegacyId = await upsertMediaAssets({
      prisma,
      state,
      importRunId: importRun.id,
      userIdByLegacyId,
      counters,
    });

    await upsertContent({
      prisma,
      state,
      importRunId: importRun.id,
      userIdByLegacyId,
      mediaIdByLegacyId,
      categoryIdByTermId,
      tagIdByTermId,
      limit,
      counters,
    });
    await upsertLegacyStaticArchiveRoutes({ prisma, state, counters });

    const finishedAt = new Date();
    const stats = { ...counters, durationMs: finishedAt.getTime() - startedAt.getTime(), limit };

    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        finishedAt,
        status: "COMPLETED",
        stats,
      },
    });

    return {
      generatedAt: finishedAt.toISOString(),
      mode: "core-write",
      importRunId: importRun.id,
      source: state.source,
      writesDatabase: true,
      stats,
      warnings: dryRun.warnings,
    };
  } catch (error) {
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        finishedAt: new Date(),
        status: "FAILED",
        error: error.message,
        stats: counters,
      },
    });

    throw error;
  }
}

function collectReferencedAuthorIds(state) {
  const authorIds = new Set();

  for (const post of state.posts.values()) {
    if (isWritablePublishedType(post) && post.authorId) {
      authorIds.add(post.authorId);
    }
  }

  return authorIds;
}

async function upsertUsers({ prisma, state, importRunId, authorIds, counters }) {
  const userIdByLegacyId = new Map();

  for (const legacyId of authorIds) {
    const user = state.users.get(legacyId);

    if (!user) {
      continue;
    }

    const username = `wp-${legacyId}-${safeSlug(user.nicename || user.login, "author")}`.slice(0, 120);
    const displayName = normalizeTitle(user.displayName || user.nicename || user.login, `Autor ${legacyId}`, 160);
    const legacyAuthorSlug = safeSlug(user.nicename || username, username);
    const legacyAuthorUrl = `/author/${legacyAuthorSlug}/`;
    const dbUser = await prisma.user.upsert({
      where: { legacyWordpressId: Number(legacyId) },
      create: {
        email: legacyPlaceholderEmail(legacyId),
        displayName,
        username,
        legacyWordpressId: Number(legacyId),
        legacyAuthorSlug,
        legacyAuthorUrl,
      },
      update: {
        displayName,
        username,
        legacyAuthorSlug,
        legacyAuthorUrl,
      },
    });

    const authorRoute = await upsertRoute(prisma, {
      path: legacyAuthorUrl,
      entityType: "AUTHOR",
      entityId: dbUser.id,
      lastmodAt: null,
    });
    counters.routes += 1;
    counters.authorRoutes += 1;
    await upsertStaticSeoMetadata({
      prisma,
      route: authorRoute,
      payload: buildAuthorSeoPayload({
        displayName,
        legacyAuthorUrl,
        siteUrl: state.wordpress.options.home || state.wordpress.options.siteurl,
        siteName: state.wordpress.options.blogname || "Hackeando El Sistema",
      }),
      counters,
    });

    await upsertMapping(prisma, {
      importRunId,
      objectType: "USER",
      legacyId,
      newEntityType: "AUTHOR",
      newEntityId: dbUser.id,
      legacyUrl: legacyAuthorUrl,
      newUrl: legacyAuthorUrl,
      checksum: checksumForPayload({ displayName, username }),
    });

    userIdByLegacyId.set(legacyId, dbUser.id);
    counters.users += 1;
    counters.importMappings += 1;
  }

  return userIdByLegacyId;
}

async function upsertCategories({ prisma, state, termTaxonomiesByTermId, importRunId, counters }) {
  const categories = [...state.termTaxonomies.values()].filter((termTaxonomy) => termTaxonomy.taxonomy === "category");
  const categoryIdByTermId = new Map();

  for (const category of categories) {
    const term = state.terms.get(category.termId);

    if (!term?.slug) {
      continue;
    }

    const fullPath = categoryPathForTerm(
      category,
      state.terms,
      termTaxonomiesByTermId,
      state.wordpress.options.category_base || "category",
    );
    const dbCategory = await prisma.category.upsert({
      where: { legacyWordpressId: Number(category.termId) },
      create: {
        name: normalizeTitle(term.name, term.slug, 160),
        slug: safeSlug(term.slug),
        fullPath,
        legacyWordpressId: Number(category.termId),
        legacyTaxonomy: "category",
        legacyUrl: fullPath,
      },
      update: {
        name: normalizeTitle(term.name, term.slug, 160),
        slug: safeSlug(term.slug),
        fullPath,
        legacyUrl: fullPath,
      },
    });

    categoryIdByTermId.set(category.termId, dbCategory.id);
    counters.categories += 1;

    await upsertRoute(prisma, {
      path: fullPath,
      entityType: "CATEGORY",
      entityId: dbCategory.id,
      lastmodAt: null,
    });
    counters.routes += 1;

    await upsertMapping(prisma, {
      importRunId,
      objectType: "CATEGORY",
      legacyId: category.termId,
      newEntityType: "CATEGORY",
      newEntityId: dbCategory.id,
      legacyUrl: fullPath,
      newUrl: fullPath,
      checksum: checksumForPayload({ term, fullPath }),
    });
    counters.importMappings += 1;
  }

  for (const category of categories) {
    if (!category.parent || category.parent === "0") {
      continue;
    }

    const categoryId = categoryIdByTermId.get(category.termId);
    const parentId = categoryIdByTermId.get(category.parent);

    if (categoryId && parentId) {
      await prisma.category.update({
        where: { id: categoryId },
        data: { parentId },
      });
    }
  }

  return categoryIdByTermId;
}

async function upsertTags({ prisma, state, importRunId, counters }) {
  const tags = [...state.termTaxonomies.values()].filter((termTaxonomy) => termTaxonomy.taxonomy === "post_tag");
  const tagIdByTermId = new Map();

  for (const tag of tags) {
    const term = state.terms.get(tag.termId);

    if (!term?.slug) {
      continue;
    }

    const tagPath = `/${safeSlug(state.wordpress.options.tag_base || "tag")}/${safeSlug(term.slug)}/`;
    const dbTag = await prisma.tag.upsert({
      where: { legacyWordpressId: Number(tag.termId) },
      create: {
        name: normalizeTitle(term.name, term.slug, 160),
        slug: safeSlug(term.slug),
        legacyWordpressId: Number(tag.termId),
        legacyUrl: tagPath,
      },
      update: {
        name: normalizeTitle(term.name, term.slug, 160),
        slug: safeSlug(term.slug),
        legacyUrl: tagPath,
      },
    });

    tagIdByTermId.set(tag.termId, dbTag.id);
    counters.tags += 1;

    await upsertRoute(prisma, {
      path: tagPath,
      entityType: "TAG",
      entityId: dbTag.id,
      lastmodAt: null,
    });
    counters.routes += 1;

    await upsertMapping(prisma, {
      importRunId,
      objectType: "TAG",
      legacyId: tag.termId,
      newEntityType: "TAG",
      newEntityId: dbTag.id,
      legacyUrl: tagPath,
      newUrl: tagPath,
      checksum: checksumForPayload({ term, tagPath }),
    });
    counters.importMappings += 1;
  }

  return tagIdByTermId;
}

async function upsertContent({
  prisma,
  state,
  importRunId,
  userIdByLegacyId,
  categoryIdByTermId,
  tagIdByTermId,
  mediaIdByLegacyId,
  limit,
  counters,
}) {
  let written = 0;

  for (const post of state.posts.values()) {
    if (!isWritablePublishedType(post)) {
      counters.skipped += 1;
      continue;
    }

    if (limit && written >= limit) {
      break;
    }

    if (post.type === "post") {
      await upsertPost({
        prisma,
        state,
        post,
        importRunId,
        userIdByLegacyId,
        mediaIdByLegacyId,
        categoryIdByTermId,
        tagIdByTermId,
        counters,
      });
    } else if (post.type === "page") {
      await upsertPage({ prisma, state, post, importRunId, userIdByLegacyId, counters });
    } else if (post.type === "product") {
      await upsertProduct({ prisma, state, post, importRunId, counters });
    } else if (post.type === "web-story") {
      await upsertWebStory({ prisma, state, post, importRunId, userIdByLegacyId, counters });
    }

    written += 1;
  }
}

async function upsertMediaAssets({ prisma, state, importRunId, userIdByLegacyId, counters }) {
  const mediaIdByLegacyId = new Map();

  for (const post of state.posts.values()) {
    if (post.type !== "attachment" || post.status !== "inherit") {
      continue;
    }

    const meta = state.postMetaByPostId.get(post.id) ?? {};
    const attachedFile = meta._wp_attached_file || null;
    const originalUrl = post.guid || buildUploadUrl(state, attachedFile);
    const url = originalUrl || buildUploadUrl(state, attachedFile);
    const mediaPath = attachedFile || pathFromUrl(url) || `legacy-media/${post.id}`;
    const dimensions = parseAttachmentDimensions(meta._wp_attachment_metadata);
    const payload = {
      uploadedById: userIdByLegacyId.get(post.authorId) ?? null,
      disk: "wordpress",
      url,
      path: mediaPath,
      originalUrl,
      legacyWordpressId: Number(post.id),
      legacyGuid: post.guid || null,
      legacyMetadata: meta._wp_attachment_metadata ? { raw: meta._wp_attachment_metadata } : undefined,
      mimeType: post.mimeType || inferMimeType(mediaPath),
      fileName: path.basename(mediaPath).slice(0, 255) || `media-${post.id}`,
      width: dimensions.width,
      height: dimensions.height,
      altText: normalizeOptionalText(meta._wp_attachment_image_alt || post.title, 255),
      caption: normalizeOptionalText(post.excerpt, 1000),
      credit: null,
      createdAt: parseWordPressDate(post.createdAt) || new Date(),
    };
    const dbMedia = await prisma.mediaAsset.upsert({
      where: { legacyWordpressId: Number(post.id) },
      create: payload,
      update: {
        uploadedById: payload.uploadedById,
        disk: payload.disk,
        url: payload.url,
        path: payload.path,
        originalUrl: payload.originalUrl,
        legacyGuid: payload.legacyGuid,
        legacyMetadata: payload.legacyMetadata,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
        width: payload.width,
        height: payload.height,
        altText: payload.altText,
        caption: payload.caption,
      },
    });

    await upsertMapping(prisma, {
      importRunId,
      objectType: "MEDIA",
      legacyId: post.id,
      newEntityType: null,
      newEntityId: dbMedia.id,
      legacyUrl: originalUrl,
      newUrl: url,
      checksum: checksumForPayload(payload),
    });

    mediaIdByLegacyId.set(post.id, dbMedia.id);
    counters.media += 1;
    counters.importMappings += 1;
  }

  return mediaIdByLegacyId;
}

async function upsertPost({
  prisma,
  state,
  post,
  importRunId,
  userIdByLegacyId,
  mediaIdByLegacyId,
  categoryIdByTermId,
  tagIdByTermId,
  counters,
}) {
  const authorId = userIdByLegacyId.get(post.authorId);

  if (!authorId) {
    throw new Error(`Autor faltante para post legacy ${post.id}.`);
  }

  const legacyUrl = canonicalPathForPost(post, state.wordpress.options.permalink_structure);
  assertCanonicalPath(legacyUrl, post);
  const payload = buildPostPayload({ post, legacyUrl, authorId, featuredMediaId: featuredMediaIdForPost(state, post, mediaIdByLegacyId) });
  const dbPost = await prisma.post.upsert({
    where: { legacyWordpressId: Number(post.id) },
    create: payload,
    update: payload,
  });

  const route = await upsertRoute(prisma, {
    path: legacyUrl,
    entityType: "POST",
    entityId: dbPost.id,
    lastmodAt: parseWordPressDate(post.updatedAtGmt),
    includeInSitemap: !isPasswordProtectedPost(post),
  });
  counters.routes += 1;
  await upsertSeoMetadata({ prisma, state, post, route, routePath: legacyUrl, counters });

  await syncPostTerms({ prisma, state, post, postId: dbPost.id, categoryIdByTermId, tagIdByTermId });
  await upsertMapping(prisma, {
    importRunId,
    objectType: "POST",
    legacyId: post.id,
    newEntityType: "POST",
    newEntityId: dbPost.id,
    legacyUrl,
    newUrl: legacyUrl,
    checksum: payload.importChecksum,
  });

  counters.posts += 1;
  counters.importMappings += 1;
}

export function buildPostPayload({ post, legacyUrl, authorId, featuredMediaId = null }) {
  const contentHtml = sanitizeLegacyHtml(post.contentHtml);
  const payload = {
    authorId,
    featuredMediaId,
    title: normalizeTitle(post.title, post.slug),
    slug: safeSlug(post.slug, `post-${post.id}`).slice(0, 280),
    excerpt: normalizeExcerpt(post.excerpt),
    contentHtml,
    contentText: htmlToText(contentHtml),
    status: "PUBLISHED",
    postType: "NEWS",
    visibility: isPasswordProtectedPost(post) ? "PRIVATE" : "PUBLIC",
    commentCount: Number(post.commentCount ?? 0),
    legacyWordpressId: Number(post.id),
    legacyGuid: post.guid || null,
    legacyUrl,
    legacySlug: post.slug,
    publishedAt: parseWordPressDate(post.createdAt),
    publishedGmtAt: parseWordPressDate(post.createdAtGmt),
    importChecksum: checksumForPayload({
      title: post.title,
      slug: post.slug,
      modified: post.updatedAtGmt,
      contentHtml,
    }),
  };

  return payload;
}

export function applyPasswordProtectedSeoPolicy(post, payload) {
  if (!isPasswordProtectedPost(post)) {
    return payload;
  }

  return {
    ...payload,
    robotsIndex: "NOINDEX",
    robotsFollow: "FOLLOW",
    robotsDirectives: {
      ...(payload.robotsDirectives && typeof payload.robotsDirectives === "object" ? payload.robotsDirectives : {}),
      wordpressPasswordProtected: true,
    },
  };
}

async function upsertPage({ prisma, state, post, importRunId, userIdByLegacyId, counters }) {
  const legacyUrl = pagePathForPost(post, state.posts);
  assertCanonicalPath(legacyUrl, post);
  const contentHtml = sanitizeLegacyHtml(post.contentHtml);
  const payload = {
    authorId: userIdByLegacyId.get(post.authorId) ?? null,
    title: normalizeTitle(post.title, post.slug),
    slug: safeSlug(post.slug, `page-${post.id}`).slice(0, 280),
    contentHtml,
    contentText: htmlToText(contentHtml),
    status: isPasswordProtectedPost(post) ? "DRAFT" : "PUBLISHED",
    legacyWordpressId: Number(post.id),
    legacyGuid: post.guid || null,
    legacyUrl,
    legacySlug: post.slug,
    publishedAt: parseWordPressDate(post.createdAt),
  };
  const dbPage = await prisma.page.upsert({
    where: { legacyWordpressId: Number(post.id) },
    create: payload,
    update: payload,
  });

  const route = await upsertRoute(prisma, {
    path: legacyUrl,
    entityType: "PAGE",
    entityId: dbPage.id,
    lastmodAt: parseWordPressDate(post.updatedAtGmt),
    includeInSitemap: !isPasswordProtectedPost(post),
  });
  counters.routes += 1;
  await upsertSeoMetadata({ prisma, state, post, route, routePath: legacyUrl, counters });

  if (isWordPressFrontPage(state, post)) {
    const homeRoute = await upsertRoute(prisma, {
      path: "/",
      entityType: "HOME",
      entityId: dbPage.id,
      lastmodAt: parseWordPressDate(post.updatedAtGmt),
      includeInSitemap: !isPasswordProtectedPost(post),
    });
    counters.routes += 1;
    counters.homeRoutes += 1;
    await upsertSeoMetadata({ prisma, state, post, route: homeRoute, routePath: "/", counters });
  }

  await upsertMapping(prisma, {
    importRunId,
    objectType: "PAGE",
    legacyId: post.id,
    newEntityType: "PAGE",
    newEntityId: dbPage.id,
    legacyUrl,
    newUrl: legacyUrl,
    checksum: checksumForPayload(payload),
  });

  counters.pages += 1;
  counters.importMappings += 1;
}

async function upsertProduct({ prisma, state, post, importRunId, counters }) {
  const legacyUrl = canonicalPathForPost(post, state.wordpress.options.permalink_structure);
  assertCanonicalPath(legacyUrl, post);
  const payload = {
    title: normalizeTitle(post.title, post.slug),
    slug: safeSlug(post.slug, `product-${post.id}`).slice(0, 280),
    descriptionHtml: sanitizeLegacyHtml(post.contentHtml),
    shortDescription: normalizeExcerpt(post.excerpt),
    isActive: !isPasswordProtectedPost(post),
    legacyWordpressId: Number(post.id),
    legacyUrl,
  };
  const dbProduct = await prisma.product.upsert({
    where: { legacyWordpressId: Number(post.id) },
    create: payload,
    update: payload,
  });

  const route = await upsertRoute(prisma, {
    path: legacyUrl,
    entityType: "PRODUCT",
    entityId: dbProduct.id,
    lastmodAt: parseWordPressDate(post.updatedAtGmt),
    includeInSitemap: !isPasswordProtectedPost(post),
  });
  counters.routes += 1;
  await upsertSeoMetadata({ prisma, state, post, route, routePath: legacyUrl, counters });

  await upsertMapping(prisma, {
    importRunId,
    objectType: "PRODUCT",
    legacyId: post.id,
    newEntityType: "PRODUCT",
    newEntityId: dbProduct.id,
    legacyUrl,
    newUrl: legacyUrl,
    checksum: checksumForPayload(payload),
  });

  counters.products += 1;
  counters.importMappings += 1;
}

async function upsertWebStory({ prisma, state, post, importRunId, userIdByLegacyId, counters }) {
  const legacyUrl = canonicalPathForPost(post, state.wordpress.options.permalink_structure);
  assertCanonicalPath(legacyUrl, post);
  const payload = {
    authorId: userIdByLegacyId.get(post.authorId) ?? null,
    title: normalizeTitle(post.title, post.slug),
    slug: safeSlug(post.slug, `web-story-${post.id}`).slice(0, 280),
    contentJson: { legacyContentHtml: sanitizeLegacyHtml(post.contentHtml) },
    status: isPasswordProtectedPost(post) ? "DRAFT" : "PUBLISHED",
    legacyWordpressId: Number(post.id),
    legacyUrl,
    publishedAt: parseWordPressDate(post.createdAt),
  };
  const dbWebStory = await prisma.webStory.upsert({
    where: { legacyWordpressId: Number(post.id) },
    create: payload,
    update: payload,
  });

  const route = await upsertRoute(prisma, {
    path: legacyUrl,
    entityType: "WEB_STORY",
    entityId: dbWebStory.id,
    lastmodAt: parseWordPressDate(post.updatedAtGmt),
    includeInSitemap: !isPasswordProtectedPost(post),
  });
  counters.routes += 1;
  await upsertSeoMetadata({ prisma, state, post, route, routePath: legacyUrl, counters });

  await upsertMapping(prisma, {
    importRunId,
    objectType: "WEB_STORY",
    legacyId: post.id,
    newEntityType: "WEB_STORY",
    newEntityId: dbWebStory.id,
    legacyUrl,
    newUrl: legacyUrl,
    checksum: checksumForPayload(payload),
  });

  counters.webStories += 1;
  counters.importMappings += 1;
}

async function syncPostTerms({ prisma, state, post, postId, categoryIdByTermId, tagIdByTermId }) {
  const relationships = state.relationshipsByObjectId.get(post.id) ?? [];
  let primaryCategorySet = false;

  for (const termTaxonomyId of relationships) {
    const termTaxonomy = state.termTaxonomies.get(termTaxonomyId);

    if (!termTaxonomy) {
      continue;
    }

    if (termTaxonomy.taxonomy === "category") {
      const categoryId = categoryIdByTermId.get(termTaxonomy.termId);

      if (!categoryId) {
        continue;
      }

      await prisma.postCategory.upsert({
        where: { postId_categoryId: { postId, categoryId } },
        create: { postId, categoryId, isPrimary: !primaryCategorySet },
        update: { isPrimary: !primaryCategorySet },
      });
      primaryCategorySet = true;
    } else if (termTaxonomy.taxonomy === "post_tag") {
      const tagId = tagIdByTermId.get(termTaxonomy.termId);

      if (!tagId) {
        continue;
      }

      await prisma.postTag.upsert({
        where: { postId_tagId: { postId, tagId } },
        create: { postId, tagId },
        update: {},
      });
    }
  }
}

async function upsertRoute(prisma, { path: routePath, entityType, entityId, lastmodAt, includeInSitemap = true }) {
  return prisma.route.upsert({
    where: { path: routePath },
    create: {
      path: routePath,
      entityType,
      entityId,
      status: "ACTIVE",
      httpStatus: 200,
      lastmodAt,
      includeInSitemap,
    },
    update: {
      entityType,
      entityId,
      status: "ACTIVE",
      httpStatus: 200,
      lastmodAt,
      includeInSitemap,
    },
  });
}

async function upsertSeoMetadata({ prisma, state, post, route, routePath, counters }) {
  const payload = buildYoastSeoPayload({
    post,
    meta: state.postMetaByPostId.get(post.id) ?? {},
    routePath,
    siteUrl: state.wordpress.options.home || state.wordpress.options.siteurl,
    siteName: state.wordpress.options.blogname || "Hackeando El Sistema",
  });

  const protectedAwarePayload = applyPasswordProtectedSeoPolicy(post, payload);

  await prisma.seoMetadata.upsert({
    where: { routeId: route.id },
    create: {
      routeId: route.id,
      ...protectedAwarePayload,
    },
    update: protectedAwarePayload,
  });

  counters.seoMetadata += 1;

  if (protectedAwarePayload.importedFromYoast) {
    counters.yoastMetadata += 1;
  }
}

async function upsertStaticSeoMetadata({ prisma, route, payload, counters }) {
  await prisma.seoMetadata.upsert({
    where: { routeId: route.id },
    create: {
      routeId: route.id,
      ...payload,
    },
    update: payload,
  });

  counters.seoMetadata += 1;
}

async function upsertLegacyStaticArchiveRoutes({ prisma, state, counters }) {
  for (const archive of LEGACY_STATIC_ARCHIVE_ROUTES) {
    const route = await upsertRoute(prisma, {
      path: archive.path,
      entityType: "STATIC",
      entityId: null,
      lastmodAt: null,
    });

    counters.routes += 1;
    counters.staticRoutes += 1;
    await upsertStaticSeoMetadata({
      prisma,
      route,
      payload: buildStaticArchiveSeoPayload({
        archive,
        siteUrl: state.wordpress.options.home || state.wordpress.options.siteurl,
        siteName: state.wordpress.options.blogname || "Hackeando El Sistema",
      }),
      counters,
    });
  }
}

async function upsertMapping(
  prisma,
  { importRunId, objectType, legacyId, newEntityType, newEntityId, legacyUrl, newUrl, checksum },
) {
  return prisma.importMapping.upsert({
    where: {
      objectType_legacyId: {
        objectType,
        legacyId: String(legacyId),
      },
    },
    create: {
      importRunId,
      objectType,
      legacyId: String(legacyId),
      newEntityType,
      newEntityId,
      legacyUrl,
      newUrl,
      checksum,
    },
    update: {
      importRunId,
      newEntityType,
      newEntityId,
      legacyUrl,
      newUrl,
      checksum,
    },
  });
}

function isWritablePublishedType(post) {
  return post.status === "publish" && ["post", "page", "product", "web-story"].includes(post.type);
}

function assertCanonicalPath(routePath, post) {
  if (!routePath) {
    throw new Error(`No se pudo generar canonical para ${post.type} legacy ${post.id}.`);
  }
}

function normalizeExcerpt(value) {
  if (!value) {
    return null;
  }

  return htmlToText(value)?.slice(0, 600) ?? null;
}

function htmlToText(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionalText(value, maxLength) {
  const text = htmlToText(value);

  return text ? text.slice(0, maxLength) : null;
}

function featuredMediaIdForPost(state, post, mediaIdByLegacyId) {
  const thumbnailId = state.postMetaByPostId.get(post.id)?._thumbnail_id;

  return thumbnailId ? mediaIdByLegacyId.get(thumbnailId) ?? null : null;
}

export function parseAttachmentDimensions(serializedMetadata) {
  const metadata = String(serializedMetadata || "");
  const width = Number(metadata.match(/s:5:"width";i:(\d+)/)?.[1] ?? 0);
  const height = Number(metadata.match(/s:6:"height";i:(\d+)/)?.[1] ?? 0);

  return {
    width: width > 0 ? width : null,
    height: height > 0 ? height : null,
  };
}

function buildUploadUrl(state, attachedFile) {
  if (!attachedFile) {
    return null;
  }

  const siteUrl = String(state.wordpress.options.siteurl || state.wordpress.options.home || "").replace(/\/+$/g, "");

  return siteUrl ? `${siteUrl}/wp-content/uploads/${String(attachedFile).replace(/^\/+/, "")}` : null;
}

function pathFromUrl(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function absoluteUrlForPath(routePath, siteUrl) {
  const base = String(siteUrl || "").replace(/\/+$/g, "");

  if (!base || !routePath) {
    return null;
  }

  try {
    return new URL(routePath, `${base}/`).toString();
  } catch {
    return null;
  }
}

export function inferMimeType(value) {
  const extension = path.extname(String(value || "")).toLowerCase();

  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".pdf": "application/pdf",
    }[extension] || "application/octet-stream"
  );
}

function writeJsonReport(outputPath, report) {
  const absoluteOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return absoluteOutputPath;
}

function parseArgs(argv) {
  const args = {
    dump: null,
    out: DEFAULT_REPORT_PATH,
    write: false,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dump") {
      args.dump = argv[index + 1];
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--limit") {
      args.limit = Number(argv[index + 1]);
      index += 1;
    }
  }

  if (!args.dump) {
    throw new Error("Uso: node scripts/wordpress/import-core.mjs --dump <dump.sql> [--write] [--limit 100]");
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    throw new Error("--limit debe ser un entero positivo.");
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const { report, outputPath } = await runWordPressCoreImport({
    dumpPath: args.dump,
    write: args.write,
    out: args.out,
    limit: args.limit,
  });

  if (args.write) {
    console.log(`Import core ejecutado en ${outputPath}`);
    console.log(`ImportRun: ${report.importRunId}`);
    console.log(`Posts: ${report.stats.posts}`);
    console.log(`Paginas: ${report.stats.pages}`);
    console.log(`Rutas: ${report.stats.routes}`);
    return;
  }

  console.log(`Core dry-run generado en ${outputPath}`);
  console.log(`Posts publicados planificados: ${report.plan.content.plannedPublishedPosts}`);
  console.log(`Rutas activas planificadas: ${report.plan.routes.plannedActiveRoutes}`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
