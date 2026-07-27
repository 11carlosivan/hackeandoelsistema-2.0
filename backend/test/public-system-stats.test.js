import { describe, expect, it } from 'vitest';
import { __systemStatsTestUtils, createSystemStatsProvider } from '../api/services/public-system-stats.js';

const { normalizeWeatherPayload, parseBcrdHomeExchangeRate } = __systemStatsTestUtils;

describe('public system stats provider', () => {
  it('parses BCRD homepage exchange rate block', () => {
    const html = `
      <a><strong>Tipo de cambio</strong><br /><small><span class='text-bolder-gb'>24 de Julio 2026</span></small></a>
      <small>Compra</small><h5>58.0688</h5>
      <small>Venta</small><h5>58.5070</h5>
    `;

    expect(parseBcrdHomeExchangeRate(html)).toMatchObject({
      pair: 'USD/DOP',
      buy: 58.0688,
      sell: 58.507,
      date: '24 de Julio 2026',
      source: 'bcrd',
    });
  });

  it('parses compact BCRD exchange rate text with comma decimals', () => {
    const html = `
      <section>
        <h3>Tipo de cambio 26 de Julio 2026</h3>
        <div>Compra RD$ 58,61</div>
        <div>Venta RD$ 59,20</div>
      </section>
    `;

    expect(parseBcrdHomeExchangeRate(html)).toMatchObject({
      buy: 58.61,
      sell: 59.2,
      date: '26 de Julio 2026',
      source: 'bcrd',
    });
  });

  it('normalizes Open-Meteo current weather payload', () => {
    const weather = normalizeWeatherPayload({
      current: {
        time: '2026-07-26T14:30',
        temperature_2m: 30.7,
        relative_humidity_2m: 67,
        apparent_temperature: 36.4,
        weather_code: 53,
        wind_speed_10m: 11.9,
      },
    });

    expect(weather).toMatchObject({
      city: 'Santo Domingo',
      temp: 31,
      condition: 'Llovizna moderada',
      icon: 'rainy',
      humidity: '67%',
      wind: '12 km/h',
      feelsLike: '36\u00b0C',
      source: 'open-meteo',
    });
  });

  it('returns fallbacks when external sources fail', async () => {
    const provider = createSystemStatsProvider({
      PUBLIC_STATS_CACHE_SECONDS: 60,
      PUBLIC_STATS_TIMEOUT_MS: 1000,
      fetchImpl: async () => ({ ok: false, status: 503 }),
    });
    const stats = await provider.get();

    expect(stats.weather.source).toBe('fallback');
    expect(stats.dollarRate.source).toBe('fallback');
    expect(stats.cached).toBe(false);
  });
});
