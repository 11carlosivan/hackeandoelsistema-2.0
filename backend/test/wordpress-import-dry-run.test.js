import { describe, expect, it } from "vitest";

import {
  categoryPathForTerm,
  detectRouteCollisions,
  isPasswordProtectedPost,
  pagePathForPost,
  wordpressStatusToTarget,
} from "../scripts/wordpress/import-dry-run.mjs";

describe("WordPress import dry-run", () => {
  it("maps WordPress statuses to target workflow statuses", () => {
    expect(wordpressStatusToTarget("publish", "post")).toBe("PUBLISHED");
    expect(wordpressStatusToTarget("future", "post")).toBe("SCHEDULED");
    expect(wordpressStatusToTarget("pending", "post")).toBe("PENDING_REVIEW");
    expect(wordpressStatusToTarget("draft", "post")).toBe("DRAFT");
    expect(wordpressStatusToTarget("trash", "post")).toBe("SKIP");
  });

  it("builds hierarchical page paths", () => {
    const parent = { id: "1", slug: "network", parentId: "0" };
    const child = { id: "2", slug: "miembros", parentId: "1" };
    const posts = new Map([
      [parent.id, parent],
      [child.id, child],
    ]);

    expect(pagePathForPost(child, posts)).toBe("/network/miembros/");
  });

  it("detects WordPress password protected content", () => {
    expect(isPasswordProtectedPost({ password: "clave-wp" })).toBe(true);
    expect(isPasswordProtectedPost({ password: "" })).toBe(false);
    expect(isPasswordProtectedPost({})).toBe(false);
  });

  it("builds hierarchical category paths", () => {
    const parentTaxonomy = { termTaxonomyId: "10", termId: "1", parent: "0" };
    const childTaxonomy = { termTaxonomyId: "11", termId: "2", parent: "1" };
    const terms = new Map([
      ["1", { slug: "politica" }],
      ["2", { slug: "congreso" }],
    ]);
    const taxonomiesByTermId = new Map([
      ["1", parentTaxonomy],
      ["2", childTaxonomy],
    ]);

    expect(categoryPathForTerm(childTaxonomy, terms, taxonomiesByTermId, "category")).toBe("/category/politica/congreso/");
  });

  it("detects canonical route collisions", () => {
    const collisions = detectRouteCollisions([
      { path: "/abinader/", entityType: "POST", legacyId: "1", sourceType: "post" },
      { path: "/abinader/", entityType: "PAGE", legacyId: "2", sourceType: "page" },
      { path: "/economia/", entityType: "CATEGORY", legacyId: "3", sourceType: "category" },
    ]);

    expect(collisions).toEqual([
      {
        path: "/abinader/",
        entries: [
          { entityType: "POST", legacyId: "1", sourceType: "post" },
          { entityType: "PAGE", legacyId: "2", sourceType: "page" },
        ],
      },
    ]);
  });
});
