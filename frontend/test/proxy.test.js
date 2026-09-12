import { describe, expect, it } from 'vitest';
import {
  publicRouteLookupFetchOptions,
  replaceRequestCookie,
  shouldCheckPublicRoute,
  shouldReturnGoneResponse,
} from '../proxy.js';

function requestFor(pathname, method = 'GET') {
  return {
    method,
    nextUrl: { pathname },
  };
}

describe('CMS proxy session helpers', () => {
  it('replaces the access token cookie while preserving the rest of the request cookies', () => {
    const cookieHeader = 'hes_refresh_token=refresh; hes_access_token=old-access; theme=dark';

    expect(replaceRequestCookie(cookieHeader, 'hes_access_token', 'new-access')).toBe(
      'hes_refresh_token=refresh; theme=dark; hes_access_token=new-access',
    );
  });

  it('adds the access token cookie when it was missing from the request', () => {
    expect(replaceRequestCookie('hes_refresh_token=refresh', 'hes_access_token', 'new-access')).toBe(
      'hes_refresh_token=refresh; hes_access_token=new-access',
    );
  });

  it('only returns an explicit 410 gone response for archived gone routes', () => {
    expect(shouldReturnGoneResponse({ status: 'GONE', httpStatus: 410 })).toBe(true);
    expect(shouldReturnGoneResponse({ status: 'GONE', httpStatus: 404 })).toBe(false);
    expect(shouldReturnGoneResponse({ status: 'ACTIVE', httpStatus: 410 })).toBe(false);
  });

  it('allows short cache revalidation for public route lookups', () => {
    expect(publicRouteLookupFetchOptions()).toMatchObject({
      headers: { accept: 'application/json' },
      next: { revalidate: 120 },
    });
    expect(publicRouteLookupFetchOptions()).not.toHaveProperty('cache', 'no-store');
  });

  it('skips route lookups for radio and AzuraCast-owned paths', () => {
    expect(shouldCheckPublicRoute(requestFor('/radio'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/radio/'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/azuracast/now-playing'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/listen/hes_radio/radio.mp3'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/public/hes_radio'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/static/vite_dist/assets/generic_song.jpg'))).toBe(false);
  });

  it('keeps checking editorial public routes for gone responses', () => {
    expect(shouldCheckPublicRoute(requestFor('/post-importante/'))).toBe(true);
    expect(shouldCheckPublicRoute(requestFor('/post-importante/', 'POST'))).toBe(false);
    expect(shouldCheckPublicRoute(requestFor('/imagen.jpg'))).toBe(false);
  });
});
