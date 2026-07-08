import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryFilterBar } from './category-filter-bar';

describe('CategoryFilterBar', () => {
  it('renders every category as a navigable filter', () => {
    render(
      <CategoryFilterBar
        filters={[
          { label: 'Todas', href: '/' },
          { label: 'Politica', href: '/category/politica/' },
          { label: 'Economia', href: '/category/economia-negocios/' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /todas/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /politica/i })).toHaveAttribute('href', '/category/politica');
    expect(screen.getByRole('link', { name: /economia/i })).toHaveAttribute('href', '/category/economia-negocios');
  });
});
