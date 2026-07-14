import { describe, expect, it } from "vitest";

import { entityEndpointForRoute } from "../scripts/qa/public-route-smoke.mjs";

describe("public route smoke script", () => {
  it("maps route entity types to their public entity endpoints", () => {
    expect(entityEndpointForRoute({ entityType: "POST", entityId: "post-id" })).toBe("/api/v1/public/posts/id/post-id");
    expect(entityEndpointForRoute({ entityType: "PAGE", entityId: "page-id" })).toBe("/api/v1/public/pages/id/page-id");
    expect(entityEndpointForRoute({ entityType: "HOME", entityId: "page-id" })).toBe("/api/v1/public/pages/id/page-id");
    expect(entityEndpointForRoute({ entityType: "AUTHOR", entityId: "author-id" })).toBe("/api/v1/public/authors/id/author-id");
    expect(entityEndpointForRoute({ entityType: "PRODUCT", entityId: "product-id" })).toBe("/api/v1/public/products/id/product-id");
    expect(entityEndpointForRoute({ entityType: "WEB_STORY", entityId: "story-id" })).toBe("/api/v1/public/web-stories/id/story-id");
    expect(entityEndpointForRoute({ entityType: "CATEGORY", entityId: "category-id" })).toBe("/api/v1/public/categories/id/category-id/posts");
    expect(entityEndpointForRoute({ entityType: "TAG", entityId: "tag-id" })).toBe("/api/v1/public/tags/id/tag-id/posts");
  });

  it("does not require entity endpoints for static route types", () => {
    expect(entityEndpointForRoute({ entityType: "STATIC", entityId: null })).toBeNull();
    expect(entityEndpointForRoute({ entityType: "SEARCH", entityId: null })).toBeNull();
  });
});
