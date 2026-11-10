import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAzuraCastNowPlayingUrl,
  buildAzuraCastPublicPageUrl,
  getAzuraCastClientConfig,
  normalizeAzuraCastNowPlaying,
} from './azuracast';

describe('azuracast helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads process.env NEXT_PUBLIC_AZURACAST_* when called without an explicit env override', () => {
    vi.stubEnv('NEXT_PUBLIC_AZURACAST_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_AZURACAST_BASE_URL', 'https://radio.example.com');
    vi.stubEnv('NEXT_PUBLIC_AZURACAST_STATION', 'hes_radio');
    vi.stubEnv('NEXT_PUBLIC_AZURACAST_STREAM_URL', 'https://radio.example.com/listen/hes_radio/radio.mp3');
    vi.stubEnv('NEXT_PUBLIC_AZURACAST_PUBLIC_PAGE_URL', 'https://radio.example.com/public/hes_radio');

    expect(getAzuraCastClientConfig()).toMatchObject({
      enabled: true,
      station: 'hes_radio',
      streamUrl: 'https://radio.example.com/listen/hes_radio/radio.mp3',
      publicPageUrl: 'https://radio.example.com/public/hes_radio',
    });
  });
  it('builds the static now-playing endpoint for a station', () => {
    expect(buildAzuraCastNowPlayingUrl({
      baseUrl: 'https://radio.example.com/',
      station: '/hes_radio/',
    })).toBe('https://radio.example.com/api/nowplaying_static/hes_radio.json');
  });

  it('builds the public player URL from the station shortcode', () => {
    expect(buildAzuraCastPublicPageUrl({
      baseUrl: 'https://radio.example.com',
      station: 'hes_radio',
    })).toBe('https://radio.example.com/public/hes_radio');
  });

  it('keeps the client integration disabled until explicitly enabled and configured', () => {
    expect(getAzuraCastClientConfig({
      NEXT_PUBLIC_AZURACAST_ENABLED: 'false',
      NEXT_PUBLIC_AZURACAST_BASE_URL: 'https://radio.example.com',
      NEXT_PUBLIC_AZURACAST_STATION: 'hes_radio',
    }).enabled).toBe(false);

    expect(getAzuraCastClientConfig({
      NEXT_PUBLIC_AZURACAST_ENABLED: 'true',
      NEXT_PUBLIC_AZURACAST_BASE_URL: 'https://radio.example.com',
      NEXT_PUBLIC_AZURACAST_STATION: 'hes_radio',
    })).toMatchObject({
      enabled: true,
      publicPageUrl: 'https://radio.example.com/public/hes_radio',
    });
  });

  it('normalizes AzuraCast now-playing payloads for the player UI', () => {
    const payload = normalizeAzuraCastNowPlaying({
      station: {
        name: 'HES Radio',
        listen_url: 'https://radio.example.com/listen/hes/radio.mp3',
      },
      now_playing: {
        song: {
          title: 'Tema',
          artist: 'Artista',
          art: 'https://radio.example.com/art.png',
        },
      },
      live: {
        is_live: true,
        streamer_name: 'Cabina HES',
      },
      listeners: {
        current: 42,
      },
    });

    expect(payload).toMatchObject({
      enabled: true,
      stationName: 'HES Radio',
      streamUrl: 'https://radio.example.com/listen/hes/radio.mp3',
      isLive: true,
      streamerName: 'Cabina HES',
      text: 'Artista - Tema',
      art: 'https://radio.example.com/art.png',
      listeners: {
        current: 42,
      },
    });
  });

  it('uses public language when AzuraCast reports an offline station', () => {
    const payload = normalizeAzuraCastNowPlaying({
      station: {},
      now_playing: {
        song: {
          text: 'Station Offline',
        },
      },
    });

    expect(payload).toMatchObject({
      stationName: 'Hackeando el Sistema En Vivo',
      title: '',
      text: 'Senal en espera',
      art: '',
    });
  });
});
