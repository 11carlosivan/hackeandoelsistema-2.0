import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the dark editorial home sections', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: /abinader anuncia nuevas medidas/i })).toBeInTheDocument();
    expect(screen.getByText(/ultimas noticias/i)).toBeInTheDocument();
    expect(screen.getByText(/tendencias/i)).toBeInTheDocument();
    expect(screen.getByText(/clima en rep. dom./i)).toBeInTheDocument();
  });

  it('keeps network conversion visible without replacing editorial content', () => {
    render(<HomePage />);

    expect(screen.getAllByText(/unete al network/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /lo ultimo/i })).toBeInTheDocument();
  });
});
