import { describe, expect, it } from 'vitest';
import { replaceRequestCookie } from '../proxy.js';

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
});
