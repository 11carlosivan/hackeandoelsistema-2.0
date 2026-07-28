import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleEngagement from './article-engagement';

const article = {
  title: 'Articulo de prueba',
  subtitle: 'Resumen de prueba',
  route: '/articulo-de-prueba/',
  likeCount: 1,
  saveCount: 0,
  shareCount: 0,
  commentCount: 0,
  raw: {
    id: '22222222-2222-4222-8222-222222222222',
  },
};

function jsonResponse(payload, init = {}) {
  return Promise.resolve({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    json: async () => payload,
  });
}

describe('ArticleEngagement', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    global.fetch = vi.fn((url, options = {}) => {
      const pathname = new URL(String(url)).pathname;

      if (pathname.endsWith('/engagement')) {
        return jsonResponse({
          data: {
            liked: false,
            saved: false,
            authenticated: true,
            counts: {
              likes: 3,
              saves: 1,
              shares: 2,
              comments: 0,
            },
          },
        });
      }

      if (pathname.endsWith('/like')) {
        expect(JSON.parse(options.body)).toEqual({ liked: true });
        return jsonResponse({ data: { liked: true, likeCount: 4 } });
      }

      if (pathname.endsWith('/save')) {
        expect(JSON.parse(options.body)).toEqual({ saved: true });
        return jsonResponse({ data: { saved: true, saveCount: 2 } });
      }

      if (pathname.endsWith('/share')) {
        expect(JSON.parse(options.body)).toEqual({ channel: 'copy' });
        return jsonResponse({ data: { shareCount: 3 } });
      }

      if (pathname.endsWith('/comments')) {
        expect(JSON.parse(options.body)).toMatchObject({
          authorName: 'Visitante',
          authorEmail: 'visitante@example.com',
          body: 'Comentario de prueba',
        });
        return jsonResponse({
          data: {
            moderation: {
              message: 'Comentario recibido y pendiente de moderacion.',
            },
          },
        }, { status: 201 });
      }

      return jsonResponse({ message: 'Not found' }, { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads engagement state and performs article actions', async () => {
    render(<ArticleEngagement article={article} />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    const [likeButton, saveButton, shareButton] = screen.getAllByRole('button');
    fireEvent.click(likeButton);
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());

    fireEvent.click(saveButton);
    await waitFor(() => expect(screen.getByText('Guardado en tu cuenta.')).toBeInTheDocument());

    fireEvent.click(shareButton);
    await waitFor(() => expect(screen.getByText('Enlace copiado.')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Nombre'), { target: { value: 'Visitante' } });
    fireEvent.change(screen.getByPlaceholderText('Email opcional'), { target: { value: 'visitante@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Escribe un comentario para moderacion'), {
      target: { value: 'Comentario de prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comentario' }));

    await waitFor(() => expect(screen.getByText('Comentario recibido y pendiente de moderacion.')).toBeInTheDocument());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/articulo-de-prueba/');
  });
});
