const SITE_NAME_FALLBACK = "Hackeando El Sistema";

export const YOAST_META_KEYS = new Set([
  "_yoast_wpseo_title",
  "_yoast_wpseo_metadesc",
  "_yoast_wpseo_canonical",
  "_yoast_wpseo_meta-robots-noindex",
  "_yoast_wpseo_meta-robots-nofollow",
  "_yoast_wpseo_meta-robots-adv",
  "_yoast_wpseo_opengraph-title",
  "_yoast_wpseo_opengraph-description",
  "_yoast_wpseo_opengraph-image",
  "_yoast_wpseo_opengraph-image-id",
  "_yoast_wpseo_twitter-title",
  "_yoast_wpseo_twitter-description",
  "_yoast_wpseo_twitter-image",
  "_yoast_wpseo_twitter-image-id",
  "_yoast_wpseo_twitter-card-type",
  "_yoast_wpseo_focuskw",
  "_yoast_wpseo_primary_category",
  "_yoast_wpseo_content_score",
  "_yoast_wpseo_estimated-reading-time-minutes",
]);

export function buildYoastSeoPayload({ post, meta = {}, routePath, siteUrl, siteName = SITE_NAME_FALLBACK }) {
  const hasYoast = hasYoastMetadata(meta);
  const fallbackTitle = plainText(post.title || post.slug || "Sin titulo");
  const fallbackDescription = optionalText(post.excerpt || post.contentHtml, 320);
  const context = {
    title: fallbackTitle,
    excerpt: fallbackDescription || "",
    sitename: siteName || SITE_NAME_FALLBACK,
    sep: "-",
    page: "",
  };
  const ogImageUrl = absoluteUrl(optionalText(meta["_yoast_wpseo_opengraph-image"], 500), siteUrl);
  const twitterImageUrl = absoluteUrl(optionalText(meta["_yoast_wpseo_twitter-image"], 500), siteUrl);
  const title = optionalText(resolveYoastTemplate(meta._yoast_wpseo_title, context), 255) || optionalText(fallbackTitle, 255);
  const description =
    optionalText(resolveYoastTemplate(meta._yoast_wpseo_metadesc, context), 320) || fallbackDescription;
  const canonicalUrl = absoluteUrl(meta._yoast_wpseo_canonical, siteUrl) || absoluteUrl(routePath, siteUrl);
  const yoastHeadJson = hasYoast
    ? {
        source: "wordpress-postmeta",
        legacyPostId: String(post.id),
        raw: pickYoastMetadata(meta),
        resolved: {
          title,
          description,
          canonicalUrl,
          ogImageUrl,
          twitterImageUrl,
        },
      }
    : null;

  return {
    title,
    description,
    canonicalUrl,
    robotsIndex: robotsIndexFromYoast(meta["_yoast_wpseo_meta-robots-noindex"]),
    robotsFollow: robotsFollowFromYoast(meta["_yoast_wpseo_meta-robots-nofollow"]),
    robotsDirectives: buildRobotsDirectives(meta),
    ogTitle: optionalText(resolveYoastTemplate(meta["_yoast_wpseo_opengraph-title"], context), 255) || title,
    ogDescription:
      optionalText(resolveYoastTemplate(meta["_yoast_wpseo_opengraph-description"], context), 320) || description,
    ogType: post.type === "post" || post.type === "web-story" ? "article" : "website",
    ogImageUrl,
    twitterTitle: optionalText(resolveYoastTemplate(meta["_yoast_wpseo_twitter-title"], context), 255) || title,
    twitterDescription:
      optionalText(resolveYoastTemplate(meta["_yoast_wpseo_twitter-description"], context), 320) || description,
    twitterCard:
      optionalText(meta["_yoast_wpseo_twitter-card-type"], 80) ||
      (twitterImageUrl || ogImageUrl ? "summary_large_image" : "summary"),
    yoastHeadJson,
    importedFromYoast: hasYoast,
  };
}

export function hasYoastMetadata(meta = {}) {
  return Object.keys(meta).some((key) => YOAST_META_KEYS.has(key) && optionalText(meta[key], 2000));
}

export function resolveYoastTemplate(value, context = {}) {
  const input = optionalText(value, 1000);

  if (!input) {
    return null;
  }

  return input
    .replace(/%%title%%/gi, context.title || "")
    .replace(/%%excerpt_only%%/gi, context.excerpt || "")
    .replace(/%%excerpt%%/gi, context.excerpt || "")
    .replace(/%%sitename%%/gi, context.sitename || SITE_NAME_FALLBACK)
    .replace(/%%sep%%/gi, context.sep || "-")
    .replace(/%%page%%/gi, context.page || "")
    .replace(/%%[^%]+%%/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function robotsIndexFromYoast(value) {
  return isYoastEnabled(value, "noindex") ? "NOINDEX" : "INDEX";
}

export function robotsFollowFromYoast(value) {
  return isYoastEnabled(value, "nofollow") ? "NOFOLLOW" : "FOLLOW";
}

function buildRobotsDirectives(meta) {
  const advanced = optionalText(meta["_yoast_wpseo_meta-robots-adv"], 500);

  if (!advanced) {
    return null;
  }

  return {
    source: "yoast",
    advanced: advanced
      .split(",")
      .map((directive) => directive.trim())
      .filter(Boolean),
  };
}

function pickYoastMetadata(meta) {
  return Object.fromEntries(
    Object.entries(meta)
      .filter(([key, value]) => YOAST_META_KEYS.has(key) && optionalText(value, 5000))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function absoluteUrl(value, siteUrl) {
  const cleanValue = optionalText(value, 500);

  if (!cleanValue) {
    return null;
  }

  try {
    return new URL(cleanValue).toString();
  } catch {
    const base = optionalText(siteUrl, 500)?.replace(/\/+$/g, "");

    if (!base || !cleanValue.startsWith("/")) {
      return null;
    }

    try {
      return new URL(cleanValue, `${base}/`).toString();
    } catch {
      return null;
    }
  }
}

function isYoastEnabled(value, keyword) {
  const normalized = optionalText(value, 80)?.toLowerCase();

  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === keyword;
}

function optionalText(value, maxLength) {
  const text = plainText(value);

  return text ? text.slice(0, maxLength) : null;
}

function plainText(value) {
  if (!value) {
    return null;
  }

  return decodeHtmlEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
