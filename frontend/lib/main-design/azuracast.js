const DEFAULT_POLL_SECONDS = 20;

function cleanBaseUrl(value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  try {
    const url = new URL(rawValue);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return '';
    }

    url.pathname = url.pathname.replace(/\/+$/g, '');
    url.search = '';
    url.hash = '';

    return url.href.replace(/\/+$/g, '');
  } catch {
    return '';
  }
}

function cleanStationShortcode(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

function cleanPublicUrl(value) {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  try {
    const url = new URL(rawValue);

    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeGeneratedPublicUrl(value, publicBaseUrl) {
  const cleaned = cleanPublicUrl(value);
  const base = cleanBaseUrl(publicBaseUrl);

  if (!cleaned || !base) {
    return cleaned;
  }

  try {
    const url = new URL(cleaned);
    const baseUrl = new URL(base);
    const pointsToAzuraPort = url.port === '10080';

    if (pointsToAzuraPort) {
      url.protocol = baseUrl.protocol;
      url.host = baseUrl.host;
      return url.href;
    }
  } catch {
    return cleaned;
  }

  return cleaned;
}

function normalizeTrackText(value) {
  const text = String(value || '').trim();

  return text.toLowerCase() === 'station offline' ? 'Senal en espera' : text;
}

function normalizeArtworkUrl(value, publicBaseUrl) {
  const art = normalizeGeneratedPublicUrl(value, publicBaseUrl);

  return /\/generic_song[-.]/i.test(art) ? '' : art;
}

export function isAzuraCastEnabled(env = process.env) {
  return String(env.NEXT_PUBLIC_AZURACAST_ENABLED || '').toLowerCase() === 'true';
}

export function buildAzuraCastNowPlayingUrl({ baseUrl, station }) {
  const base = cleanBaseUrl(baseUrl);
  const shortcode = cleanStationShortcode(station);

  if (!base || !shortcode) {
    return '';
  }

  return `${base}/api/nowplaying_static/${encodeURIComponent(shortcode)}.json`;
}

export function buildAzuraCastPublicPageUrl({ baseUrl, station }) {
  const base = cleanBaseUrl(baseUrl);
  const shortcode = cleanStationShortcode(station);

  if (!base || !shortcode) {
    return '';
  }

  return `${base}/public/${encodeURIComponent(shortcode)}`;
}

export function getAzuraCastClientConfig(env = process.env) {
  const enabled = isAzuraCastEnabled(env);
  const baseUrl = cleanBaseUrl(env.NEXT_PUBLIC_AZURACAST_BASE_URL);
  const station = cleanStationShortcode(env.NEXT_PUBLIC_AZURACAST_STATION);
  const streamUrl = cleanPublicUrl(env.NEXT_PUBLIC_AZURACAST_STREAM_URL);
  const publicPageUrl = cleanPublicUrl(env.NEXT_PUBLIC_AZURACAST_PUBLIC_PAGE_URL) ||
    buildAzuraCastPublicPageUrl({ baseUrl, station });

  return {
    enabled: enabled && Boolean(streamUrl || (baseUrl && station)),
    station,
    streamUrl,
    publicPageUrl,
    pollSeconds: Number(env.NEXT_PUBLIC_AZURACAST_POLL_SECONDS || DEFAULT_POLL_SECONDS),
  };
}

export function normalizeAzuraCastNowPlaying(payload, fallback = {}) {
  const station = payload?.station || {};
  const nowPlaying = payload?.now_playing || {};
  const song = nowPlaying.song || {};
  const live = payload?.live || {};
  const listeners = payload?.listeners || {};
  const publicBaseUrl = fallback.publicBaseUrl || fallback.baseUrl || '';
  const streamUrl = cleanPublicUrl(fallback.streamUrl) ||
    normalizeGeneratedPublicUrl(station.listen_url, publicBaseUrl) ||
    normalizeGeneratedPublicUrl(station.listenUrl, publicBaseUrl);
  const title = normalizeTrackText(song.title);
  const artist = String(song.artist || '').trim();
  const text = normalizeTrackText(song.text || [artist, title].filter(Boolean).join(' - '));

  return {
    enabled: true,
    stationName: String(station.name || fallback.stationName || 'Hackeando el Sistema En Vivo').trim(),
    streamUrl,
    publicPageUrl: cleanPublicUrl(fallback.publicPageUrl) ||
      normalizeGeneratedPublicUrl(station.public_player_url, publicBaseUrl) ||
      normalizeGeneratedPublicUrl(station.publicPlayerUrl, publicBaseUrl),
    isLive: Boolean(live.is_live || live.isLive),
    streamerName: String(live.streamer_name || live.streamerName || '').trim(),
    title,
    artist,
    text,
    art: normalizeArtworkUrl(song.art, publicBaseUrl),
    listeners: {
      current: Number(listeners.current ?? listeners.total ?? 0),
      unique: Number(listeners.unique ?? 0),
      total: Number(listeners.total ?? listeners.current ?? 0),
    },
  };
}
