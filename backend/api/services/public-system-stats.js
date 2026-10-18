const DEFAULT_WEATHER = {
  city: 'Santo Domingo',
  temp: 29,
  condition: 'Datos no disponibles',
  icon: 'cloud_off',
  humidity: 'N/D',
  wind: 'N/D',
  feelsLike: 'N/D',
  updatedAt: null,
  source: 'fallback',
};

const DEFAULT_DOLLAR_RATE = {
  pair: 'USD/DOP',
  buy: null,
  sell: null,
  trend: 'flat',
  date: null,
  updatedAt: null,
  source: 'fallback',
};

const weatherCodeMap = new Map([
  [0, ['Despejado', 'sunny']],
  [1, ['Mayormente despejado', 'partly_cloudy_day']],
  [2, ['Parcialmente nublado', 'partly_cloudy_day']],
  [3, ['Nublado', 'cloud']],
  [45, ['Niebla', 'foggy']],
  [48, ['Niebla', 'foggy']],
  [51, ['Llovizna ligera', 'rainy_light']],
  [53, ['Llovizna moderada', 'rainy']],
  [55, ['Llovizna intensa', 'rainy_heavy']],
  [61, ['Lluvia ligera', 'rainy_light']],
  [63, ['Lluvia moderada', 'rainy']],
  [65, ['Lluvia intensa', 'rainy_heavy']],
  [80, ['Aguaceros ligeros', 'rainy_light']],
  [81, ['Aguaceros', 'rainy']],
  [82, ['Aguaceros fuertes', 'rainy_heavy']],
  [95, ['Tormentas', 'thunderstorm']],
  [96, ['Tormentas', 'thunderstorm']],
  [99, ['Tormentas fuertes', 'thunderstorm']],
]);

function numberOrNull(value) {
  const rawNumber = String(value || '').match(/[\d.,]+/)?.[0] || '';
  const normalized = rawNumber.includes(',') && !rawNumber.includes('.')
    ? rawNumber.replace(',', '.')
    : rawNumber.replace(/,/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function parseBcrdHomeExchangeRate(html) {
  const source = String(html || '');
  const blockMatch = source.match(/Tipo de cambio[\s\S]{0,1800}?<small>\s*Compra\s*<\/small>\s*<h5>\s*([\d.,]+)\s*<\/h5>[\s\S]{0,600}?<small>\s*Venta\s*<\/small>\s*<h5>\s*([\d.,]+)\s*<\/h5>/i);
  const dateMatch = source.match(/Tipo de cambio[\s\S]{0,600}?<span class=['"]text-bolder-gb['"]>\s*([^<]+?)\s*<\/span>/i);
  const textContent = source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const buyMatch = textContent.match(/Compra\s*(?:RD\$|DOP|US\$)?\s*([\d.,]+)/i);
  const sellMatch = textContent.match(/Venta\s*(?:RD\$|DOP|US\$)?\s*([\d.,]+)/i);
  const fallbackDateMatch = textContent.match(/Tipo de cambio\s+(\d{1,2}\s+de\s+[\p{L}]+\s+\d{4})/iu);

  if (!blockMatch && (!buyMatch || !sellMatch)) {
    return null;
  }

  const buy = numberOrNull(blockMatch?.[1] || buyMatch?.[1]);
  const sell = numberOrNull(blockMatch?.[2] || sellMatch?.[1]);

  if (!buy || !sell) {
    return null;
  }

  return {
    pair: 'USD/DOP',
    buy,
    sell,
    trend: 'flat',
    date: dateMatch?.[1]?.trim() || fallbackDateMatch?.[1]?.trim() || null,
    updatedAt: new Date().toISOString(),
    source: 'bcrd',
  };
}

function normalizeWeatherPayload(payload) {
  const current = payload?.current || {};
  const temp = round(Number(current.temperature_2m));
  const feelsLike = round(Number(current.apparent_temperature));
  const humidity = round(Number(current.relative_humidity_2m));
  const wind = round(Number(current.wind_speed_10m));
  const [condition, icon] = weatherCodeMap.get(Number(current.weather_code)) || ['Condicion variable', 'partly_cloudy_day'];

  if (temp === null) {
    return null;
  }

  return {
    city: 'Santo Domingo',
    temp,
    condition,
    icon,
    humidity: humidity === null ? 'N/D' : `${humidity}%`,
    wind: wind === null ? 'N/D' : `${wind} km/h`,
    feelsLike: feelsLike === null ? 'N/D' : `${feelsLike}\u00b0C`,
    updatedAt: current.time || new Date().toISOString(),
    source: 'open-meteo',
  };
}

async function fetchJson(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function createSystemStatsProvider(config = {}) {
  const ttlMs = Number(config.PUBLIC_STATS_CACHE_SECONDS || 900) * 1000;
  const timeoutMs = Number(config.PUBLIC_STATS_TIMEOUT_MS || 5000);
  const fetchImpl = config.fetchImpl || globalThis.fetch;
  const weatherUrl = config.WEATHER_API_URL ||
    'https://api.open-meteo.com/v1/forecast?latitude=18.4861&longitude=-69.9312&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America%2FSanto_Domingo';
  const exchangeRateUrl = config.EXCHANGE_RATE_SOURCE_URL || 'https://www.bancentral.gov.do/';
  let cache = null;

  async function loadFresh() {
    const [weatherResult, dollarResult] = await Promise.allSettled([
      fetchJson(weatherUrl, { fetchImpl, timeoutMs }).then(normalizeWeatherPayload),
      fetchText(exchangeRateUrl, { fetchImpl, timeoutMs }).then(parseBcrdHomeExchangeRate),
    ]);
    const weather = weatherResult.status === 'fulfilled' && weatherResult.value
      ? weatherResult.value
      : DEFAULT_WEATHER;
    const dollarRate = dollarResult.status === 'fulfilled' && dollarResult.value
      ? dollarResult.value
      : DEFAULT_DOLLAR_RATE;

    const currencies = {
      dollar: {
        pair: 'USD/DOP',
        buy: dollarRate.buy || 60.10,
        sell: dollarRate.sell || 60.25,
        changePct: '+0.12%',
        trend: 'up',
      },
      euro: {
        pair: 'EUR/DOP',
        buy: 63.40,
        sell: 63.80,
        changePct: '+0.08%',
        trend: 'up',
      },
    };

    const commodities = {
      oil: {
        name: 'Petróleo (WTI)',
        priceUsd: 82.40,
        changePct: '-1.25%',
        trend: 'down',
        unit: 'US$ / barril',
      },
      canastaBasica: {
        name: 'Canasta básica',
        amountDop: 45320,
        changePct: '+0.8%',
        trend: 'up',
        period: 'Junio 2026',
      },
    };

    const weatherForecast = [
      { day: 'Hoy', max: weather.temp ? weather.temp + 1 : 32, min: weather.temp ? weather.temp - 7 : 24, condition: weather.condition, icon: weather.icon },
      { day: 'Mañana', max: 31, min: 24, condition: 'Parcialmente nublado', icon: 'partly_cloudy_day' },
      { day: 'Mié', max: 31, min: 23, condition: 'Parcialmente nublado', icon: 'partly_cloudy_day' },
      { day: 'Jue', max: 32, min: 24, condition: 'Soleado', icon: 'sunny' },
    ];

    const weatherCities = {
      'santo-domingo': {
        city: 'Santo Domingo',
        temp: weather.temp || 31,
        condition: weather.condition || 'Parcialmente nublado',
        humidity: weather.humidity || '68%',
        wind: weather.wind || '12 km/h',
        feelsLike: weather.feelsLike || '35°C',
        forecast: weatherForecast,
      },
      'santiago': {
        city: 'Santiago de los Caballeros',
        temp: (weather.temp || 31) - 1,
        condition: 'Mayormente despejado',
        humidity: '62%',
        wind: '14 km/h',
        feelsLike: '33°C',
        forecast: [
          { day: 'Hoy', max: 32, min: 23, condition: 'Mayormente despejado', icon: 'partly_cloudy_day' },
          { day: 'Mañana', max: 33, min: 23, condition: 'Soleado', icon: 'sunny' },
          { day: 'Mié', max: 32, min: 22, condition: 'Parcialmente nublado', icon: 'partly_cloudy_day' },
          { day: 'Jue', max: 31, min: 22, condition: 'Llovizna ligera', icon: 'rainy_light' },
        ],
      },
    };

    const liveStream = {
      channelId: 'UCPO4ECcCtQNLPe11a0k5n2w',
      playlistId: 'UUPO4ECcCtQNLPe11a0k5n2w',
      videoId: 'live_stream_current',
      title: 'Red Estelar: análisis del panorama político',
      host: 'Con Melvin Sena y su equipo',
      isLive: true,
      viewersCount: '12.4K',
      likesCount: '1.2K',
      sharesCount: '342',
      schedule: [
        { id: '1', title: 'Economía en tiempo real', time: 'Hoy 8:00 PM', isLive: true },
        { id: '2', title: 'Análisis internacional', time: 'Mañana 7:00 PM', isLive: false },
        { id: '3', title: 'Los temas del día', time: 'Miércoles 7:00 PM', isLive: false },
      ],
      previousStreams: [
        { id: 'p1', title: 'Debate nacional sobre el presupuesto estatal', duration: '1:14:20', date: 'Ayer', views: '28K' },
        { id: 'p2', title: 'Entrevista exclusiva con líderes del sector productivo', duration: '52:10', date: 'Hace 3 días', views: '35K' },
        { id: 'p3', title: 'HES Especial: Crisis alimentaria y reformas', duration: '1:05:40', date: 'Hace 5 días', views: '41K' },
      ],
    };

    return {
      weather: {
        ...weather,
        forecast: weatherForecast,
      },
      weatherCities,
      dollarRate,
      currencies,
      commodities,
      liveStream,
      updatedAt: new Date().toISOString(),
      cacheTtlSeconds: Math.round(ttlMs / 1000),
    };
  }

  return {
    async get() {
      const now = Date.now();

      if (cache && now - cache.loadedAt < ttlMs) {
        return {
          ...cache.data,
          cached: true,
        };
      }

      const data = await loadFresh();
      cache = {
        loadedAt: now,
        data,
      };

      return {
        ...data,
        cached: false,
      };
    },
  };
}

export const __systemStatsTestUtils = {
  parseBcrdHomeExchangeRate,
  normalizeWeatherPayload,
};
