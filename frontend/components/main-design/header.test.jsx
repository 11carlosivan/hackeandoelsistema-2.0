import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header, { buildNavigation } from './header';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacto',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('buildNavigation', () => {
  it('uses only menu-enabled categories when the CMS has menu settings', () => {
    const navigation = buildNavigation([
      { name: 'Cine', slug: 'cine', showInMenu: false },
      { name: 'Politica', slug: 'politica', fullPath: '/category/politica/', showInMenu: true },
      { name: 'Nacionales', slug: 'nacionales', fullPath: '/category/nacionales/', showInMenu: true },
    ]);

    expect(navigation.map((item) => item.name)).toEqual([
      'INICIO',
      'POLITICA',
      'NACIONALES',
      'DEPORTES',
      'EMPLEOS',
      'CONTACTO',
      'ARCHIVO',
    ]);
  });

  it('deduplicates equivalent category paths before rendering the menu', () => {
    const navigation = buildNavigation([
      { name: 'Politica', slug: 'politica', fullPath: '/category/politica/', showInMenu: true },
      { name: 'Politica duplicada', slug: 'politica', showInMenu: true },
    ]);

    expect(navigation.filter((item) => item.path === '/category/politica/')).toHaveLength(1);
  });
});

describe('Header component navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
  });

  it('allows clicking the logo to navigate home without preventing default', () => {
    render(<Header categories={[{ name: 'Politica', slug: 'politica' }]} />);
    const logoImg = screen.getByAltText('Hackeando el Sistema');
    const logoLink = logoImg.closest('a');

    expect(logoLink).toHaveAttribute('href', '/');

    const firstClick = fireEvent.click(logoLink);
    const secondClick = fireEvent.click(logoLink);

    expect(firstClick).toBe(true);
    expect(secondClick).toBe(true);
  });

  it('closes the mobile menu when a category link is clicked', () => {
    render(<Header categories={[{ name: 'Politica', slug: 'politica' }]} />);
    const menuBtn = screen.getByTitle('Menu');

    fireEvent.click(menuBtn);
    expect(screen.getByText('CATEGORIAS Y SECCIONES')).toBeInTheDocument();

    const mobilePoliticaLinks = screen.getAllByText('POLITICA');
    fireEvent.click(mobilePoliticaLinks[mobilePoliticaLinks.length - 1]);

    expect(screen.queryByText('CATEGORIAS Y SECCIONES')).not.toBeInTheDocument();
  });
});
