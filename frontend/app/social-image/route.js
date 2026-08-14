import sharp from 'sharp';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_HOSTS = new Set(['image.hackeandoelsistema.net']);
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const SOCIAL_WIDTH = 1200;
const SOCIAL_HEIGHT = 630;

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function sourceUrlFromRequest(request) {
  const source = new URL(request.url).searchParams.get('src');

  if (!source) {
    return null;
  }

  try {
    const sourceUrl = new URL(source);

    if (sourceUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(sourceUrl.hostname)) {
      return null;
    }

    return sourceUrl;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const sourceUrl = sourceUrlFromRequest(request);

  if (!sourceUrl) {
    return jsonError('Invalid image source', 400);
  }

  const upstream = await fetch(sourceUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*',
      'User-Agent': 'HackeandoElSistemaSocialImage/1.0',
    },
    next: { revalidate: 604800 },
  });

  if (!upstream.ok) {
    return jsonError('Image source unavailable', 502);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const declaredLength = Number(upstream.headers.get('content-length') || 0);

  if (!contentType.toLowerCase().startsWith('image/')) {
    return jsonError('Source is not an image', 415);
  }

  if (declaredLength > MAX_SOURCE_BYTES) {
    return jsonError('Source image too large', 413);
  }

  const sourceBuffer = Buffer.from(await upstream.arrayBuffer());

  if (sourceBuffer.byteLength > MAX_SOURCE_BYTES) {
    return jsonError('Source image too large', 413);
  }

  const socialBuffer = await sharp(sourceBuffer, { failOn: 'none' })
    .rotate()
    .resize(SOCIAL_WIDTH, SOCIAL_HEIGHT, {
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new NextResponse(socialBuffer, {
    headers: {
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
      'Content-Length': String(socialBuffer.byteLength),
      'Content-Type': 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
