import { describe, expect, it } from "vitest";

import {
  crawlSitemaps,
  inferEntityTypeFromPath,
  normalizePath,
  parseSitemapXml,
} from "../scripts/seo/sitemap-inventory.mjs";

describe("sitemap inventory", () => {
  it("parses sitemap indexes and urlsets", () => {
    const index = parseSitemapXml(`
      <sitemapindex>
        <sitemap><loc>https://example.com/post-sitemap.xml</loc><lastmod>2026-07-10</lastmod></sitemap>
      </sitemapindex>
    `);
    const urlset = parseSitemapXml(`
      <urlset>
        <url><loc>https://example.com/uno/</loc><lastmod>2026-07-11</lastmod></url>
        <url><loc>https://example.com/category/politica/</loc></url>
      </urlset>
    `);

    expect(index).toMatchObject({
      type: "index",
      sitemaps: [{ loc: "https://example.com/post-sitemap.xml", lastmod: "2026-07-10" }],
    });
    expect(urlset.urls).toHaveLength(2);
  });

  it("normalizes paths and infers route entity types", () => {
    expect(normalizePath("category/politica")).toBe("/category/politica/");
    expect(normalizePath("/slug-con-emoji%f0%9f%94%a5")).toBe("/slug-con-emoji%f0%9f%94%a5/");
    expect(normalizePath("/web-stories/66777")).toBe("/web-stories/66777/");
    expect(inferEntityTypeFromPath("/category/politica/")).toBe("CATEGORY");
    expect(inferEntityTypeFromPath("/tag/seo/")).toBe("TAG");
    expect(inferEntityTypeFromPath("/author/redaccion/")).toBe("AUTHOR");
    expect(inferEntityTypeFromPath("/producto/plan/")).toBe("PRODUCT");
    expect(inferEntityTypeFromPath("/web-stories/historia/")).toBe("WEB_STORY");
    expect(inferEntityTypeFromPath("/noticia-real/")).toBe("POST");
  });

  it("crawls nested sitemap indexes with a mocked fetch", async () => {
    const responses = new Map([
      [
        "https://example.com/sitemap.xml",
        "<sitemapindex><sitemap><loc>https://example.com/post-sitemap.xml</loc></sitemap></sitemapindex>",
      ],
      [
        "https://example.com/post-sitemap.xml",
        "<urlset><url><loc>https://example.com/post-demo/</loc><lastmod>2026-07-10</lastmod></url></urlset>",
      ],
    ]);
    const fetchImpl = async (url) => ({
      ok: responses.has(url),
      status: responses.has(url) ? 200 : 404,
      text: async () => responses.get(url),
    });

    const crawled = await crawlSitemaps({ sitemapUrl: "https://example.com/sitemap.xml", fetchImpl });

    expect(crawled.sitemaps).toHaveLength(2);
    expect(crawled.urls).toEqual([
      {
        url: "https://example.com/post-demo/",
        path: "/post-demo/",
        lastmod: "2026-07-10",
        sitemap: "https://example.com/post-sitemap.xml",
        inferredEntityType: "POST",
      },
    ]);
  });
});
