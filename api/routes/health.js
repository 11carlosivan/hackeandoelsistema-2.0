import { noStoreHeaders } from '../utils/http.js';

export async function registerHealthRoutes(app) {
  app.get('/health/live', async (_request, reply) => {
    noStoreHeaders(reply);
    return {
      ok: true,
      service: 'hackeando-api',
      status: 'live',
      timestamp: new Date().toISOString(),
    };
  });

  app.get('/health/ready', async (_request, reply) => {
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
  });
}
