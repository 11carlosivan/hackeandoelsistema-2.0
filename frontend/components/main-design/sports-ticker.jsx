'use client';

import { useState, useEffect, useRef } from 'react';

const LEAGUES = [
  { id: 'lidom', name: 'LIDOM', emoji: '⚾', label: 'Pelota Invernal RD' },
  { id: 'mlb', name: 'MLB', emoji: '⚾', label: 'Grandes Ligas' },
  { id: 'nba', name: 'NBA', emoji: '🏀', label: 'Baloncesto' },
];

export default function SportsTicker() {
  const [activeLeague, setActiveLeague] = useState('lidom');
  const [scoreboardData, setScoreboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  const loadScores = async (league, isManual = false) => {
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
  };

  useEffect(() => {
    setLoading(true);
    loadScores(activeLeague);

    // Auto-actualizar cada 60 segundos
    const interval = setInterval(() => {
      loadScores(activeLeague);
    }, 60000);

    return () => clearInterval(interval);
  }, [activeLeague]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = direction === 'left' ? -280 : 280;
    scrollRef.current.scrollBy({ left: distance, behavior: 'smooth' });
  };

  const games = scoreboardData?.games || [];

  return (
    <div className="w-full mb-6 border border-terminal-gray/80 bg-surface-container-low/70 backdrop-blur-md overflow-hidden rounded-sm transition-all duration-300 shadow-sm">
      {/* Header bar con selector de ligas y estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-black/40 border-b border-terminal-gray/60 font-mono text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-system-red text-black font-bold uppercase tracking-wider text-[11px] rounded-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
            MARCADORES
          </span>

          {/* Selector de ligas */}
          <div className="flex items-center gap-1 bg-surface-container-lowest/80 p-0.5 rounded border border-terminal-gray/40">
            {LEAGUES.map((league) => {
              const isActive = activeLeague === league.id;
              return (
                <button
                  key={league.id}
                  onClick={() => setActiveLeague(league.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xs transition-colors ${
                    isActive
                      ? 'bg-system-red text-black shadow-xs'
                      : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                  }`}
                  title={league.label}
                >
                  <span>{league.emoji}</span>
                  <span>{league.name}</span>
                </button>
              );
            })}
          </div>
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
            <span>No hay partidos programados hoy para {scoreboardData?.leagueName || activeLeague.toUpperCase()}.</span>
          </div>
        ) : (
          games.map((game) => {
            const isLive = game.status === 'IN_PROGRESS';
            const isFinal = game.status === 'FINAL';

            return (
              <div
                key={game.id}
                className={`min-w-[240px] max-w-[270px] shrink-0 p-3 rounded bg-black/30 border transition-all duration-200 hover:border-system-red/60 hover:bg-black/50 ${
                  isLive
                    ? 'border-system-red/80 shadow-[0_0_12px_rgba(255,59,48,0.15)]'
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
                    <span className="text-on-surface-variant uppercase font-medium">
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
                        className="truncate text-xs font-semibold text-white"
                        title={game.awayTeam.name}
                      >
                        {game.awayTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono font-bold shrink-0 ${
                        isLive ? 'text-system-red' : isFinal ? 'text-white' : 'text-terminal-muted'
                      }`}
                    >
                      {game.awayTeam.score !== null ? game.awayTeam.score : '-'}
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
                        className="truncate text-xs font-semibold text-white"
                        title={game.homeTeam.name}
                      >
                        {game.homeTeam.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-mono font-bold shrink-0 ${
                        isLive ? 'text-system-red' : isFinal ? 'text-white' : 'text-terminal-muted'
                      }`}
                    >
                      {game.homeTeam.score !== null ? game.homeTeam.score : '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
