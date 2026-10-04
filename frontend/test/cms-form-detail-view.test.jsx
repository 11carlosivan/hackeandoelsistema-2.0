import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CmsFormDetailView from '../components/main-design/cms-form-detail-view';

function jsonResponse(payload, init = {}) {
  return Promise.resolve({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    json: async () => payload,
  });
}

describe('CmsFormDetailView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockForm = {
    id: 'FORM-1791084920131',
    title: 'Convocatoria: 15 Voluntarios Android',
    description: 'Completa tus datos para ser uno de los 15 testers exclusivos.',
    isActive: true,
    maxResponses: 15,
    submissions: [
      {
        id: 'SUB-12345',
        formId: 'FORM-1791084920131',
        createdAt: '2026-10-03T23:44:00.000Z',
        ipAddress: '192.168.1.1',
        data: {
          name: 'carlos ivan castillo feliz',
          email: 'carlosivancastillofeliz@gmail.com',
          phone: '8094317570',
          device: 'Xiaomi',
          terms: true,
        },
      },
    ],
  };

  it('renders submissions and handles deletion via custom cyberpunk modal', async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'DELETE') {
        return jsonResponse({ success: true });
      }
      return jsonResponse({ ok: true });
    });

    render(<CmsFormDetailView form={mockForm} />);

    // Verify submission row is rendered
    expect(screen.getByText('carlos ivan castillo feliz')).toBeDefined();
    expect(screen.getByText('carlosivancastillofeliz@gmail.com')).toBeDefined();
    expect(screen.getByText('8094317570')).toBeDefined();

    // Verify custom modal is not visible initially
    expect(screen.queryByText('CONFIRMAR ELIMINACIÓN')).toBeNull();

    // Click "Eliminar" button on row
    const deleteBtn = screen.getByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteBtn);

    // Modal should now be visible with tactical styling & details
    expect(screen.getByText(/\[ ACCIÓN DESTRUCTIVA \]/i)).toBeDefined();
    expect(screen.getByRole('heading', { name: /eliminar registro/i })).toBeDefined();
    expect(screen.getByText('CONFIRMAR ELIMINACIÓN')).toBeDefined();
    expect(screen.getByText('[ CANCELAR ]')).toBeDefined();

    // Test cancel
    const cancelBtn = screen.getByText('[ CANCELAR ]');
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('CONFIRMAR ELIMINACIÓN')).toBeNull();

    // Open again and confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    const confirmBtn = screen.getByText('CONFIRMAR ELIMINACIÓN');
    fireEvent.click(confirmBtn);

    // Wait for submission to be removed and feedback banner shown
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/SUB-12345'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(screen.queryByText('carlos ivan castillo feliz')).toBeNull();
      expect(screen.getByText(/La postulación fue eliminada correctamente/i)).toBeDefined();
    });
  });

  it('allows editing cupos límite dynamically', async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body || '{}');
        return jsonResponse({
          ok: true,
          data: {
            id: 'FORM-1791084920131',
            maxResponses: body.maxResponses,
          },
        });
      }
      return jsonResponse({ ok: true });
    });

    render(<CmsFormDetailView form={mockForm} />);

    // Initially displays 15
    expect(screen.getByText('15')).toBeDefined();

    // Click "Cambiar cupo"
    const editLimitBtn = screen.getByTitle('Cambiar límite de cupos');
    fireEvent.click(editLimitBtn);

    // Form appears with input
    const input = screen.getByDisplayValue('15');
    fireEvent.change(input, { target: { value: '25' } });

    // Submit form
    const saveBtn = screen.getByText('Guardar');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/cms/forms/FORM-1791084920131'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ maxResponses: 25 }),
        })
      );
      expect(screen.getByText('25')).toBeDefined();
      expect(screen.getByText(/Límite de cupos actualizado a 25 voluntarios con éxito/i)).toBeDefined();
    });
  });
});
