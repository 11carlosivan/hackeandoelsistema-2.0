import { describe, expect, it } from 'vitest';
import { buildNavigation } from './header';

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
