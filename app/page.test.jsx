import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage foundation', () => {
  it('renders the Next foundation message', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        name: /base next lista para reconstruir hackeando el sistema/i,
      }),
    ).toBeInTheDocument();
  });

  it('mentions testing as a first-class concern', () => {
    render(<HomePage />);

    expect(screen.getAllByText(/testing/i).length).toBeGreaterThan(0);
  });
});
