'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const LEAGUES = [
  { id: 'lidom', name: 'LIDOM', emoji: '⚾', label: 'Pelota Invernal RD' },
  { id: 'mlb', name: 'MLB', emoji: '⚾', label: 'Grandes Ligas' },
  { id: 'nba', name: 'NBA', emoji: '🏀', label: 'Baloncesto' },
];

const ROTATION_SECONDS = 20;

export default function SportsTicker() {
  const [activeLeague, setActiveLeague] = useState('lidom');
  const [scoreboardData, setScoreboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const scrollRef = useRef(null);

  const loadScores = useCallback(async (league, isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/v1/sports/scoreboard?league=${league}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Error al cargar marcadores');
      const data = await res.json();
      setScoreboardData(data);
    } catch (err) {
      console.warn('SportsTicker fetch error:', err.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Cargar datos al cambiar de liga
  useEffect(() => {
    setLoading(true);
    loadScores(activeLeague);
  }, [activeLeague, loadScores]);

  // Rotación automática cada 20 segundos entre LIDOM, MLB y NBA
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLeague((current) => {
        const currentIndex = LEAGUES.findIndex((l) => l.id === current);
        const nextIndex = (currentIndex + 1) % LEAGUES.length;
        return LEAGUES[nextIndex].id;
      });
      setProgressKey((k) => k + 1);
    }, ROTATION_SECONDS * 1000);

    return () => clearInterval(timer);
  }, [progressKey]);

  // Manejo de clic manual en pestaña: cambia de liga y reinicia el contador de 20s
  const handleSelectLeague = (leagueId) => {
    if (leagueId === activeLeague) return;
    setActiveLeague(leagueId);
    setProgressKey((k) => k + 1); // reinicia el ciclo de 20s
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = direction === 'left' ? -280 : 280;
    scrollRef.current.scrollBy({ left: distance, behavior: 'smooth' });
  };

  const games = scoreboardData?.games || [];

  return (
    <div className="w-full mb-6 border border-terminal-gray/80 bg-surface-container-low/70 backdrop-blur-md overflow-hidden rounded-sm transition-all duration-300 shadow-sm relative group">
      {/* Barra de progreso de rotación de 20 segundos */}
      <div className="w-full h-[2px] bg-white/5 overflow-hidden">
        <div
          key={progressKey}
          className="h-full bg-system-red transition-all duration-linear"
          style={{
            animation: `sportsTickerProgress ${ROTATION_SECONDS}s linear infinite`,
          }}
        />
      </div>

      {/* Header bar con selector de ligas y estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-black/40 border-b border-terminal-gray/60 font-mono text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-system-red text-black font-bold uppercase tracking-wider text-[11px] rounded-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
            MARCADORES
          </span>

          {/* Selector de ligas con rotación activa */}
          <div className="flex items-center gap-1 bg-surface-container-lowest/80 p-0.5 rounded border border-terminal-gray/40">
            {LEAGUES.map((league) => {
              const isActive = activeLeague === league.id;
              return (
                <button
                  key={league.id}
                  onClick={() => handleSelectLeague(league.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xs transition-all ${
                    isActive
                      ? 'bg-system-red text-black shadow-xs scale-102'
                      : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                  }`}
                  title={`${league.label} (Rota cada 20s)`}
                >
                  <span>{league.emoji}</span>
                  <span>{league.name}</span>
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline-block text-[10px] text-terminal-muted border-l border-terminal-gray/50 pl-2">
            Auto 20s
          </span>
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
          <span className="hidden md:inline text-[10px] uppercase text-terminal-muted">
            {scoreboardData?.leagueName || activeLeague.toUpperCase()}
          </span>

          {/* Botón de refrescar */}
          <button
            onClick={() => loadScores(activeLeague, true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-on-surface-variant hover:text-white transition-all disabled:opacity-50"
            title="Actualizar marcadores"
          >
            <span className={`material-symbols-outlined text-[14px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span className="hidden sm:inline text-[10px]">Actualizar</span>
          </button>

          {/* Controles de scroll */}
          {games.length > 2 && (
            <div className="hidden sm:flex items-center gap-0.5">
              <button
                onClick={() => scroll('left')}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-on-surface hover:text-white transition-colors"
                title="Desplazar a la izquierda"
              >
                ‹
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-on-surface hover:text-white transition-colors"
                title="Desplazar a la derecha"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor de juegos / Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 p-3 overflow-x-auto no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading && games.length === 0 ? (
          <div className="w-full py-6 flex items-center justify-center gap-3 text-on-surface-variant text-xs font-mono">
            <span className="w-4 h-4 border-2 border-system-red border-t-transparent rounded-full animate-spin"></span>
            <span>Cargando partidos de {activeLeague.toUpperCase()}...</span>
          </div>
        ) : games.length === 0 ? (
          <div className="w-full py-5 text-center text-on-surface-variant text-xs font-mono">
            <span>No hay partidos recientes ni programados para {scoreboardData?.leagueName || activeLeague.toUpperCase()}.</span>
          </div>
        ) : (
          games.map((game) => {
            const isLive = game.status === 'IN_PROGRESS';
            const isFinal = game.status === 'FINAL';
            const hasScores = game.awayTeam.score !== null && game.homeTeam.score !== null;

            return (
              <div
                key={game.id}
                className={`min-w-[240px] max-w-[270px] shrink-0 p-3 rounded bg-black/30 border transition-all duration-200 hover:border-system-red/60 hover:bg-black/50 ${
                  isLive
                    ? 'border-system-red/80 shadow-[0_0_12px_rgba(255,59,48,0.2)]'
                    : isFinal
                    ? 'border-terminal-gray/60'
                    : 'border-terminal-gray/40'
                }`}
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
                  {isLive ? (
                    <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-xs bg-system-red/20 text-system-red font-bold uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-system-red opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-system-red"></span>
                      </span>
                      EN VIVO • {game.statusDetail}
                    </span>
                  ) : isFinal ? (
                    <span className="text-white/80 uppercase font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {game.statusDetail || 'FINAL'}
                    </span>
                  ) : (
                    <span className="text-terminal-muted flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[11px]">schedule</span>
                      {game.statusDetail || 'HOY'}
                    </span>
                  )}

                  {game.venue && (
                    <span className="truncate max-w-[100px] text-terminal-muted text-[9px]" title={game.venue}>
                      {game.venue}
                    </span>
                  )}
                </div>

                {/* Equipos y Marcadores */}
                <div className="space-y-1.5">
                  {/* Visitante (Away) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {game.awayTeam.logo ? (
                        <img
                          src={game.awayTeam.logo}
                          alt={game.awayTeam.name}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span
                        className={`truncate text-xs ${
                          isFinal && game.awayTeam.score > game.homeTeam.score
                            ? 'font-bold text-white'
                            : 'font-medium text-white/90'
                        }`}
                        title={game.awayTeam.name}
                      >
                        {game.awayTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono shrink-0 ${
                        isLive
                          ? 'text-system-red font-bold'
                          : hasScores
                          ? 'text-white font-bold'
                          : 'text-terminal-muted text-xs'
                      }`}
                    >
                      {game.awayTeam.score !== null ? game.awayTeam.score : 'VS'}
                    </span>
                  </div>

                  {/* Local (Home) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {game.homeTeam.logo ? (
                        <img
                          src={game.homeTeam.logo}
                          alt={game.homeTeam.name}
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span
                        className={`truncate text-xs ${
                          isFinal && game.homeTeam.score > game.awayTeam.score
                            ? 'font-bold text-white'
                            : 'font-medium text-white/90'
                        }`}
                        title={game.homeTeam.name}
                      >
                        {game.homeTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono shrink-0 ${
                        isLive
                          ? 'text-system-red font-bold'
                          : hasScores
                          ? 'text-white font-bold'
                          : 'text-terminal-muted text-xs'
                      }`}
                    >
                      {game.homeTeam.score !== null ? game.homeTeam.score : 'VS'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes sportsTickerProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
