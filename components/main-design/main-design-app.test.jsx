import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainDesignApp } from './main-design-app';

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
});
