import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CmsAutoPostPanel from '../components/main-design/cms-auto-post-panel';

function jsonResponse(payload, init = {}) {
  return Promise.resolve({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    json: async () => payload,
  });
}

describe('CmsAutoPostPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCategories = [
    { id: 'cat-1', name: 'Tecnología' },
    { id: 'cat-2', name: 'Ciberseguridad' },
  ];

  it('renders master ON/OFF switch in inactive state initially and shows brand protection cards', () => {
    render(
      <CmsAutoPostPanel
        initialSettings={{
          isEnabled: false,
          intervalMinutes: 30,
          sources: 'https://ejemplo.com/rss',
          aiProvider: 'gemini',
        }}
        categories={mockCategories}
      />
    );

    // Master Switch state: OFF
    expect(screen.getByText('MOTOR AUTO-POST IA: EN PAUSA')).toBeDefined();
    expect(screen.getByText('Automatización de Noticias Apagada')).toBeDefined();
    expect(screen.getByRole('button', { name: /switch: apagado/i })).toBeDefined();

    // 3-Tier Brand Protection Card
    expect(screen.getByText('Protección de Marca & Filtro Legal de Imágenes')).toBeDefined();
    expect(screen.getByText('1. Anti-Logos de Fuente')).toBeDefined();
    expect(screen.getByText('2. Búsqueda de Fotos Limpias')).toBeDefined();
    expect(screen.getByText('3. Portada Oficial HES')).toBeDefined();
  });

  it('toggles switch from OFF to ON when clicking the switch button', async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/cms/auto-post/toggle')) {
        const body = JSON.parse(options?.body || '{}');
        return jsonResponse({
          data: {
            settings: {
              isEnabled: body.isEnabled,
              intervalMinutes: 30,
            },
            message: body.isEnabled ? 'Auto-Post activado exitosamente.' : 'Auto-Post pausado.',
          },
        });
      }
      return jsonResponse({ ok: true });
    });

    render(
      <CmsAutoPostPanel
        initialSettings={{
          isEnabled: false,
          intervalMinutes: 30,
        }}
        categories={mockCategories}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /switch: apagado/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('MOTOR AUTO-POST IA: EN LÍNEA')).toBeDefined();
      expect(screen.getByText('Automatización de Noticias Activa')).toBeDefined();
      expect(screen.getByRole('button', { name: /switch: encendido/i })).toBeDefined();
    });
  });

  it('saves settings with intervalMinutes and isEnabled', async () => {
    let capturedBody = null;
    global.fetch = vi.fn().mockImplementation((url, options) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/cms/auto-post/settings')) {
        capturedBody = JSON.parse(options?.body || '{}');
        return jsonResponse({
          data: {
            settings: {
              ...capturedBody,
              apiKeyConfigured: true,
            },
            message: 'Configuración guardada.',
          },
        });
      }
      return jsonResponse({ ok: true });
    });

    render(
      <CmsAutoPostPanel
        initialSettings={{
          isEnabled: true,
          intervalMinutes: 60,
          sources: 'https://noticias.com/feed',
        }}
        categories={mockCategories}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /guardar configuración/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(capturedBody).toBeDefined();
      expect(capturedBody.isEnabled).toBe(true);
      expect(capturedBody.intervalMinutes).toBe(60);
      expect(capturedBody.sources).toBe('https://noticias.com/feed');
    });
  });
});
