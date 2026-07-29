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
    expect(html).toContain('https://www.youtube.com/embed/demo');
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
});
