import { describe, expect, it } from "vitest";

import {
  applyPasswordProtectedSeoPolicy,
  buildPostPayload,
  checksumForPayload,
  buildAuthorSeoPayload,
  buildStaticArchiveSeoPayload,
  legacyPlaceholderEmail,
  isWordPressFrontPage,
  normalizeTitle,
  normalizeLegacyEditorialHtml,
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

  it("normalizes malformed legacy editorial HTML before storing it", () => {
    const normalized = normalizeLegacyEditorialHtml(
      '<h1 class="wp-block-heading">La discusion publica ha querido reducir todo a redes sociales. La politica no funciona solamente por presion mediatica y necesita contexto institucional.<br><br>Claves del caso<br><br>- Primer punto<br>- Segundo punto</h1>',
    );

    expect(normalized).toContain("<h2>La discusion publica ha querido reducir todo a redes sociales.</h2>");
    expect(normalized).toContain(
      "<p>La politica no funciona solamente por presion mediatica y necesita contexto institucional.</p>",
    );
    expect(normalized).toContain("<h2>Claves del caso</h2>");
    expect(normalized).toContain("<ul><li>Primer punto</li><li>Segundo punto</li></ul>");
    expect(normalized).not.toContain("<h1");
  });

  it("turns standalone WordPress embed URLs into clickable links before storing them", () => {
    const normalized = normalizeLegacyEditorialHtml(`
      <figure class="wp-block-embed is-type-wp-embed is-provider-hackeando-el-sistema">
        <div class="wp-block-embed__wrapper">
          https://hackeandoelsistema.net/quien-se-queda-con-el-dinero-de-la-gasolina-en-republica-dominicana/
        </div>
      </figure>
    `);

    expect(normalized).toContain(
      '<a href="https://hackeandoelsistema.net/quien-se-queda-con-el-dinero-de-la-gasolina-en-republica-dominicana/" rel="noopener noreferrer">',
    );
    expect(normalized).not.toContain("wp-block-embed__wrapper");
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

  it("imports WordPress password protected posts as private content", () => {
    const payload = buildPostPayload({
      post: {
        id: "10",
        title: "Protegido",
        slug: "protegido",
        password: "clave",
        contentHtml: "<p>Privado</p>",
        commentCount: "0",
      },
      legacyUrl: "/protegido/",
      authorId: "11111111-1111-4111-8111-111111111111",
    });

    expect(payload.visibility).toBe("PRIVATE");
  });

  it("forces noindex SEO policy for WordPress password protected content", () => {
    const payload = applyPasswordProtectedSeoPolicy(
      { password: "clave" },
      { robotsIndex: "INDEX", robotsFollow: "FOLLOW", robotsDirectives: null },
    );

    expect(payload).toMatchObject({
      robotsIndex: "NOINDEX",
      robotsFollow: "FOLLOW",
      robotsDirectives: {
        wordpressPasswordProtected: true,
      },
    });
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

  it("rejects unsafe Yoast canonical URL schemes during import", () => {
    const payload = buildYoastSeoPayload({
      post: {
        id: "101",
        type: "post",
        title: "Canonica sospechosa",
        slug: "canonica-sospechosa",
        excerpt: "Resumen",
      },
      routePath: "/canonica-sospechosa/",
      siteUrl: "https://hackeandoelsistema.net",
      meta: {
        _yoast_wpseo_canonical: "javascript:alert(1)",
      },
    });

    expect(payload.canonicalUrl).toBe("https://hackeandoelsistema.net/canonica-sospechosa/");
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
