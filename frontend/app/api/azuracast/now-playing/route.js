import {
  buildAzuraCastNowPlayingUrl,
  buildAzuraCastPublicPageUrl,
  normalizeAzuraCastNowPlaying,
} from '@/lib/main-design/azuracast';

export const dynamic = 'force-dynamic';

function jsonResponse(payload, { status = 200, cacheSeconds = 20 } = {}) {
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 3}`,
    },
  });
}

export async function GET() {
  const baseUrl = process.env.AZURACAST_BASE_URL || process.env.NEXT_PUBLIC_AZURACAST_BASE_URL;
  const station = process.env.AZURACAST_STATION || process.env.NEXT_PUBLIC_AZURACAST_STATION;
  const streamUrl = process.env.AZURACAST_STREAM_URL || process.env.NEXT_PUBLIC_AZURACAST_STREAM_URL;
  const publicPageUrl = process.env.AZURACAST_PUBLIC_PAGE_URL ||
    process.env.NEXT_PUBLIC_AZURACAST_PUBLIC_PAGE_URL ||
    buildAzuraCastPublicPageUrl({ baseUrl, station });
  const nowPlayingUrl = buildAzuraCastNowPlayingUrl({ baseUrl, station });

  if (!nowPlayingUrl) {
    return jsonResponse({
      data: {
        enabled: false,
        streamUrl,
        publicPageUrl,
      },
    }, { cacheSeconds: 60 });
  }

  const timeoutMs = Number(process.env.AZURACAST_TIMEOUT_MS || 4000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(nowPlayingUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HackeandoElSistemaAzuraCast/1.0 (+https://hackeandoelsistema.net/)',
      },
      signal: controller.signal,
      next: { revalidate: 20 },
    });

    if (!response.ok) {
      return jsonResponse({
        data: {
          enabled: Boolean(streamUrl),
          streamUrl,
          publicPageUrl,
          status: 'metadata_unavailable',
        },
      }, { status: 502, cacheSeconds: 20 });
    }

    const payload = await response.json();

    return jsonResponse({
      data: normalizeAzuraCastNowPlaying(payload, {
        streamUrl,
        publicPageUrl,
      }),
    });
  } catch {
    return jsonResponse({
      data: {
        enabled: Boolean(streamUrl),
        streamUrl,
        publicPageUrl,
        status: 'metadata_unavailable',
      },
    }, { status: 504, cacheSeconds: 20 });
  } finally {
    clearTimeout(timeout);
  }
}
