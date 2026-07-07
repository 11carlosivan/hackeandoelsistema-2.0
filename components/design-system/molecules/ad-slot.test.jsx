import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdSlot } from './ad-slot';

describe('AdSlot', () => {
  it('renders an empty ad placeholder with stable label', () => {
    render(<AdSlot slot={{ code: 'home-top', location: 'home.top', width: 970, height: 250, activeAd: null }} />);

    expect(screen.getByLabelText('Publicidad home-top')).toBeInTheDocument();
    expect(screen.getByText('Espacio publicitario')).toBeInTheDocument();
  });

  it('renders active ad title when no image exists', () => {
    render(
      <AdSlot
        slot={{
          code: 'sidebar',
          location: 'article.sidebar',
          width: 300,
          height: 250,
          activeAd: {
            title: 'Campana institucional',
            imageUrl: null,
            targetUrl: 'https://example.com',
            sponsorName: 'Sponsor',
          },
        }}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('Campana institucional')).toBeInTheDocument();
  });
});
