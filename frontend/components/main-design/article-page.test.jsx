import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArticlePageView } from './article-page';
import { articles as fallbackArticles } from '@/lib/main-design/mock-data';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}));

describe('ArticlePageView', () => {
  it('does not inject mock related articles into API-backed articles', () => {
    render(
      <ArticlePageView
        article={{
          id: 'api-post',
          title: 'Articulo real importado',
          subtitle: 'Contenido real desde la API',
          category: fallbackArticles[0].category,
          authorId: 'author-1',
          authorName: 'Redaccion real',
          date: '07 JUL 2026',
          image: '/isotipo.png',
          content: [{ type: 'paragraph', text: 'Cuerpo del articulo real.' }],
        }}
      />,
    );

    expect(screen.getByText('Articulo real importado')).toBeInTheDocument();
    expect(screen.getByText(/No hay publicaciones relacionadas disponibles/i)).toBeInTheDocument();
    expect(screen.queryByText(fallbackArticles[0].title)).not.toBeInTheDocument();
  });
});
