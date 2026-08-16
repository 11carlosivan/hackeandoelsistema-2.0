import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CmsMediaSelectorModal from './cms-media-selector-modal';

vi.mock('@/lib/main-design/client-api', () => ({
  getClientApiBaseUrl: () => '',
}));

vi.mock('./client-security', () => ({
  fetchWithCsrfRetry: vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: [] }),
  })),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('CmsMediaSelectorModal', () => {
  it('uses a tapped image immediately on mobile screens', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <CmsMediaSelectorModal
        isOpen
        onClose={onClose}
        onSelect={onSelect}
        initialMedia={[
          {
            id: 'media-1',
            type: 'IMAGE',
            url: '/cover.jpg',
            fileName: 'cover.jpg',
            altText: 'Portada seleccionable',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /portada seleccionable/i }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'media-1', url: '/cover.jpg' }));
    expect(onClose).toHaveBeenCalled();
  });
});
