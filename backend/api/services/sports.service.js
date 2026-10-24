/**
 * Sports Scoreboard Service
 * Proporciona marcadores en vivo y calendarios oficiales para:
 * - LIDOM (Liga de Béisbol Profesional de la República Dominicana) vía MLB Stats API
 * - MLB (Major League Baseball) vía ESPN API
 * - NBA (National Basketball Association) vía ESPN API
 */

// Cache en memoria para evitar llamadas redundantes y responder al instante (<10ms)
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

function getFromCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setInCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Obtener partidos de LIDOM (Béisbol Dominicano) desde MLB Stats API
 */
async function fetchLidomScores() {
  const cacheKey = 'sports_lidom';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    // Sport ID 17 = Ligas Invernales, League ID 131 = LIDOM
    const url = 'https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=131&hydrate=team,linescore';
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`MLB API returned ${res.status}`);
    const data = await res.json();

    const games = [];
    const dateEntries = data.dates || [];

    for (const dateItem of dateEntries) {
      for (const g of (dateItem.games || [])) {
        const statusCode = g.status?.abstractGameState; // "Preview", "Live", "Final"
        let status = 'SCHEDULED';
        if (statusCode === 'Live') status = 'IN_PROGRESS';
        else if (statusCode === 'Final') status = 'FINAL';

        const awayTeam = g.teams?.away;
        const homeTeam = g.teams?.home;

        // Formato amigable de detalle de estado
        let statusDetail = g.status?.detailedState || 'Programado';
        if (status === 'IN_PROGRESS') {
          const inning = g.linescore?.currentInningOrdinal || `${g.linescore?.currentInning || ''}`;
          const half = g.linescore?.inningHalf === 'Top' ? 'Alta' : 'Baja';
          statusDetail = `${half} ${inning}`;
        } else if (status === 'SCHEDULED' && g.gameDate) {
          try {
            const timeStr = new Intl.DateTimeFormat('es-DO', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Santo_Domingo'
            }).format(new Date(g.gameDate));
            statusDetail = timeStr;
          } catch {
            statusDetail = 'Hoy';
          }
        }

        games.push({
          id: `lidom-${g.gamePk}`,
          league: 'lidom',
          leagueName: 'LIDOM Pelota Invernal',
          sport: 'baseball',
          name: `${awayTeam?.team?.name || 'Visitante'} vs ${homeTeam?.team?.name || 'Local'}`,
          gameDate: g.gameDate,
          status,
          statusDetail,
          venue: g.venue?.name || '',
          awayTeam: {
            id: awayTeam?.team?.id,
            name: awayTeam?.team?.name || 'Visitante',
            shortName: awayTeam?.team?.teamCode?.toUpperCase() || awayTeam?.team?.name?.substring(0, 3).toUpperCase(),
            score: awayTeam?.score ?? (status === 'SCHEDULED' ? null : 0),
            logo: `https://www.mlbstatic.com/team-logos/${awayTeam?.team?.id}.svg`,
          },
          homeTeam: {
            id: homeTeam?.team?.id,
            name: homeTeam?.team?.name || 'Local',
            shortName: homeTeam?.team?.teamCode?.toUpperCase() || homeTeam?.team?.name?.substring(0, 3).toUpperCase(),
            score: homeTeam?.score ?? (status === 'SCHEDULED' ? null : 0),
            logo: `https://www.mlbstatic.com/team-logos/${homeTeam?.team?.id}.svg`,
          },
        });
      }
    }

    const result = {
      league: 'lidom',
      leagueName: 'LIDOM (Pelota Invernal)',
      sport: 'baseball',
      totalGames: games.length,
      games,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    // Si falla o no hay conexión, devolvemos cache previo si existe o lista vacía limpia
    return cache.get(cacheKey)?.data || {
      league: 'lidom',
      leagueName: 'LIDOM (Pelota Invernal)',
      sport: 'baseball',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener partidos de MLB (Grandes Ligas) desde ESPN Scoreboard API
 */
async function fetchMlbScores() {
  const cacheKey = 'sports_mlb';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN MLB API returned ${res.status}`);
    const data = await res.json();

    const games = (data.events || []).map((ev) => {
      const comp = ev.competitions?.[0];
      const statusType = ev.status?.type;
      let status = 'SCHEDULED';
      if (statusType?.state === 'in') status = 'IN_PROGRESS';
      else if (statusType?.state === 'post') status = 'FINAL';

      let statusDetail = statusType?.shortDetail || 'Programado';
      if (status === 'SCHEDULED' && ev.date) {
        try {
          statusDetail = new Intl.DateTimeFormat('es-DO', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Santo_Domingo'
          }).format(new Date(ev.date));
        } catch {
          statusDetail = statusType?.shortDetail || 'Hoy';
        }
      }

      const competitors = comp?.competitors || [];
      const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
      const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];

      return {
        id: `mlb-${ev.id}`,
        league: 'mlb',
        leagueName: 'MLB - Grandes Ligas',
        sport: 'baseball',
        name: ev.name,
        gameDate: ev.date,
        status,
        statusDetail,
        venue: comp?.venue?.fullName || '',
        awayTeam: {
          id: away?.team?.id,
          name: away?.team?.displayName || away?.team?.name || 'Visitante',
          shortName: away?.team?.abbreviation || 'VIS',
          score: away?.score !== undefined ? Number(away.score) : null,
          logo: away?.team?.logo || `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${away?.team?.abbreviation?.toLowerCase()}.png`,
        },
        homeTeam: {
          id: home?.team?.id,
          name: home?.team?.displayName || home?.team?.name || 'Local',
          shortName: home?.team?.abbreviation || 'LOC',
          score: home?.score !== undefined ? Number(home.score) : null,
          logo: home?.team?.logo || `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${home?.team?.abbreviation?.toLowerCase()}.png`,
        },
      };
    });

    const result = {
      league: 'mlb',
      leagueName: 'MLB (Grandes Ligas)',
      sport: 'baseball',
      totalGames: games.length,
      games,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return cache.get(cacheKey)?.data || {
      league: 'mlb',
      leagueName: 'MLB (Grandes Ligas)',
      sport: 'baseball',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener partidos de Baloncesto (NBA) desde ESPN Scoreboard API
 */
async function fetchNbaScores() {
  const cacheKey = 'sports_nba';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN NBA API returned ${res.status}`);
    const data = await res.json();

    const games = (data.events || []).map((ev) => {
      const comp = ev.competitions?.[0];
      const statusType = ev.status?.type;
      let status = 'SCHEDULED';
      if (statusType?.state === 'in') status = 'IN_PROGRESS';
      else if (statusType?.state === 'post') status = 'FINAL';

      let statusDetail = statusType?.shortDetail || 'Programado';
      if (status === 'SCHEDULED' && ev.date) {
        try {
          statusDetail = new Intl.DateTimeFormat('es-DO', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Santo_Domingo'
          }).format(new Date(ev.date));
        } catch {
          statusDetail = statusType?.shortDetail || 'Hoy';
        }
      }

      const competitors = comp?.competitors || [];
      const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
      const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];

      return {
        id: `nba-${ev.id}`,
        league: 'nba',
        leagueName: 'NBA - Baloncesto',
        sport: 'basketball',
        name: ev.name,
        gameDate: ev.date,
        status,
        statusDetail,
        venue: comp?.venue?.fullName || '',
        awayTeam: {
          id: away?.team?.id,
          name: away?.team?.displayName || away?.team?.name || 'Visitante',
          shortName: away?.team?.abbreviation || 'VIS',
          score: away?.score !== undefined ? Number(away.score) : null,
          logo: away?.team?.logo || `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${away?.team?.abbreviation?.toLowerCase()}.png`,
        },
        homeTeam: {
          id: home?.team?.id,
          name: home?.team?.displayName || home?.team?.name || 'Local',
          shortName: home?.team?.abbreviation || 'LOC',
          score: home?.score !== undefined ? Number(home.score) : null,
          logo: home?.team?.logo || `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${home?.team?.abbreviation?.toLowerCase()}.png`,
        },
      };
    });

    const result = {
      league: 'nba',
      leagueName: 'NBA (Baloncesto)',
      sport: 'basketball',
      totalGames: games.length,
      games,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return cache.get(cacheKey)?.data || {
      league: 'nba',
      leagueName: 'NBA (Baloncesto)',
      sport: 'basketball',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener marcadores según liga o combinados
 * @param {'lidom' | 'mlb' | 'nba' | 'all'} league 
 */
export async function getScoreboard(league = 'all') {
  const normLeague = String(league || 'all').toLowerCase();

  if (normLeague === 'lidom') {
    return await fetchLidomScores();
  }

  if (normLeague === 'mlb') {
    return await fetchMlbScores();
  }

  if (normLeague === 'nba') {
    return await fetchNbaScores();
  }

  // 'all': Obtener los 3 en paralelo
  const [lidom, mlb, nba] = await Promise.all([
    fetchLidomScores(),
    fetchMlbScores(),
    fetchNbaScores(),
  ]);

  return {
    leagues: {
      lidom,
      mlb,
      nba,
    },
    updatedAt: new Date().toISOString(),
  };
}
