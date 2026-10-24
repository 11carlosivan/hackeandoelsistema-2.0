import { describe, it, expect } from 'vitest';
import { buildApp } from '../api/app.js';

describe('Sports Scoreboard Routes', () => {
  it('GET /api/v1/sports/scoreboard returns status 200 with leagues', async () => {
    const app = await buildApp({
      envOverrides: {
        DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
        JWT_SECRET: 'test-secret-min-32-chars-long-example',
      },
      prisma: {
        $disconnect: async () => {},
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sports/scoreboard?league=all',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.leagues).toBeDefined();
    expect(body.leagues.lidom).toBeDefined();
    expect(body.leagues.mlb).toBeDefined();
    expect(body.leagues.nba).toBeDefined();
    expect(body.leagues.soccer).toBeDefined();
    expect(body.leagues.nfl).toBeDefined();
  }, 15000);

  it('GET /api/v1/sports/scoreboard?league=nba returns NBA results', async () => {
    const app = await buildApp({
      envOverrides: {
        DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
        JWT_SECRET: 'test-secret-min-32-chars-long-example',
      },
      prisma: {
        $disconnect: async () => {},
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sports/scoreboard?league=nba',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.league).toBe('nba');
    expect(Array.isArray(body.games)).toBe(true);
  }, 15000);

  it('GET /api/v1/sports/scoreboard?league=nfl returns NFL results', async () => {
    const app = await buildApp({
      envOverrides: {
        DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock',
        JWT_SECRET: 'test-secret-min-32-chars-long-example',
      },
      prisma: {
        $disconnect: async () => {},
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/sports/scoreboard?league=nfl',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.league).toBe('nfl');
    expect(Array.isArray(body.games)).toBe(true);
  }, 15000);
});
