import { describe, expect, it } from "vitest";

import {
  checksumForPayload,
  buildAuthorSeoPayload,
  buildStaticArchiveSeoPayload,
  legacyPlaceholderEmail,
  isWordPressFrontPage,
  normalizeTitle,
  inferMimeType,
  parseAttachmentDimensions,
  parseWordPressDate,
  safeSlug,
  sanitizeLegacyHtml,
} from "../scripts/wordpress/import-core.mjs";
import {
  buildYoastSeoPayload,
  robotsFollowFromYoast,
  robotsIndexFromYoast,
  resolveYoastTemplate,
} from "../scripts/wordpress/yoast-metadata.mjs";

describe("WordPress core importer", () => {
  it("generates placeholder emails instead of reusing WordPress emails", () => {
    expect(legacyPlaceholderEmail(42)).toBe("wp-user-42@legacy.hackeando.local");
  });

  it("sanitizes imported HTML before storing it", () => {
    const sanitized = sanitizeLegacyHtml(
      '<p onclick="alert(1)">Hola</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    );

    expect(sanitized).toContain("<p>Hola</p>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
  });

  it("normalizes slugs and titles for database limits", () => {
    expect(safeSlug("Política RD / Opinión")).toBe("politica-rd-opinion");
    expect(normalizeTitle("", "fallback")).toBe("fallback");
    expect(normalizeTitle("a".repeat(300))).toHaveLength(255);
  });

  it("parses WordPress dates and ignores zero dates", () => {
    expect(parseWordPressDate("0000-00-00 00:00:00")).toBeNull();
    expect(parseWordPressDate("2026-07-11 12:30:00")?.toISOString()).toBe("2026-07-11T12:30:00.000Z");
  });

  it("creates stable checksums for idempotent imports", () => {
    expect(checksumForPayload({ id: 1, slug: "uno" })).toBe(checksumForPayload({ id: 1, slug: "uno" }));
    expect(checksumForPayload({ id: 1, slug: "uno" })).not.toBe(checksumForPayload({ id: 1, slug: "dos" }));
  });

  it("extracts attachment dimensions and MIME fallbacks for media imports", () => {
    const metadata = 'a:5:{s:5:"width";i:1200;s:6:"height";i:800;s:4:"file";s:19:"2026/01/sample.jpg";}';

    expect(parseAttachmentDimensions(metadata)).toEqual({ width: 1200, height: 800 });
    expect(parseAttachmentDimensions("")).toEqual({ width: null, height: null });
    expect(inferMimeType("2026/01/sample.webp")).toBe("image/webp");
    expect(inferMimeType("documento.pdf")).toBe("application/pdf");
  });

  it("resolves Yoast templates and robot policies", () => {
    expect(resolveYoastTemplate("%%title%% %%sep%% %%sitename%%", {
      title: "Articulo RD",
      sep: "-",
      sitename: "Hackeando",
    })).toBe("Articulo RD - Hackeando");
    expect(robotsIndexFromYoast("1")).toBe("NOINDEX");
    expect(robotsIndexFromYoast("0")).toBe("INDEX");
    expect(robotsFollowFromYoast("nofollow")).toBe("NOFOLLOW");
  });

  it("builds SEO metadata from Yoast postmeta", () => {
    const payload = buildYoastSeoPayload({
      post: {
        id: "99",
        type: "post",
        title: "Titulo real",
        slug: "titulo-real",
        excerpt: "<p>Resumen editorial</p>",
      },
      routePath: "/titulo-real/",
      siteUrl: "https://hackeandoelsistema.net",
      siteName: "Hackeando El Sistema",
      meta: {
        _yoast_wpseo_title: "SEO %%title%%",
        _yoast_wpseo_metadesc: "Descripcion de Yoast",
        _yoast_wpseo_canonical: "/canonical-real/",
        "_yoast_wpseo_meta-robots-noindex": "1",
        "_yoast_wpseo_meta-robots-nofollow": "1",
        "_yoast_wpseo_opengraph-image": "/wp-content/uploads/og.jpg",
      },
    });

    expect(payload).toMatchObject({
      title: "SEO Titulo real",
      description: "Descripcion de Yoast",
      canonicalUrl: "https://hackeandoelsistema.net/canonical-real/",
      robotsIndex: "NOINDEX",
      robotsFollow: "NOFOLLOW",
      ogImageUrl: "https://hackeandoelsistema.net/wp-content/uploads/og.jpg",
      importedFromYoast: true,
    });
    expect(payload.yoastHeadJson.raw._yoast_wpseo_title).toBe("SEO %%title%%");
  });

  it("builds safe baseline SEO metadata when Yoast is absent", () => {
    const payload = buildYoastSeoPayload({
      post: {
        id: "100",
        type: "page",
        title: "Sobre nosotros",
        slug: "sobre-nosotros",
        excerpt: "",
        contentHtml: "<p>Conoce el medio y su equipo.</p>",
      },
      routePath: "/sobre-nosotros/",
      siteUrl: "https://hackeandoelsistema.net",
      meta: {},
    });

    expect(payload).toMatchObject({
      title: "Sobre nosotros",
      description: "Conoce el medio y su equipo.",
      canonicalUrl: "https://hackeandoelsistema.net/sobre-nosotros/",
      robotsIndex: "INDEX",
      robotsFollow: "FOLLOW",
      importedFromYoast: false,
      yoastHeadJson: null,
    });
  });

  it("detects the configured WordPress front page", () => {
    const state = { wordpress: { options: { page_on_front: "66655" } } };

    expect(isWordPressFrontPage(state, { id: "66655", type: "page" })).toBe(true);
    expect(isWordPressFrontPage(state, { id: "66655", type: "post" })).toBe(false);
    expect(isWordPressFrontPage(state, { id: "1", type: "page" })).toBe(false);
  });

  it("builds indexable author route SEO metadata", () => {
    const payload = buildAuthorSeoPayload({
      displayName: "Redaccion",
      legacyAuthorUrl: "/author/redaccion/",
      siteUrl: "https://hackeandoelsistema.net",
      siteName: "Hackeando el Sistema",
    });

    expect(payload).toMatchObject({
      title: "Redaccion - Hackeando el Sistema",
      description: "Articulos y publicaciones de Redaccion en Hackeando el Sistema.",
      canonicalUrl: "https://hackeandoelsistema.net/author/redaccion/",
      robotsIndex: "INDEX",
      robotsFollow: "FOLLOW",
      ogType: "profile",
      twitterCard: "summary",
    });
  });

  it("builds indexable static archive SEO metadata", () => {
    const payload = buildStaticArchiveSeoPayload({
      archive: {
        path: "/shop/",
        title: "Tienda",
        description: "Archivo heredado de tienda.",
      },
      siteUrl: "https://hackeandoelsistema.net",
      siteName: "Hackeando el Sistema",
    });

    expect(payload).toMatchObject({
      title: "Tienda - Hackeando el Sistema",
      description: "Archivo heredado de tienda.",
      canonicalUrl: "https://hackeandoelsistema.net/shop/",
      robotsIndex: "INDEX",
      robotsFollow: "FOLLOW",
      ogType: "website",
      twitterCard: "summary",
    });
    expect(payload.schemaJson).toMatchObject({
      "@type": "CollectionPage",
      url: "https://hackeandoelsistema.net/shop/",
    });
  });
});
