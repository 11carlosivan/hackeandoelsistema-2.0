import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChristmasLights from './christmas-lights';

describe('ChristmasLights component', () => {
  it('renders decorative lights container with aria-hidden and pointer-events-none', () => {
    const { container } = render(<ChristmasLights />);
    const wrapper = container.querySelector('[aria-hidden="true"]');

    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('pointer-events-none');
    expect(wrapper).toHaveClass('overflow-hidden');
  });

  it('renders light bulb segments across the garland with festive colors and animations', () => {
    const { container } = render(<ChristmasLights />);
    const svgs = container.querySelectorAll('svg');

    expect(svgs.length).toBeGreaterThanOrEqual(40);

    const firstBulb = container.querySelector('.holiday-bulb-group');
    expect(firstBulb).toBeInTheDocument();
    expect(firstBulb.style.getPropertyValue('--color')).toBeTruthy();
    expect(firstBulb.style.getPropertyValue('--glow')).toBeTruthy();
  });
});

