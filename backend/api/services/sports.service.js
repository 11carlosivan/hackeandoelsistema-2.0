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
function getSantoDomingoDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Obtener partidos de LIDOM (Béisbol Dominicano) desde MLB Stats API
 * Consulta últimos 2 días para incluir tanto los resultados finales recientes con sus carreras
 * como los partidos programados de la cartelera de hoy.
 */
async function fetchLidomScores() {
  const cacheKey = 'sports_lidom';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const today = getSantoDomingoDate(0);
    const yesterday = getSantoDomingoDate(-1);
    const twoDaysAgo = getSantoDomingoDate(-2);

    // Consultamos desde 2 días atrás hasta hoy para asegurar resultados completos de la última jornada
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=131&startDate=${twoDaysAgo}&endDate=${today}&hydrate=team,linescore`;
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

        // Determinar prefijo de día relativo
        let dayPrefix = 'Hoy';
        try {
          const gameDay = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santo_Domingo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(g.gameDate));

          if (gameDay === today) {
            dayPrefix = 'Hoy';
          } else if (gameDay === yesterday) {
            dayPrefix = 'Ayer';
          } else {
            dayPrefix = new Intl.DateTimeFormat('es-DO', {
              timeZone: 'America/Santo_Domingo',
              day: 'numeric',
              month: 'short',
            }).format(new Date(g.gameDate));
          }
        } catch {
          dayPrefix = 'Hoy';
        }

        // Formato amigable de detalle de estado
        let statusDetail = g.status?.detailedState || 'Programado';
        if (status === 'IN_PROGRESS') {
          const inning = g.linescore?.currentInningOrdinal || `${g.linescore?.currentInning || ''}`;
          const half = g.linescore?.inningHalf === 'Top' ? 'Alta' : 'Baja';
          statusDetail = `${half} ${inning}`;
        } else if (status === 'FINAL') {
          statusDetail = `${dayPrefix} • Final`;
        } else if (status === 'SCHEDULED' && g.gameDate) {
          try {
            const timeStr = new Intl.DateTimeFormat('es-DO', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Santo_Domingo',
            }).format(new Date(g.gameDate));
            statusDetail = `${dayPrefix} ${timeStr}`;
          } catch {
            statusDetail = `${dayPrefix}`;
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
            score: awayTeam?.score !== undefined ? awayTeam.score : (status === 'SCHEDULED' ? null : 0),
            logo: awayTeam?.team?.id
              ? `https://midfield.mlbstatic.com/v1/team/${awayTeam.team.id}/spots/120`
              : null,
          },
          homeTeam: {
            id: homeTeam?.team?.id,
            name: homeTeam?.team?.name || 'Local',
            shortName: homeTeam?.team?.teamCode?.toUpperCase() || homeTeam?.team?.name?.substring(0, 3).toUpperCase(),
            score: homeTeam?.score !== undefined ? homeTeam.score : (status === 'SCHEDULED' ? null : 0),
            logo: homeTeam?.team?.id
              ? `https://midfield.mlbstatic.com/v1/team/${homeTeam.team.id}/spots/120`
              : null,
          },
        });
      }
    }

    // Ordenar: primero EN VIVO, luego FINALES recientes, luego PROGRAMADOS
    games.sort((a, b) => {
      const priority = { IN_PROGRESS: 0, FINAL: 1, SCHEDULED: 2 };
      const diff = (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
      if (diff !== 0) return diff;
      return new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime();
    });

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
 * Obtener partidos de NFL (Fútbol Americano) desde ESPN Scoreboard API
 */
async function fetchNflScores() {
  const cacheKey = 'sports_nfl';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN NFL API returned ${res.status}`);
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
        id: `nfl-${ev.id}`,
        league: 'nfl',
        leagueName: 'NFL - Fútbol Americano',
        sport: 'football',
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
          logo: away?.team?.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${away?.team?.abbreviation?.toLowerCase()}.png`,
        },
        homeTeam: {
          id: home?.team?.id,
          name: home?.team?.displayName || home?.team?.name || 'Local',
          shortName: home?.team?.abbreviation || 'LOC',
          score: home?.score !== undefined ? Number(home.score) : null,
          logo: home?.team?.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${home?.team?.abbreviation?.toLowerCase()}.png`,
        },
      };
    });

    const result = {
      league: 'nfl',
      leagueName: 'NFL (Fútbol Americano)',
      sport: 'football',
      totalGames: games.length,
      games,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return cache.get(cacheKey)?.data || {
      league: 'nfl',
      leagueName: 'NFL (Fútbol Americano)',
      sport: 'football',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener partidos de Fútbol Soccer (LaLiga, Champions, Premier League) desde ESPN Scoreboard API
 */
async function fetchSoccerScores() {
  const cacheKey = 'sports_soccer';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const leaguesToFetch = [
    { id: 'esp.1', name: 'LaLiga' },
    { id: 'uefa.champions', name: 'Champions League' },
    { id: 'eng.1', name: 'Premier League' },
  ];

  try {
    const responses = await Promise.allSettled(
      leaguesToFetch.map((l) =>
        fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l.id}/scoreboard`, {
          signal: AbortSignal.timeout(6000),
        }).then((r) => (r.ok ? r.json() : { events: [] }))
      )
    );

    const allGames = [];

    responses.forEach((resResult, idx) => {
      if (resResult.status !== 'fulfilled' || !resResult.value?.events) return;
      const tournamentName = leaguesToFetch[idx].name;

      for (const ev of resResult.value.events) {
        const comp = ev.competitions?.[0];
        const statusType = ev.status?.type;
        let status = 'SCHEDULED';
        if (statusType?.state === 'in') status = 'IN_PROGRESS';
        else if (statusType?.state === 'post') status = 'FINAL';

        let statusDetail = statusType?.shortDetail || 'Programado';
        if (status === 'SCHEDULED' && ev.date) {
          try {
            const timeStr = new Intl.DateTimeFormat('es-DO', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Santo_Domingo',
            }).format(new Date(ev.date));
            statusDetail = timeStr;
          } catch {
            statusDetail = statusType?.shortDetail || 'Hoy';
          }
        } else if (status === 'FINAL') {
          statusDetail = 'Final';
        }

        const competitors = comp?.competitors || [];
        const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
        const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];

        allGames.push({
          id: `soccer-${ev.id}`,
          league: 'soccer',
          leagueName: `Fútbol (${tournamentName})`,
          sport: 'soccer',
          name: ev.name,
          gameDate: ev.date,
          status,
          statusDetail: `${tournamentName} • ${statusDetail}`,
          venue: comp?.venue?.fullName || '',
          awayTeam: {
            id: away?.team?.id,
            name: away?.team?.displayName || away?.team?.name || 'Visitante',
            shortName: away?.team?.abbreviation || 'VIS',
            score: away?.score !== undefined ? Number(away.score) : null,
            logo: away?.team?.logo || '',
          },
          homeTeam: {
            id: home?.team?.id,
            name: home?.team?.displayName || home?.team?.name || 'Local',
            shortName: home?.team?.abbreviation || 'LOC',
            score: home?.score !== undefined ? Number(home.score) : null,
            logo: home?.team?.logo || '',
          },
        });
      }
    });

    // Ordenar: en vivo primero, luego finales, luego programados
    allGames.sort((a, b) => {
      const priority = { IN_PROGRESS: 0, FINAL: 1, SCHEDULED: 2 };
      return (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
    });

    const result = {
      league: 'soccer',
      leagueName: 'Fútbol (Soccer)',
      sport: 'soccer',
      totalGames: allGames.length,
      games: allGames,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return cache.get(cacheKey)?.data || {
      league: 'soccer',
      leagueName: 'Fútbol (Soccer)',
      sport: 'soccer',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener resultados de Fórmula 1 (F1) desde ESPN Racing API
 */
async function fetchF1Scores() {
  const cacheKey = 'sports_f1';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ESPN F1 API returned ${res.status}`);
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
            timeZone: 'America/Santo_Domingo',
          }).format(new Date(ev.date));
        } catch {
          statusDetail = statusType?.shortDetail || 'Hoy';
        }
      }

      const competitors = comp?.competitors || [];
      const podium = competitors.slice(0, 3).map((c, index) => ({
        position: c.order || c.place || index + 1,
        driver: c.athlete?.displayName || 'Piloto',
        shortName: c.athlete?.shortName || c.athlete?.displayName || '',
        flag: c.athlete?.flag?.href || '',
      }));

      const p1 = podium[0] || { driver: 'Líder', position: 1 };
      const p2 = podium[1] || { driver: 'Segundo', position: 2 };

      return {
        id: `f1-${ev.id}`,
        league: 'f1',
        leagueName: 'Fórmula 1 (F1)',
        sport: 'racing',
        isRacing: true,
        name: ev.name,
        gameDate: ev.date,
        status,
        statusDetail: `F1 • ${statusDetail}`,
        venue: ev.circuit?.name || comp?.venue?.fullName || 'Circuito F1',
        podium,
        awayTeam: {
          id: 'p1',
          name: `🥇 P1: ${p1.driver}`,
          shortName: p1.shortName || 'P1',
          score: status === 'FINAL' ? 1 : null,
          logo: p1.flag || '',
        },
        homeTeam: {
          id: 'p2',
          name: `🥈 P2: ${p2.driver}`,
          shortName: p2.shortName || 'P2',
          score: status === 'FINAL' ? 2 : null,
          logo: p2.flag || '',
        },
      };
    });

    const result = {
      league: 'f1',
      leagueName: 'Fórmula 1 (F1)',
      sport: 'racing',
      totalGames: games.length,
      games,
      updatedAt: new Date().toISOString(),
    };

    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    return cache.get(cacheKey)?.data || {
      league: 'f1',
      leagueName: 'Fórmula 1 (F1)',
      sport: 'racing',
      totalGames: 0,
      games: [],
      error: error.message,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Obtener marcadores según liga o combinados
 * @param {'lidom' | 'mlb' | 'nba' | 'soccer' | 'nfl' | 'f1' | 'all'} league 
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

  if (normLeague === 'soccer') {
    return await fetchSoccerScores();
  }

  if (normLeague === 'nfl') {
    return await fetchNflScores();
  }

  if (normLeague === 'f1') {
    return await fetchF1Scores();
  }

  // 'all': Obtener los 6 en paralelo
  const [lidom, mlb, nba, soccer, nfl, f1] = await Promise.all([
    fetchLidomScores(),
    fetchMlbScores(),
    fetchNbaScores(),
    fetchSoccerScores(),
    fetchNflScores(),
    fetchF1Scores(),
  ]);

  return {
    leagues: {
      lidom,
      mlb,
      nba,
      soccer,
      nfl,
      f1,
    },
    updatedAt: new Date().toISOString(),
  };
}
