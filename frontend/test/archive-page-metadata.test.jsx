import { describe, expect, it } from 'vitest';
import { generateMetadata } from '../app/archivo/page.jsx';

describe('archive page metadata', () => {
  it('uses a distinct canonical for paginated archive pages', async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ page: '2' }),
    });

    expect(metadata.robots.index).toBe(true);
    expect(metadata.alternates.canonical).toBe('https://hackeandoelsistema.net/archivo/?page=2');
  });

  it('marks filtered archive searches as noindex', async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ q: 'economia' }),
    });

    expect(metadata.robots.index).toBe(false);
    expect(metadata.alternates.types).toBeUndefined();
  });
});
