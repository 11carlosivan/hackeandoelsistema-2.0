import { z } from 'zod';
import { getScoreboard } from '../services/sports.service.js';

const scoreboardQuerySchema = z.object({
  league: z.enum(['lidom', 'mlb', 'nba', 'soccer', 'nfl', 'all']).default('all'),
});

export async function registerSportsRoutes(app) {
  app.get('/api/v1/sports/scoreboard', async (request, reply) => {
    const parseResult = scoreboardQuerySchema.safeParse(request.query || {});
    const league = parseResult.success ? parseResult.data.league : 'all';

    const data = await getScoreboard(league);

    // Cache HTTP de 60 segundos para navegadores y proxies
    reply.header('Cache-Control', 'public, max-age=60, s-maxage=60');
    return data;
  });
}
