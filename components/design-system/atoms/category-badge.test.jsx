import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryBadge } from './category-badge';

describe('CategoryBadge', () => {
  it('renders a link when category URL is available', () => {
    render(<CategoryBadge category={{ name: 'Politica', url: '/category/politica/' }} />);

    expect(screen.getByRole('link', { name: 'Politica' }).getAttribute('href')).toMatch(
      /^\/category\/politica\/?$/,
    );
  });

  it('renders nothing without text', () => {
    const { container } = render(<CategoryBadge />);

    expect(container).toBeEmptyDOMElement();
  });
});
