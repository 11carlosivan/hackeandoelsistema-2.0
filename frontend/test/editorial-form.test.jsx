import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditorialForm from '../components/main-design/editorial-form';

function jsonResponse(payload, init = {}) {
  return Promise.resolve({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    json: async () => payload,
  });
}

describe('EditorialForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const testConfig = {
    formId: 'test-form-1',
    title: 'Convocatoria: 15 Voluntarios Android',
    description: 'Completa tus datos para participar.',
    maxResponses: 15,
    submitButtonText: 'Enviar Postulación',
    successMessage: '¡Gracias por postularte!',
    fields: [
      { id: 'name', label: 'Nombre completo', type: 'text', enabled: true, required: true },
      { id: 'email', label: 'Correo electrónico', type: 'email', enabled: true, required: true },
      { id: 'phone', label: 'Teléfono / WhatsApp', type: 'tel', enabled: true, required: true },
      { id: 'device', label: 'Dispositivo / Versión de Android', type: 'text', enabled: true, required: true },
      { id: 'terms', label: 'Acepto participar como voluntario', type: 'checkbox', enabled: true, required: true },
    ],
  };

  it('renders form title, inputs and cupos limit badge', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/status')) {
        return jsonResponse({
          data: {
            active: true,
            count: 2,
            maxResponses: 15,
            remainingSlots: 13,
            isFull: false,
          },
        });
      }
      return jsonResponse({ ok: true });
    });

    render(<EditorialForm config={testConfig} postId="post-123" />);

    expect(screen.getByText('Convocatoria: 15 Voluntarios Android')).toBeDefined();
    expect(screen.getByText('Completa tus datos para participar.')).toBeDefined();
    expect(screen.getByText('Enviar Postulación')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('13 / 15')).toBeDefined();
    });
  });

  it('submits valid form data and shows success confirmation', async () => {
    let submittedPayload = null;

    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/status')) {
        return jsonResponse({
          data: { active: true, count: 2, maxResponses: 15, remainingSlots: 13, isFull: false },
        });
      }
      if (url.includes('/submit')) {
        submittedPayload = JSON.parse(opts.body);
        return jsonResponse({
          ok: true,
          message: '¡Gracias por postularte!',
          remainingSlots: 12,
        });
      }
      return jsonResponse({ ok: true });
    });

    render(<EditorialForm config={testConfig} postId="post-123" />);

    // Fill form fields
    const nameInput = screen.getByPlaceholderText(/ingresa nombre completo/i);
    const emailInput = screen.getByPlaceholderText('tu-correo@ejemplo.com');
    const phoneInput = screen.getByPlaceholderText('Ej: +1 829 000 0000');
    const deviceInput = screen.getByPlaceholderText('Ej: Samsung S23, Xiaomi 13 (Android 14)');
    const termsCheckbox = screen.getByRole('checkbox');

    fireEvent.change(nameInput, { target: { value: 'Carlos Desarrollador' } });
    fireEvent.change(emailInput, { target: { value: 'carlos@hackeandoelsistema.net' } });
    fireEvent.change(phoneInput, { target: { value: '+18295551234' } });
    fireEvent.change(deviceInput, { target: { value: 'Google Pixel 8' } });
    fireEvent.click(termsCheckbox);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /enviar postulación/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('¡Postulación Recibida con Éxito!')).toBeDefined();
      expect(screen.getByText('¡Gracias por postularte!')).toBeDefined();
    });

    expect(submittedPayload).toMatchObject({
      formId: 'test-form-1',
      postId: 'post-123',
      formTitle: 'Convocatoria: 15 Voluntarios Android',
      data: {
        name: 'Carlos Desarrollador',
        email: 'carlos@hackeandoelsistema.net',
        phone: '+18295551234',
        device: 'Google Pixel 8',
        terms: true,
      },
    });
  });
});
