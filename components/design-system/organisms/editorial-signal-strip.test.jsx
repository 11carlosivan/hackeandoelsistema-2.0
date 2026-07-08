import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialSignalStrip } from './editorial-signal-strip';

describe('EditorialSignalStrip', () => {
  it('renders editorial signals for the home pulse', () => {
    render(<EditorialSignalStrip />);

    expect(screen.getByText(/pulso politico/i)).toBeInTheDocument();
    expect(screen.getByText(/dolar vigilado/i)).toBeInTheDocument();
    expect(screen.getByText(/alertas activas/i)).toBeInTheDocument();
    expect(screen.getByText(/\+5k miembros/i)).toBeInTheDocument();
  });
});
