import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title and body', () => {
    render(<EmptyState title="Sin resultados" body="No hay contenido para esta consulta." />);

    expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument();
    expect(screen.getByText('No hay contenido para esta consulta.')).toBeInTheDocument();
  });
});
