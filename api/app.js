import Fastify from 'fastify';
import { loadEnv } from './config/env.js';
import { getPrismaClient } from './db/prisma.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerSecurityPlugins } from './plugins/security.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp(options = {}) {
  const env = options.env ?? loadEnv(options.envOverrides);
  const app = Fastify({
    logger: options.logger ?? {
      level: env.isProduction ? 'info' : 'warn',
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'DATABASE_URL',
        'password',
        'token',
      ],
    },
    trustProxy: env.isProduction,
    requestIdHeader: 'x-request-id',
  });

  app.decorate('config', env);
  app.decorate('prisma', options.prisma ?? getPrismaClient());

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : error.name,
      message: statusCode >= 500 ? 'Unexpected server error' : error.message,
      statusCode,
      requestId: request.id,
    });
  });

  app.addHook('onClose', async (instance) => {
    if (options.prisma) return;
    await instance.prisma.$disconnect();
  });

  await registerSecurityPlugins(app, env);
  await app.register(registerAuthPlugin);
  await registerRoutes(app);

  return app;
}
