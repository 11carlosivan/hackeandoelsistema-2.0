import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainDesignApp } from './main-design-app';
import { articles as fallbackArticles } from '@/lib/main-design/mock-data';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('MainDesignApp', () => {
  it('renders the current client-approved design in the Next app shell', () => {
    render(<MainDesignApp />);

    expect(screen.getAllByAltText(/hackeando el sistema/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/ltimas noticias/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tendencias/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/lo .ltimo/i)).toBeInTheDocument();
  });

  it('does not inject mock articles when the production feed falls back empty', () => {
    render(
      <MainDesignApp
        feed={{
          source: 'fallback',
          articles: [],
          categories: [],
          summary: null,
        }}
      />,
    );

    expect(screen.queryByText(fallbackArticles[0].title)).not.toBeInTheDocument();
  });
});
