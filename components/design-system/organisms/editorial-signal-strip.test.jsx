import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialSignalStrip } from './editorial-signal-strip';

describe('EditorialSignalStrip', () => {
  it('renders editorial signals for the home pulse', () => {
    render(<EditorialSignalStrip />);

    expect(screen.getByText(/^divisas$/i)).toBeInTheDocument();
    expect(screen.getByText(/dolar/i)).toBeInTheDocument();
    expect(screen.getByText(/euro/i)).toBeInTheDocument();
    expect(screen.getByText(/hoy/i)).toBeInTheDocument();
    expect(screen.getByText(/^combustibles$/i)).toBeInTheDocument();
    expect(screen.getByText(/premium/i)).toBeInTheDocument();
    expect(screen.getByText(/regular/i)).toBeInTheDocument();
    expect(screen.getByText(/gasoil/i)).toBeInTheDocument();
    expect(screen.getByText(/glp/i)).toBeInTheDocument();
    expect(screen.queryByText(/fuentes/i)).not.toBeInTheDocument();
  });
});
