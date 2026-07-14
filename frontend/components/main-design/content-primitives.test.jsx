import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaginationControls } from './content-primitives';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}));

describe('PaginationControls', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<PaginationControls meta={{ page: 1, totalPages: 1 }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('builds archive links while preserving search query', () => {
    render(
      <PaginationControls
        meta={{ page: 2, totalPages: 5 }}
        basePath="/archivo"
        query={{ q: 'codigo penal' }}
      />,
    );

    expect(screen.getByText('ANTERIOR')).toHaveAttribute('href', '/archivo?q=codigo+penal');
    expect(screen.getByText('SIGUIENTE')).toHaveAttribute('href', '/archivo?q=codigo+penal&page=3');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('2');
  });

  it('builds WordPress-style pagination links for public archives', () => {
    render(
      <PaginationControls
        meta={{ page: 2, totalPages: 5 }}
        basePath="/category/politica/"
        pathPagination
      />,
    );

    expect(screen.getByText('ANTERIOR')).toHaveAttribute('href', '/category/politica/');
    expect(screen.getByText('SIGUIENTE')).toHaveAttribute('href', '/category/politica/page/3/');
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', '/category/politica/page/2/');
  });
});
