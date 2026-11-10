import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatrixTerminalModal from './matrix-terminal-modal';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('MatrixTerminalModal component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing by default', () => {
    const { container } = render(<MatrixTerminalModal />);
    expect(container.firstChild).toBeNull();
  });

  it('opens when hes-trigger-matrix event is dispatched', () => {
    render(<MatrixTerminalModal />);
    fireEvent(window, new CustomEvent('hes-trigger-matrix'));

    expect(screen.getByText(/MODO TERMINAL CLASIFICADO/i)).toBeDefined();
    expect(screen.getByText(/8,385 ARCHIVOS/i)).toBeDefined();
  });

  it('closes when SALIR [ESC] button is clicked', () => {
    render(<MatrixTerminalModal />);
    fireEvent(window, new CustomEvent('hes-trigger-matrix'));

    const exitBtn = screen.getByRole('button', { name: /SALIR \[ESC\]/i });
    fireEvent.click(exitBtn);

    expect(screen.queryByText(/HES-OS KERNEL v2.4/i)).toBeNull();
  });

  it('handles help command execution', () => {
    render(<MatrixTerminalModal />);
    fireEvent(window, new CustomEvent('hes-trigger-matrix'));

    const input = screen.getByPlaceholderText(/Escribe un comando/i);
    fireEvent.change(input, { target: { value: 'ayuda' } });
    fireEvent.submit(input.closest('form'));

    expect(screen.getByText(/COMANDOS DISPONIBLES:/i)).toBeDefined();
  });
});
