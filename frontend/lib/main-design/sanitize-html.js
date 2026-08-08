import sanitizeHtml from 'sanitize-html';

const EDITORIAL_HTML_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'div',
    'span',
    'img',
    'figure',
    'figcaption',
    'iframe',
    'picture',
    'source',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ]),
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'title', 'aria-label', 'aria-describedby'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'title'],
    source: ['src', 'srcset', 'type', 'media', 'sizes'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
    source: ['http', 'https'],
    iframe: ['http', 'https'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtu.be', 'player.vimeo.com', 'www.facebook.com'],
  transformTags: {
    a: (tagName, attribs) => {
      const isInternal = attribs.href && (attribs.href.startsWith('/') || attribs.href.startsWith('#'));
      return {
        tagName: 'a',
        attribs: {
          ...attribs,
          target: attribs.target || '_blank',
          rel: isInternal ? attribs.rel || '' : 'noopener noreferrer',
        },
      };
    },
  },
};

export function sanitizeEditorialHtml(value) {
  return sanitizeHtml(String(value || ''), EDITORIAL_HTML_OPTIONS).trim();
}
