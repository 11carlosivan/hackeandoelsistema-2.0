import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders page information and navigation links', () => {
    render(
      <Pagination
        pagination={{
          page: 2,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
          previousPageUrl: '/category/nacionales/?page=1',
          nextPageUrl: '/category/nacionales/?page=3',
        }}
      />,
    );

    expect(screen.getByText('Pagina 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anterior' }).getAttribute('href')).toMatch(
      /^\/category\/nacionales\/?\?page=1$/,
    );
    expect(screen.getByRole('link', { name: 'Siguiente' }).getAttribute('href')).toMatch(
      /^\/category\/nacionales\/?\?page=3$/,
    );
  });

  it('does not render for a single page', () => {
    const { container } = render(
      <Pagination
        pagination={{
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
          previousPageUrl: null,
          nextPageUrl: null,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
