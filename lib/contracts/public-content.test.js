import { describe, expect, it } from 'vitest';
import { assertContract, createPagination, missingFields, requiredContractFields } from './public-content';
import {
  authorPagePayloadFixture,
  categoryPagePayloadFixture,
  homePayloadFixture,
  postSummaryFixture,
  searchPagePayloadFixture,
} from './public-content.fixtures';

describe('contract validation', () => {
  it('validates required fields for home payloads', () => {
    expect(() => assertContract('home', homePayloadFixture)).not.toThrow();
  });

  it('validates required fields for category payloads', () => {
    expect(() => assertContract('categoryPage', categoryPagePayloadFixture)).not.toThrow();
  });

  it('validates required fields for author payloads', () => {
    expect(() => assertContract('authorPage', authorPagePayloadFixture)).not.toThrow();
  });

  it('validates required fields for search payloads', () => {
    expect(() => assertContract('searchPage', searchPagePayloadFixture)).not.toThrow();
  });

  it('detects missing fields', () => {
    const payload = { ...postSummaryFixture };
    delete payload.title;

    expect(missingFields(payload, requiredContractFields.postSummary)).toContain('title');
    expect(() => assertContract('postSummary', payload)).toThrow(/title/);
  });
});

describe('createPagination', () => {
  it('creates next and previous URLs when pages exist', () => {
    const pagination = createPagination({
      page: 2,
      pageSize: 10,
      totalItems: 35,
      basePath: '/category/nacionales/',
    });

    expect(pagination.totalPages).toBe(4);
    expect(pagination.nextPageUrl).toBe('/category/nacionales/?page=3');
    expect(pagination.previousPageUrl).toBe('/category/nacionales/?page=1');
  });

  it('clamps the current page to valid bounds', () => {
    const pagination = createPagination({
      page: 10,
      pageSize: 10,
      totalItems: 12,
      basePath: '/category/nacionales/',
    });

    expect(pagination.page).toBe(2);
    expect(pagination.nextPageUrl).toBeNull();
  });
});
