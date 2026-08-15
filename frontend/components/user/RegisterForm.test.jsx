import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RegisterForm from './RegisterForm';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

function jsonResponse(payload, init = {}) {
  return Promise.resolve({
    ok: init.status ? init.status >= 200 && init.status < 300 : true,
    status: init.status || 200,
    json: async () => payload,
  });
}

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it('creates an account through the auth API and redirects', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      expect(String(url)).toBe(`${window.location.origin}/api/v1/auth/register`);
      expect(options.credentials).toBe('include');
      expect(JSON.parse(options.body)).toEqual({
        displayName: 'Lector HES',
        email: 'lector@example.com',
        password: 'CorrectHorse123!',
      });

      return jsonResponse({
        data: {
          user: {
            id: 'reader-1',
            email: 'lector@example.com',
          },
        },
      }, { status: 201 });
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lector HES' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lector@example.com' } });
    fireEvent.change(screen.getByLabelText('Clave'), { target: { value: 'CorrectHorse123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar clave'), { target: { value: 'CorrectHorse123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/perfil/reader-1/'));
    expect(refresh).toHaveBeenCalled();
  });

  it('does not call the API when passwords do not match', () => {
    global.fetch = vi.fn();

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Lector HES' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lector@example.com' } });
    fireEvent.change(screen.getByLabelText('Clave'), { target: { value: 'CorrectHorse123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar clave'), { target: { value: 'DifferentHorse123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByText('Las claves no coinciden.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
