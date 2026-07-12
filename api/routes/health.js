import { noStoreHeaders } from '../utils/http.js';

export async function registerHealthRoutes(app) {
  const liveHandler = async (_request, reply) => {
    noStoreHeaders(reply);
    return {
      ok: true,
      service: 'hackeando-api',
      status: 'live',
      timestamp: new Date().toISOString(),
    };
  };

  const readyHandler = async (_request, reply) => {
    noStoreHeaders(reply);

    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        service: 'hackeando-api',
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      reply.code(503);
      return {
        ok: false,
        service: 'hackeando-api',
        status: 'not_ready',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      };
    }
  };

  app.get('/health', liveHandler);
  app.get('/live', liveHandler);
  app.get('/health/live', liveHandler);
  app.get('/api/v1/health', liveHandler);
  app.get('/api/v1/health/live', liveHandler);

  app.get('/ready', readyHandler);
  app.get('/health/ready', readyHandler);
  app.get('/api/v1/health/ready', readyHandler);
}
