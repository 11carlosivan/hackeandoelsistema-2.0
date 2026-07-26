'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { systemStats } from '@/lib/main-design/mock-data';

export default function SideNavBar() {
  const router = useRouter();
  const [poll, setPoll] = useState(systemStats.activePoll);
  const [liveStats, setLiveStats] = useState(systemStats);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const weather = liveStats.weather || systemStats.weather;
  const dollarRate = liveStats.dollarRate || systemStats.dollarRate;
  const dollarSell = Number.isFinite(Number(dollarRate.sell)) ? Number(dollarRate.sell).toFixed(2) : 'N/D';

  useEffect(() => {
    let isActive = true;

    const loadStats = async () => {
      try {
        const response = await fetch(`${getClientApiBaseUrl()}/api/v1/public/system-stats`, {
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) return;

        const json = await response.json();

        if (isActive && json.data) {
          setLiveStats((current) => ({
            ...current,
            weather: json.data.weather || current.weather,
            dollarRate: json.data.dollarRate || current.dollarRate,
          }));
        }
      } catch {
        // Static fallback remains visible if live public telemetry is unavailable.
      }
    };

    loadStats();

    return () => {
      isActive = false;
    };
  }, []);

  const handleVote = (optionId) => {
    if (hasVoted) return;

    const updatedOptions = poll.options.map((option) => (
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option
    ));

    setPoll({
      ...poll,
      totalVotes: poll.totalVotes + 1,
      options: updatedOptions,
    });
    setHasVoted(true);
    setVotedOption(optionId);
  };

  return (
    <aside className="hidden lg:flex flex-col sticky top-[140px] h-[calc(100vh-140px)] w-64 shrink-0 py-stack-lg border-r border-terminal-gray bg-surface-container-low overflow-y-auto no-scrollbar">
      <div className="px-6 mb-8 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-system-red animate-pulse rounded-full" />
          <span className="font-headline-md text-[18px] text-system-red tracking-tighter">FEED DE INTELIGENCIA</span>
        </div>
        <p className="text-on-surface-variant font-label-caps text-label-caps opacity-60">Acceso a Terminal: Activo</p>
      </div>

      <nav className="flex-1 space-y-6">
        <div className="mx-6 p-4 border border-terminal-gray bg-surface-container/20 font-mono text-[11px] group">
          <div className="flex justify-between items-center text-[9px] text-on-surface-variant border-b border-terminal-gray pb-2 mb-3 font-bold uppercase tracking-wider">
            <span>CLIMA EN REP. DOM.</span>
            <span className="text-white font-bold">{weather.city.toUpperCase()}</span>
          </div>

          <div className="flex justify-between items-start mb-1">
            <div className="text-[32px] font-bold text-white leading-none">
              {weather.temp}°C
            </div>
            <span className="material-symbols-outlined text-system-red text-[36px] leading-none group-hover:scale-105 transition-transform duration-300">
              {weather.icon}
            </span>
          </div>

          <div className="text-on-surface-variant text-[9px] uppercase mb-4 opacity-80 font-bold">
            {weather.condition}
          </div>

          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-terminal-gray text-center text-[8px] text-on-surface-variant uppercase font-bold">
            <div className="border-r border-terminal-gray/60">
              <div className="opacity-60 mb-0.5">Humedad</div>
              <div className="text-white">{weather.humidity}</div>
            </div>
            <div className="border-r border-terminal-gray/60">
              <div className="opacity-60 mb-0.5">Viento</div>
              <div className="text-white">{weather.wind}</div>
            </div>
            <div>
              <div className="opacity-60 mb-0.5">Sensacion</div>
              <div className="text-white">{weather.feelsLike}</div>
            </div>
          </div>
        </div>

        <div className="group px-6 py-1 text-secondary-fixed-dim font-label-caps text-label-caps">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-system-red text-[24px]">payments</span>
            <div className="flex flex-col">
              <span className="text-on-surface uppercase tracking-wider text-[11px]">Tasa del Dolar</span>
              <span className="text-[10px] text-data-green flex items-center gap-1">
                USD/DOP: {dollarSell}
                <span className="material-symbols-outlined text-[12px] animate-bounce">
                  {dollarRate.trend === 'down' ? 'trending_down' : dollarRate.trend === 'up' ? 'trending_up' : 'trending_flat'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="group px-6 py-1 text-secondary-fixed-dim font-label-caps text-label-caps">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-system-red">play_circle</span>
              <span className="text-on-surface text-[11px] tracking-wider uppercase">HES TV: Reporte</span>
            </div>

            <a
              href="https://www.youtube.com/@hackeandoelsistemaTV"
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-video bg-surface-container border border-white/10 overflow-hidden group-hover:border-system-red transition-colors cursor-pointer"
            >
              <div
                className="w-full h-full bg-cover bg-center flex flex-col items-center justify-center p-4 bg-stripes bg-[size:10px_10px]"
                style={{ backgroundImage: `url('${systemStats.hesTv.thumbnail}')` }}
              >
                <span className="material-symbols-outlined text-[48px] text-system-red group-hover:scale-110 transition-all drop-shadow-[0_0_12px_rgba(255,0,0,0.4)]">
                  play_circle
                </span>
                <span className="text-[10px] text-white font-mono tracking-widest mt-2 bg-black/80 px-2 py-0.5 border border-white/10 font-bold">
                  IR AL CANAL OFICIAL
                </span>
              </div>
            </a>
          </div>
        </div>

        <div className="px-6 py-1">
          <div className="w-full aspect-[300/250] bg-black border border-system-red/30 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer p-4">
            <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
            <span className="material-symbols-outlined text-system-red opacity-40 mb-2">enhanced_encryption</span>
            <span className="text-[10px] font-label-caps text-system-red tracking-widest text-center">ESPACIO PUBLICITARIO ENCRIPTADO</span>
            <span className="text-[9px] text-on-surface-variant opacity-60 mt-2 text-center leading-tight">Conexion segura de sandbox</span>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-system-red/20" />
          </div>
        </div>

        <div className="px-6 py-1">
          <div className="border border-terminal-gray p-4 bg-surface-container/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-system-red text-[16px]">ballot</span>
              <h4 className="font-label-caps text-[11px] text-white">ENCUESTA ACTIVA</h4>
            </div>
            <p className="text-[12px] text-on-surface mb-3 font-semibold leading-tight">
              {poll.question}
            </p>

            <div className="space-y-2">
              {poll.options.map((option) => {
                const percentage = poll.totalVotes > 0
                  ? Math.round((option.votes / poll.totalVotes) * 100)
                  : 0;

                return (
                  <div key={option.id} className="relative">
                    {hasVoted ? (
                      <div className="w-full bg-surface-container border border-terminal-gray p-2 text-left relative overflow-hidden text-[11px]">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-system-red/10 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative z-10 flex justify-between">
                          <span className={`${votedOption === option.id ? 'text-system-red font-bold' : 'text-on-surface-variant'}`}>
                            {option.label}
                          </span>
                          <span className="font-bold text-white">{percentage}%</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleVote(option.id)}
                        className="w-full border border-terminal-gray hover:border-system-red p-2 text-left text-[11px] text-on-surface-variant hover:text-white transition-all bg-black/40 hover:bg-system-red/5"
                        type="button"
                      >
                        {option.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[9px] font-label-caps text-on-surface-variant text-right">
              Votos totales: {poll.totalVotes}
            </div>
          </div>
        </div>

        <div className="px-6 py-1">
          <div className="flex items-center gap-4 text-secondary-fixed-dim font-label-caps text-label-caps">
            <span className="material-symbols-outlined text-system-red">trending_up</span>
            <span className="text-on-surface text-[11px] tracking-wider uppercase">Tendencias Activas</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-[9px] bg-surface-container border border-terminal-gray text-on-surface-variant px-2 py-0.5 font-label-caps">#Aegis9</span>
            <span className="text-[9px] bg-surface-container border border-terminal-gray text-on-surface-variant px-2 py-0.5 font-label-caps">#ReformaFiscal</span>
            <span className="text-[9px] bg-surface-container border border-terminal-gray text-on-surface-variant px-2 py-0.5 font-label-caps">#PoligonoCentral</span>
          </div>
        </div>
      </nav>

      <div className="px-6 py-6 border-t border-terminal-gray shrink-0">
        <button
          onClick={() => router.push('/contacto-seguro')}
          className="w-full bg-system-red text-black font-headline-md text-[14px] py-3 px-4 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all font-bold"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">campaign</span>
          ENVIAR DENUNCIA
        </button>
        <div className="mt-6 flex justify-around text-on-surface-variant">
          <button className="material-symbols-outlined hover:text-system-red" title="Cerrar conexion" type="button">logout</button>
          <button className="material-symbols-outlined hover:text-system-red" title="Ayuda operativa" type="button">help_outline</button>
        </div>
      </div>
    </aside>
  );
}
