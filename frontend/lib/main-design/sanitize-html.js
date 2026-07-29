import sanitizeHtml from 'sanitize-html';

const EDITORIAL_HTML_OPTIONS = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
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
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.facebook.com'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlToPlainText(value) {
  return sanitizeHtml(String(value || ''), {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text.replace(/\s+/g, ' '),
  }).trim();
}

function textToEditorialHtml(value) {
  const blocks = String(value || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => segmentToEditorialHtml(block, 'p')).join('\n');
}

function splitInlineBreaks(value) {
  return String(value || '')
    .split(/(?:\s*<br\s*\/?>\s*){2,}/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function splitSoftLines(value) {
  return String(value || '')
    .split(/\s*<br\s*\/?>\s*|\n+/i)
    .map((line) => htmlToPlainText(line))
    .filter(Boolean);
}

function listHtmlFromSegment(segment) {
  const lines = splitSoftLines(segment);

  if (lines.length < 2) {
    return null;
  }

  const unordered = lines.every((line) => /^[-*•]\s+/.test(line));
  const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));

  if (!unordered && !ordered) {
    return null;
  }

  const tag = ordered ? 'ol' : 'ul';
  const items = lines
    .map((line) => line.replace(/^[-*•]\s+|^\d+[.)]\s+/, '').trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  return items ? `<${tag}>${items}</${tag}>` : null;
}

function splitLeadHeading(text) {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  const firstSentence = cleanText.match(/^(.{24,170}?[.:])\s+(.{80,})$/);

  if (!firstSentence) {
    return null;
  }

  const heading = firstSentence[1].trim();
  const rest = firstSentence[2].trim();

  if (heading.split(/\s+/).length > 24) {
    return null;
  }

  return { heading, rest };
}

function isHeadingCandidate(segment, originalTag) {
  const text = htmlToPlainText(segment);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const originalHeading = /^h[1-6]$/i.test(originalTag);

  return originalHeading && text.length <= 170 && wordCount <= 24;
}

function segmentToEditorialHtml(segment, originalTag = 'p') {
  const listHtml = listHtmlFromSegment(segment);

  if (listHtml) {
    return listHtml;
  }

  const text = htmlToPlainText(segment);

  if (!text) {
    return '';
  }

  if (/^h[1-6]$/i.test(originalTag)) {
    const split = splitLeadHeading(text);

    if (split) {
      return `<h2>${escapeHtml(split.heading)}</h2>\n<p>${escapeHtml(split.rest)}</p>`;
    }
  }

  if (isHeadingCandidate(segment, originalTag)) {
    return `<h2>${segment.trim()}</h2>`;
  }

  return `<p>${segment.trim()}</p>`;
}

export function normalizeEditorialHtml(value) {
  const safeHtml = sanitizeHtml(String(value || ''), EDITORIAL_HTML_OPTIONS).trim();

  if (!safeHtml) {
    return '';
  }

  const hasEditorialTags = /<(?:p|h[1-6]|ul|ol|li|blockquote|figure|img|iframe)\b/i.test(safeHtml);

  if (!hasEditorialTags) {
    return sanitizeHtml(textToEditorialHtml(safeHtml), EDITORIAL_HTML_OPTIONS).trim();
  }

  const normalized = safeHtml.replace(/<(p|h[1-6]|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, _attributes, inner) => {
    const segments = splitInlineBreaks(inner);

    if (segments.length < 2) {
      const text = htmlToPlainText(inner);

      if (/^h[1-6]$/i.test(tag) && text.length > 220) {
        return segmentToEditorialHtml(inner, tag);
      }

      return match;
    }

    return segments
      .map((segment) => segmentToEditorialHtml(segment, tag))
      .filter(Boolean)
      .join('\n');
  });

  return sanitizeHtml(normalized, EDITORIAL_HTML_OPTIONS).trim();
}

export function sanitizeEditorialHtml(value) {
  return normalizeEditorialHtml(value);
}
