import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OfflineReadButton from './offline-read-button';
import { clearOfflineArticles, getOfflineArticles } from '@/lib/main-design/offline-storage';

describe('OfflineReadButton component', () => {
  beforeEach(() => {
    clearOfflineArticles();
  });

  const mockArticle = {
    id: 'noticia-101',
    slug: 'noticia-importante-offline',
    title: 'Noticia Para Leer Sin Internet',
    subtitle: 'Resumen de prueba',
    contentHtml: '<p>Texto completo</p>',
    image: '/test.jpg',
  };

  it('renders initial state with "Leer sin Conexión"', () => {
    render(<OfflineReadButton article={mockArticle} />);
    expect(screen.getByText('Leer sin Conexión')).toBeDefined();
  });

  it('toggles saved state when clicked', () => {
    render(<OfflineReadButton article={mockArticle} />);
    const button = screen.getByRole('button', { name: /Guardar para leer sin conexión/i });

    fireEvent.click(button);
    expect(screen.getByText('Guardado Offline')).toBeDefined();
    expect(getOfflineArticles()).toHaveLength(1);

    // Click again to remove
    fireEvent.click(button);
    expect(screen.getByText('Leer sin Conexión')).toBeDefined();
    expect(getOfflineArticles()).toHaveLength(0);
  });
});
