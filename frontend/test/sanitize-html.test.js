import { describe, expect, it } from 'vitest';
import { sanitizeEditorialHtml } from '../lib/main-design/sanitize-html.js';

describe('sanitizeEditorialHtml', () => {
  it('removes executable HTML while preserving editorial markup', () => {
    const html = sanitizeEditorialHtml(`
      <h2 onclick="alert(1)">Titulo</h2>
      <p>Texto <a href="javascript:alert(1)" target="_blank">link</a> <a href="mailto:redaccion@example.com">correo</a></p>
      <script>alert(1)</script>
      <iframe src="https://www.youtube.com/embed/demo" title="Video"></iframe>
      <img src="mailto:redaccion@example.com" alt="bad">
      <img src="/uploads/cms/local.jpg" alt="local">
    `);

    expect(html).toContain('<h2>Titulo</h2>');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('mailto:redaccion@example.com');
    expect(html).toContain('https://www.youtube-nocookie.com/embed/demo');
    expect(html).toContain('/uploads/cms/local.jpg');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img src="mailto:');
    expect(html).not.toContain('<script>');
  });

  it('normalizes malformed legacy blocks into readable article markup', () => {
    const html = sanitizeEditorialHtml(`
      <h1 class="wp-block-heading">La discusion publica ha querido reducir todo a redes sociales. La politica no funciona solamente por presion mediatica y necesita contexto institucional.<br><br>Claves del caso<br><br>- Primer punto<br>- Segundo punto</h1>
    `);

    expect(html).toContain('<h2>La discusion publica ha querido reducir todo a redes sociales.</h2>');
    expect(html).toContain('<p>La politica no funciona solamente por presion mediatica y necesita contexto institucional.</p>');
    expect(html).toContain('<h2>Claves del caso</h2>');
    expect(html).toContain('<ul><li>Primer punto</li><li>Segundo punto</li></ul>');
    expect(html).not.toContain('<h1');
  });

  it('turns standalone WordPress embed URLs into clickable links', () => {
    const html = sanitizeEditorialHtml(`
      <figure class="wp-block-embed is-type-wp-embed is-provider-hackeando-el-sistema">
        <div class="wp-block-embed__wrapper">
          https://hackeandoelsistema.net/quien-se-queda-con-el-dinero-de-la-gasolina-en-republica-dominicana/
        </div>
      </figure>
    `);

    expect(html).toContain(
      '<a href="https://hackeandoelsistema.net/quien-se-queda-con-el-dinero-de-la-gasolina-en-republica-dominicana/" rel="noopener noreferrer">',
    );
    expect(html).not.toContain('wp-block-embed__wrapper');
  });

  it('turns standalone YouTube URLs into safe embeds', () => {
    const html = sanitizeEditorialHtml(`
      <figure class="wp-block-embed is-type-video is-provider-youtube">
        <div class="wp-block-embed__wrapper">
          https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </div>
      </figure>
    `);

    expect(html).toContain('class="wp-block-embed-youtube"');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('allowfullscreen');
    expect(html).not.toContain('wp-block-embed__wrapper');
  });
});
