import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicHeader } from './public-header';

describe('PublicHeader', () => {
  it('renders primary navigation and utility actions', () => {
    render(<PublicHeader />);

    expect(screen.getByLabelText('Hackeando el Sistema')).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: /inicio/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /unete al network/i })).toBeInTheDocument();
  });
});
