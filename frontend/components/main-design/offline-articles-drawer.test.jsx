import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OfflineArticlesDrawer from './offline-articles-drawer';
import { clearOfflineArticles, saveArticleOffline } from '@/lib/main-design/offline-storage';

describe('OfflineArticlesDrawer component', () => {
  beforeEach(() => {
    clearOfflineArticles();
  });

  it('renders nothing by default when closed', () => {
    const { container } = render(<OfflineArticlesDrawer />);
    expect(container.firstChild).toBeNull();
  });

  it('opens on hes-open-offline-drawer event and shows empty state', () => {
    render(<OfflineArticlesDrawer />);
    fireEvent(window, new CustomEvent('hes-open-offline-drawer'));

    expect(screen.getByText(/Lecturas Sin Conexión/i)).toBeDefined();
    expect(screen.getByText(/No hay artículos guardados/i)).toBeDefined();
  });

  it('lists saved articles and allows viewing them', () => {
    saveArticleOffline({
      id: 'noticia-1',
      slug: 'noticia-1',
      title: 'Noticia Guardada Test',
      subtitle: 'Subtítulo test',
      contentHtml: '<p>Contenido del artículo offline</p>',
    });

    render(<OfflineArticlesDrawer />);
    fireEvent(window, new CustomEvent('hes-open-offline-drawer'));

    expect(screen.getByText('Noticia Guardada Test')).toBeDefined();
    expect(screen.getByText('LEER AHORA')).toBeDefined();

    // Click to read
    fireEvent.click(screen.getByText('LEER AHORA'));
    expect(screen.getByText(/MODO LECTURA SIN CONEXIÓN/i)).toBeDefined();
    expect(screen.getByText('Contenido del artículo offline')).toBeDefined();
  });
});
