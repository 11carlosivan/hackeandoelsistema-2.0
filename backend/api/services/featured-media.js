const IMAGE_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;
const DEFAULT_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_ORIGIN || 'https://hackeandoelsistema.net').replace(/\/+$/g, '');

function cleanImageUrl(value, siteUrl = DEFAULT_SITE_URL) {
  const rawValue = String(value || '').trim();

  if (!rawValue || rawValue.startsWith('data:') || rawValue.startsWith('blob:') || rawValue.startsWith('javascript:')) {
    return null;
  }

  try {
    const url = rawValue.startsWith('/') ? new URL(rawValue, siteUrl) : new URL(rawValue);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

export function firstImageUrlFromHtml(value, { siteUrl = DEFAULT_SITE_URL } = {}) {
  const match = IMAGE_SRC_RE.exec(String(value || ''));
  const rawUrl = match?.[1] || match?.[2] || match?.[3];

  return cleanImageUrl(rawUrl, siteUrl);
}

function diskForImageUrl(value, siteUrl = DEFAULT_SITE_URL) {
  try {
    const url = new URL(value);
    const site = new URL(siteUrl);

    if (url.hostname === 'image.hackeandoelsistema.net') {
      return 'remote_php';
    }

    if (url.hostname === site.hostname && url.pathname.startsWith('/uploads/cms/')) {
      return 'local';
    }

    if (url.pathname.startsWith('/wp-content/uploads/')) {
      return 'wordpress';
    }
  } catch {
    return 'external';
  }

  return 'external';
}

function mimeTypeForImageUrl(value) {
  const pathname = (() => {
    try {
      return new URL(value).pathname.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';

  return 'image/jpeg';
}

function fileNameForImageUrl(value) {
  try {
    const pathname = new URL(value).pathname;
    const fileName = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '').trim();

    return fileName || 'featured-image.jpg';
  } catch {
    return 'featured-image.jpg';
  }
}

export async function ensureFeaturedMediaFromPostContent(prisma, post, { siteUrl = DEFAULT_SITE_URL } = {}) {
  if (post?.featuredMediaId) {
    return post.featuredMediaId;
  }

  const imageUrl = firstImageUrlFromHtml(post?.contentHtml, { siteUrl });

  if (!imageUrl) {
    return null;
  }

  const url = new URL(imageUrl);
  const path = url.pathname;
  const existing = await prisma.mediaAsset.findFirst({
    where: {
      OR: [
        { url: imageUrl },
        { originalUrl: imageUrl },
        { path },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existing?.id) {
    return existing.id;
  }

  const media = await prisma.mediaAsset.create({
    data: {
      disk: diskForImageUrl(imageUrl, siteUrl),
      url: imageUrl,
      path,
      originalUrl: imageUrl,
      mimeType: mimeTypeForImageUrl(imageUrl),
      fileName: fileNameForImageUrl(imageUrl),
      altText: String(post?.title || '').trim().slice(0, 255) || null,
      caption: String(post?.title || '').trim() || null,
    },
    select: {
      id: true,
    },
  });

  return media.id;
}
