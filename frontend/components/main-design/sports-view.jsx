'use client';

import { useState, useEffect, useCallback } from 'react';

const LEAGUES = [
  { id: 'all', name: 'Todos los Deportes', emoji: '🔥', short: 'Todos' },
  { id: 'lidom', name: 'LIDOM', emoji: '🇩🇴', short: 'Pelota RD' },
  { id: 'mlb', name: 'Grandes Ligas (MLB)', emoji: '⚾', short: 'MLB' },
  { id: 'nba', name: 'Baloncesto NBA', emoji: '🏀', short: 'NBA' },
  { id: 'soccer', name: 'Fútbol Internacional', emoji: '⚽', short: 'Fútbol' },
  { id: 'nfl', name: 'Fútbol Americano (NFL)', emoji: '🏈', short: 'NFL' },
  { id: 'f1', name: 'Fórmula 1', emoji: '🏎️', short: 'F1' },
];

export default function SportsView() {
  const [activeLeague, setActiveLeague] = useState('all');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async (league, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/v1/sports/scoreboard?league=${league}`);
      if (res.ok) {
        const json = await res.json();
        setGames(json.games || []);
        setLastUpdated(json.updatedAt ? new Date(json.updatedAt) : new Date());
      }
    } catch (err) {
      console.warn('Error loading sports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeLeague);
  }, [activeLeague, loadData]);

  const liveGames = games.filter((g) => g.status === 'IN_PROGRESS');
  const finalGames = games.filter((g) => g.status === 'FINAL');
  const scheduledGames = games.filter((g) => g.status === 'SCHEDULED');

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      {/* Hero Header */}
      <div className="border-b border-terminal-gray/60 bg-surface-container-lowest/80 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-label-caps text-xs font-bold text-system-red">
                <span className="material-symbols-outlined text-[16px]">sports_baseball</span>
                <span>COBERTURA DEPORTIVA EN VIVO</span>
              </div>
              <h1 className="mt-1 font-headline-main text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                Marcadores y Resultados Deportivos
              </h1>
              <p className="mt-1 text-xs text-on-surface-variant font-mono">
                LIDOM, MLB, NBA, Fútbol, NFL y Fórmula 1 con actualización en tiempo real.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-[11px] text-terminal-muted font-mono hidden sm:inline">
                  Act: {lastUpdated.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => loadData(activeLeague, true)}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 rounded border border-terminal-gray px-3 py-1.5 font-label-caps text-xs font-bold text-white transition-all hover:border-system-red hover:bg-system-red/10 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[15px] text-system-red ${refreshing ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            </div>
          </div>

          {/* Selector de Liga / Pestañas */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {LEAGUES.map((l) => {
              const isSelected = activeLeague === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveLeague(l.id)}
                  className={`flex shrink-0 items-center gap-2 rounded border px-3.5 py-2 font-label-caps text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-system-red bg-system-red text-black shadow-[0_0_15px_rgba(255,59,48,0.3)]'
                      : 'border-terminal-gray/60 bg-black/40 text-on-surface-variant hover:border-terminal-gray hover:text-white'
                  }`}
                >
                  <span className="text-sm">{l.emoji}</span>
                  <span>{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && !refreshing ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-system-red border-t-transparent"></span>
            <span className="mt-4 font-mono text-xs">Cargando marcadores deportivos...</span>
          </div>
        ) : games.length === 0 ? (
          <div className="rounded border border-terminal-gray/60 bg-surface-container-lowest/60 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-terminal-muted">sports_score</span>
            <h3 className="mt-2 text-sm font-bold uppercase text-white">No hay encuentros programados</h3>
            <p className="mt-1 text-xs text-on-surface-variant font-mono">
              No se encontraron partidos o eventos deportivos activos o recientes para la categoría seleccionada hoy.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* EN VIVO */}
            {liveGames.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-system-red opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-system-red"></span>
                  </span>
                  <h2 className="font-label-caps text-xs font-bold tracking-wider text-system-red">
                    EN VIVO AHORA ({liveGames.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {liveGames.map((game) => (
                    <SportsCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}

            {/* PARTIDOS FINALES RECIENTES */}
            {finalGames.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <h2 className="font-label-caps text-xs font-bold tracking-wider text-white">
                    RESULTADOS FINALES ({finalGames.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {finalGames.map((game) => (
                    <SportsCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}

            {/* PARTIDOS PROGRAMADOS DE HOY */}
            {scheduledGames.length > 0 && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-terminal-muted">schedule</span>
                  <h2 className="font-label-caps text-xs font-bold tracking-wider text-terminal-muted">
                    PROGRAMADOS ({scheduledGames.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {scheduledGames.map((game) => (
                    <SportsCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SportsCard({ game }) {
  const isLive = game.status === 'IN_PROGRESS';
  const isFinal = game.status === 'FINAL';
  const hasScores = game.awayTeam?.score !== null && game.homeTeam?.score !== null;

  if (game.isRacing && game.podium?.length) {
    return (
      <div
        className={`flex flex-col justify-between rounded border p-4 bg-surface-container-lowest/80 transition-all hover:border-system-red/60 ${
          isLive ? 'border-system-red shadow-[0_0_15px_rgba(255,59,48,0.2)]' : 'border-terminal-gray/60'
        }`}
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
            <span className="font-bold text-system-red flex items-center gap-1.5">
              <span>🏎️</span> {game.leagueName.toUpperCase()}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                isLive ? 'bg-system-red/20 text-system-red' : 'bg-surface-container-high text-white/80'
              }`}
            >
              {game.statusDetail || 'FINAL'}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-bold text-white line-clamp-1">{game.name}</h3>
          {game.venue && (
            <p className="mt-0.5 text-[11px] text-terminal-muted font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              {game.venue}
            </p>
          )}

          <div className="mt-3 space-y-1.5 rounded border border-terminal-gray/40 bg-black/40 p-2.5">
            <div className="text-[10px] font-mono font-bold tracking-wider text-terminal-muted uppercase">
              Podio Oficial
            </div>
            {game.podium.map((p, pIdx) => (
              <div key={pIdx} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-amber-400 shrink-0">
                    {p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉'} P{p.position}
                  </span>
                  {p.flag && (
                    <img src={p.flag} alt="" className="w-4 h-3 object-cover rounded-2xs shrink-0" />
                  )}
                  <span className="truncate font-semibold text-white/95 text-[11px]">
                    {p.driver}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const awayWon = isFinal && hasScores && Number(game.awayTeam.score) > Number(game.homeTeam.score);
  const homeWon = isFinal && hasScores && Number(game.homeTeam.score) > Number(game.awayTeam.score);

  return (
    <div
      className={`flex flex-col justify-between rounded border p-4 bg-surface-container-lowest/80 transition-all hover:border-system-red/60 ${
        isLive ? 'border-system-red shadow-[0_0_15px_rgba(255,59,48,0.2)]' : 'border-terminal-gray/60'
      }`}
    >
      <div>
        <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
          <span className="font-bold text-white/70">{game.leagueName.toUpperCase()}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              isLive
                ? 'bg-system-red/20 text-system-red'
                : isFinal
                ? 'bg-surface-container-high text-green-400'
                : 'bg-surface-container-high text-terminal-muted'
            }`}
          >
            {game.statusDetail || (isFinal ? 'FINAL' : 'PROGRAMADO')}
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {/* Away Team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {game.awayTeam.logo ? (
                <img
                  src={game.awayTeam.logo}
                  alt={game.awayTeam.name}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span
                className={`truncate text-sm ${awayWon ? 'font-bold text-white' : 'font-medium text-white/85'}`}
                title={game.awayTeam.name}
              >
                {game.awayTeam.name}
              </span>
            </div>
            <span
              className={`text-base font-mono shrink-0 ${
                isLive ? 'text-system-red font-bold' : hasScores ? 'text-white font-bold' : 'text-terminal-muted text-xs'
              }`}
            >
              {game.awayTeam.score !== null ? game.awayTeam.score : '—'}
            </span>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {game.homeTeam.logo ? (
                <img
                  src={game.homeTeam.logo}
                  alt={game.homeTeam.name}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span
                className={`truncate text-sm ${homeWon ? 'font-bold text-white' : 'font-medium text-white/85'}`}
                title={game.homeTeam.name}
              >
                {game.homeTeam.name}
              </span>
            </div>
            <span
              className={`text-base font-mono shrink-0 ${
                isLive ? 'text-system-red font-bold' : hasScores ? 'text-white font-bold' : 'text-terminal-muted text-xs'
              }`}
            >
              {game.homeTeam.score !== null ? game.homeTeam.score : '—'}
            </span>
          </div>
        </div>
      </div>

      {game.venue && (
        <div className="mt-4 border-t border-terminal-gray/40 pt-2 flex items-center gap-1 text-[11px] text-terminal-muted font-mono">
          <span className="material-symbols-outlined text-[13px]">location_on</span>
          <span className="truncate">{game.venue}</span>
        </div>
      )}
    </div>
  );
}
