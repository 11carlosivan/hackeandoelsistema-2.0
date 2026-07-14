function buildDemoAnalytics() {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (13 - index));

    return date.toISOString().slice(0, 10);
  });

  return {
    source: 'demo',
    configured: false,
    fetchedAt: new Date().toISOString(),
    overview: {
      sessions: 14820,
      users: 9341,
      pageviews: 38540,
      bounceRate: 0.412,
    },
    timeSeries: days.map((date, index) => ({
      date,
      sessions: 420 + index * 18 + (index % 4) * 34,
      pageviews: 980 + index * 46 + (index % 3) * 75,
    })),
    topPages: [
      { pagePath: '/', pageTitle: 'Portada Principal', pageviews: 1640 },
      { pagePath: '/politica/', pageTitle: 'Politica', pageviews: 1290 },
      { pagePath: '/nacionales/', pageTitle: 'Nacionales', pageviews: 1100 },
      { pagePath: '/opinion/', pageTitle: 'Opinion', pageviews: 940 },
    ],
    trafficSources: [
      { label: 'Organic Search', sessions: 6840 },
      { label: 'Direct', sessions: 3920 },
      { label: 'Social', sessions: 2180 },
      { label: 'Referral', sessions: 1040 },
    ],
  };
}

function buildUnconfiguredAnalytics() {
  return {
    source: 'unconfigured',
    configured: false,
    fetchedAt: new Date().toISOString(),
    overview: {
      sessions: 0,
      users: 0,
      pageviews: 0,
      bounceRate: 0,
    },
    timeSeries: [],
    topPages: [],
    trafficSources: [],
    setup: {
      requiredEnv: ['GA4_PROPERTY_ID', 'GOOGLE_SERVICE_ACCOUNT_KEY_JSON'],
      note: 'Conecta Google Analytics Data API para mostrar datos reales.',
    },
  };
}

export async function getAnalyticsData() {
  const hasGa4Config = Boolean(process.env.GA4_PROPERTY_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON);

  if (!hasGa4Config) {
    return process.env.NODE_ENV === 'production' ? buildUnconfiguredAnalytics() : buildDemoAnalytics();
  }

  return {
    ...buildUnconfiguredAnalytics(),
    source: 'pending-live-adapter',
    configured: true,
    setup: {
      requiredEnv: [],
      note: 'Variables GA4 detectadas. Falta activar el cliente de Google Analytics Data API.',
    },
  };
}
