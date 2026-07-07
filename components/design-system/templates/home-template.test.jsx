import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { homePayloadFixture } from '@/lib/contracts/public-content.fixtures';
import { HomeTemplate } from './home-template';

describe('HomeTemplate', () => {
  it('composes the expected editorial regions', () => {
    render(<HomeTemplate payload={homePayloadFixture} />);

    expect(screen.getByText(/ultimas noticias/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /abinader anuncia nuevas medidas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /lo ultimo/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tendencias/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /opinion destacada/i })).toBeInTheDocument();
  });

  it('renders polished placeholders when a migrated post has no media yet', () => {
    render(<HomeTemplate payload={homePayloadFixture} />);

    expect(screen.getAllByText('Sin imagen').length).toBeGreaterThan(0);
  });
});
