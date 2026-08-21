import { registerHealthRoutes } from './health.js';
import { registerPublicRoutes } from './public.js';
import { registerAuthRoutes } from './auth.js';
import { registerCmsRoutes } from './cms.js';
import { registerAutoPostRoutes } from './auto-post.js';
import { registerMediaFileRoutes } from './media-files.js';

export async function registerRoutes(app) {
  app.get('/api/v1', async () => ({
    service: 'hackeando-api',
    version: 'v1',
    status: 'ok',
  }));

  await registerHealthRoutes(app);
  await registerMediaFileRoutes(app);
  await registerAuthRoutes(app);
  await registerCmsRoutes(app);
  await registerAutoPostRoutes(app);
  await registerPublicRoutes(app);
}
