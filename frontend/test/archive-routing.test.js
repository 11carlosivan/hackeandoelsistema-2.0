import { describe, expect, it } from 'vitest';
import {
  buildPaginatedArchivePath,
  categoryArchiveRedirectPath,
  parseCategoryArchivePath,
} from '../lib/main-design/archive-routing.js';

describe('archive routing', () => {
  it('builds WordPress-style archive pagination paths', () => {
    expect(buildPaginatedArchivePath('/category/politica/', 1)).toBe('/category/politica/');
    expect(buildPaginatedArchivePath('/category/politica/', 2)).toBe('/category/politica/page/2/');
  });

  it('detects category archive pagination redirects', () => {
    expect(
      categoryArchiveRedirectPath({
        parsed: parseCategoryArchivePath(['politica', 'page', '1']),
        basePath: '/category/politica/',
      }),
    ).toBe('/category/politica/');

    expect(
      categoryArchiveRedirectPath({
        parsed: parseCategoryArchivePath(['politica'], '2'),
        basePath: '/category/politica/',
      }),
    ).toBe('/category/politica/page/2/');

    expect(
      categoryArchiveRedirectPath({
        parsed: parseCategoryArchivePath(['politica', 'page', '2']),
        basePath: '/category/politica/',
      }),
    ).toBeNull();
  });
});
