import { describe, expect, it } from 'vitest';
import { sanitizeEditorialHtml } from '../lib/main-design/sanitize-html.js';

describe('sanitizeEditorialHtml', () => {
  it('removes executable HTML while preserving editorial markup', () => {
    const html = sanitizeEditorialHtml(`
      <h2 onclick="alert(1)">Titulo</h2>
      <p>Texto <a href="javascript:alert(1)" target="_blank">link</a></p>
      <script>alert(1)</script>
      <iframe src="https://www.youtube.com/embed/demo" title="Video"></iframe>
    `);

    expect(html).toContain('<h2>Titulo</h2>');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://www.youtube.com/embed/demo');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script>');
  });
});
