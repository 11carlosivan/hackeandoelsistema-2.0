import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavMoreMenu } from './nav-more-menu';

describe('NavMoreMenu', () => {
  it('renders secondary categories as navigation links', () => {
    render(
      <NavMoreMenu
        items={[
          { label: 'MLB', href: '/category/mlb/' },
          { label: 'Tecnologia', href: '/category/tecnologia/' },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: /mas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mlb/i })).toHaveAttribute('href', '/category/mlb');
    expect(screen.getByRole('link', { name: /tecnologia/i })).toHaveAttribute('href', '/category/tecnologia');
  });
});
