'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAzuraCastClientConfig } from '@/lib/main-design/azuracast';

function getStatusLabel(nowPlaying) {
  if (nowPlaying?.isLive && nowPlaying?.streamerName) {
    return `EN VIVO: ${nowPlaying.streamerName}`;
  }

  return nowPlaying?.stationName || 'Hackeando el Sistema Radio';
}

export default function RadioPage() {
  const config = useMemo(() => getAzuraCastClientConfig(), []);
  const audioRef = useRef(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const streamUrl = nowPlaying?.streamUrl || config.streamUrl;
  const publicPageUrl = nowPlaying?.publicPageUrl || config.publicPageUrl;

  useEffect(() => {
    let active = true;

    const loadNowPlaying = async () => {
      try {
        const response = await fetch('/azuracast/now-playing', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const json = await response.json();

        if (!response.ok || !json?.data) {
          throw new Error('No now playing payload');
        }

        if (active) {
          setNowPlaying(json.data.enabled === false ? null : json.data);
          setError(json.data.enabled === false ? 'La transmision todavia no esta configurada.' : '');
        }
      } catch {
        if (active) {
          setError('No se pudo leer el estado de la transmision.');
        }
      }
    };

    loadNowPlaying();
    const interval = setInterval(loadNowPlaying, Math.max(10, config.pollSeconds || 20) * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [config]);

  const handleToggle = async () => {
    if (!audioRef.current || !streamUrl) {
      setError('El enlace de audio no esta disponible.');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      await audioRef.current.play();
      setIsPlaying(true);
      setError('');
    } catch {
      setIsPlaying(false);
      setError('El navegador bloqueo el inicio automatico. Toca escuchar otra vez.');
    }
  };

  return (
    <section className="mx-auto max-w-5xl border border-terminal-gray bg-surface-container-low">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-terminal-gray bg-black p-6 md:p-10 lg:border-b-0 lg:border-r">
          <div className="mb-4 inline-flex items-center gap-2 border border-system-red/60 px-3 py-1 font-label-caps text-[10px] font-bold uppercase tracking-widest text-system-red">
            <span className="material-symbols-outlined text-[16px] animate-pulse">radio</span>
            Transmision en vivo
          </div>

          <h1 className="font-headline-xl text-4xl uppercase leading-none text-white md:text-6xl">
            HES Radio
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant md:text-base">
            Escucha la senal oficial de Hackeando el Sistema directamente desde este dominio.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleToggle}
              disabled={!streamUrl}
              className="flex min-h-12 items-center justify-center gap-2 bg-system-red px-5 py-3 font-label-caps text-xs font-bold uppercase text-black transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              {isPlaying ? 'Pausar senal' : 'Escuchar ahora'}
            </button>

            {publicPageUrl ? (
              <a
                href={publicPageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 border border-terminal-gray px-5 py-3 font-label-caps text-xs font-bold uppercase text-on-surface-variant transition-all hover:border-system-red hover:text-system-red"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Abrir reproductor
              </a>
            ) : null}
          </div>

          <audio
            ref={audioRef}
            src={streamUrl || undefined}
            preload="none"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        </div>

        <div className="p-6 md:p-10">
          <div className="flex items-start gap-4 border border-terminal-gray bg-black/50 p-4 md:p-6">
            {nowPlaying?.art ? (
              <img
                src={nowPlaying.art}
                alt=""
                className="h-20 w-20 shrink-0 object-cover md:h-28 md:w-28"
                loading="lazy"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-system-red/50 bg-system-red/10 md:h-28 md:w-28">
                <span className="material-symbols-outlined text-4xl text-system-red">graphic_eq</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-label-caps text-[10px] font-bold uppercase tracking-widest text-system-red">
                {getStatusLabel(nowPlaying)}
              </div>
              <div className="mt-3 text-xl font-bold uppercase leading-tight text-white md:text-2xl">
                {nowPlaying?.text || 'Senal lista'}
              </div>
              <div className="mt-4 grid gap-3 text-xs uppercase text-on-surface-variant sm:grid-cols-3">
                <div className="border border-terminal-gray/70 p-3">
                  <div className="text-2xl font-bold text-white">{nowPlaying?.listeners?.current ?? 0}</div>
                  <div className="mt-1 font-label-caps text-[9px]">Oyentes</div>
                </div>
                <div className="border border-terminal-gray/70 p-3">
                  <div className="text-2xl font-bold text-white">{nowPlaying?.listeners?.unique ?? 0}</div>
                  <div className="mt-1 font-label-caps text-[9px]">Unicos</div>
                </div>
                <div className="border border-terminal-gray/70 p-3">
                  <div className="text-2xl font-bold text-white">{nowPlaying?.isLive ? 'ON' : 'AUTO'}</div>
                  <div className="mt-1 font-label-caps text-[9px]">Modo</div>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 border border-system-red/60 bg-system-red/10 px-4 py-3 text-sm text-system-red">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
