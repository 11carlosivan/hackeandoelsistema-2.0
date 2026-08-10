import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CmsPostForm from './cms-post-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('./cms-gutenberg-editor', () => ({
  default: () => <div data-testid="editor" />,
}));

vi.mock('./cms-media-selector-modal', () => ({
  default: () => null,
}));

describe('CmsPostForm scheduling', () => {
  it('shows a scheduling action for new posts and validates a future date before calling the API', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<CmsPostForm categories={[]} tags={[]} media={[]} />);

    fireEvent.click(screen.getByText('keyboard_arrow_down').closest('button'));
    fireEvent.click(screen.getByText('Programar'));

    expect(screen.getByText('Selecciona una fecha y hora futura antes de programar la publicacion.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
