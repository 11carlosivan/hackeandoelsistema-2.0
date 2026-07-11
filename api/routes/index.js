import { registerHealthRoutes } from './health.js';
import { registerPublicRoutes } from './public.js';
import { registerAuthRoutes } from './auth.js';
import { registerCmsRoutes } from './cms.js';

export async function registerRoutes(app) {
  app.get('/api/v1', async () => ({
    service: 'hackeando-api',
    version: 'v1',
    status: 'ok',
  }));

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerCmsRoutes(app);
  await registerPublicRoutes(app);
}
