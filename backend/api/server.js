import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = await buildApp({ env });

const shutdown = async (signal) => {
  app.log.info({ signal }, 'shutting down API');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({
    host: env.API_HOST,
    port: env.API_PORT,
  });
} catch (error) {
  app.log.error(error, 'failed to start API');
  process.exit(1);
}
