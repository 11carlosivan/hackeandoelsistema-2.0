import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CmsPosts from '@/components/main-design/cms-posts';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/main-design/client-api', () => ({
  getClientApiBaseUrl: () => 'http://localhost:4000',
}));

describe('CmsPosts Component', () => {
  const samplePosts = [
    {
      id: 'post-1',
      title: 'Primera Noticia de Prueba',
      slug: 'primera-noticia',
      status: 'PUBLISHED',
      updatedAt: '2026-10-06T12:00:00Z',
      viewCount: 150,
      author: { displayName: 'Carlos' },
      primaryCategory: { name: 'Nacionales' },
    },
    {
      id: 'post-2',
      title: 'Segunda Noticia en Borrador',
      slug: 'segunda-noticia',
      status: 'DRAFT',
      updatedAt: '2026-10-06T13:00:00Z',
      viewCount: 0,
      author: { displayName: 'Admin' },
      primaryCategory: { name: 'Tecnología' },
    },
  ];

  it('renders post list with checkboxes', () => {
    render(<CmsPosts posts={samplePosts} meta={{ total: 2, page: 1, totalPages: 1 }} filters={{}} />);
    expect(screen.getByText('Primera Noticia de Prueba')).toBeDefined();
    expect(screen.getByText('Segunda Noticia en Borrador')).toBeDefined();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3); // 1 header + 2 rows
  });

  it('shows bulk actions bar when posts are selected', () => {
    render(<CmsPosts posts={samplePosts} meta={{ total: 2, page: 1, totalPages: 1 }} filters={{}} />);
    
    // Select first post
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    // Check bulk action bar appears
    expect(screen.getByText('ACCIONES POR LOTE:')).toBeDefined();
    expect(screen.getByText('1 seleccionada')).toBeDefined();
    expect(screen.getByText('Pasar a Borrador')).toBeDefined();
    expect(screen.getByText('Publicar')).toBeDefined();
    expect(screen.getByText('Archivar')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
  });

  it('selects all posts when clicking select-all checkbox', () => {
    render(<CmsPosts posts={samplePosts} meta={{ total: 2, page: 1, totalPages: 1 }} filters={{}} />);
    
    const selectAll = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAll);

    expect(screen.getByText('2 seleccionadas')).toBeDefined();
  });
});
