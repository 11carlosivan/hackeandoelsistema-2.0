import { describe, expect, it } from "vitest";

import {
  checksumForPayload,
  legacyPlaceholderEmail,
  normalizeTitle,
  inferMimeType,
  parseAttachmentDimensions,
  parseWordPressDate,
  safeSlug,
  sanitizeLegacyHtml,
} from "../scripts/wordpress/import-core.mjs";

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
});
