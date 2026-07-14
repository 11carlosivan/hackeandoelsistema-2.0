import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleStructuredData } from './structured-data';

describe('ArticleStructuredData', () => {
  it('escapes script-breaking characters inside JSON-LD', () => {
    const { container } = render(
      <ArticleStructuredData
        article={{
          id: 'xss-check',
          title: '</script><script>alert(1)</script>',
          subtitle: 'Prueba',
          image: '/isotipo.png',
          route: '/xss-check/',
          publishedAt: '2026-07-12T00:00:00.000Z',
        }}
        author={{ id: 'redaccion', name: 'Redaccion' }}
      />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script.innerHTML).not.toContain('</script>');
    expect(script.innerHTML).toContain('\\u003c/script\\u003e');
  });

  it('uses canonical author paths in article JSON-LD', () => {
    const { container } = render(
      <ArticleStructuredData
        article={{
          id: 'post-demo',
          title: 'Post demo',
          subtitle: 'Prueba',
          image: '/isotipo.png',
          route: '/post-demo/',
          authorPath: '/author/redaccion/',
        }}
        author={{ id: '11111111-1111-4111-8111-111111111111', name: 'Redaccion' }}
      />,
    );

    const data = JSON.parse(container.querySelector('script[type="application/ld+json"]').innerHTML);

    expect(data.author.url).toBe('https://hackeandoelsistema.net/author/redaccion/');
  });
});
