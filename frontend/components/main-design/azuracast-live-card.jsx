'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAzuraCastClientConfig } from '@/lib/main-design/azuracast';

function stationLabel(nowPlaying) {
  if (nowPlaying?.isLive && nowPlaying?.streamerName) {
    return `EN VIVO: ${nowPlaying.streamerName}`;
  }

  return nowPlaying?.stationName || 'HES En Vivo';
}

export default function AzuraCastLiveCard({ fallback = null }) {
  const config = useMemo(() => getAzuraCastClientConfig(), []);
  const audioRef = useRef(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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

        if (active && json.data) {
          setNowPlaying(json.data.enabled === false ? null : json.data);
          setHasLoaded(true);
          setError(json.data.enabled === false ? 'senal no configurada' : '');
        }
      } catch {
        if (active) {
          setHasLoaded(true);
          setError('senal no disponible');
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

  if (!config.enabled && hasLoaded && !nowPlaying) {
    return fallback;
  }

  const handleToggle = async () => {
    if (!audioRef.current || !streamUrl) {
      setError('stream no configurado');
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
      setError('no se pudo iniciar');
    }
  };

  return (
    <div className="group px-6 py-2 text-secondary-fixed-dim font-label-caps text-label-caps">
      <div className="flex flex-col gap-2 w-full border border-terminal-gray bg-black/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-system-red text-[20px] animate-pulse">radio</span>
            <span className="text-on-surface text-[11px] tracking-wider uppercase font-bold truncate">
              SENAL EN VIVO
            </span>
          </div>
          <span className="text-[9px] font-mono bg-system-red text-black px-1.5 py-0.5 font-bold uppercase">
            AUDIO
          </span>
        </div>

        <div className="flex items-center gap-3 border border-white/10 bg-black p-3">
          {nowPlaying?.art ? (
            <img
              src={nowPlaying.art}
              alt=""
              className="h-14 w-14 shrink-0 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-system-red/40 bg-system-red/10">
              <span className="material-symbols-outlined text-system-red">graphic_eq</span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-widest text-system-red">
              {stationLabel(nowPlaying)}
            </div>
            <div className="mt-1 truncate text-[12px] font-bold text-white">
              {nowPlaying?.text || 'Senal de audio disponible'}
            </div>
            <div className="mt-1 text-[9px] text-on-surface-variant">
              Oyentes: {nowPlaying?.listeners?.current ?? 0}
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={streamUrl || undefined}
          preload="none"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className="flex items-center justify-center gap-2 bg-system-red px-3 py-2 text-[10px] font-bold uppercase text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            disabled={!streamUrl}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
            {isPlaying ? 'Pausar' : 'Escuchar'}
          </button>

          {publicPageUrl ? (
            <a
              href={publicPageUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center border border-terminal-gray px-3 py-2 text-system-red hover:border-system-red"
              title="Abrir transmision"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          ) : null}
        </div>

        {error ? (
          <div className="text-[9px] uppercase tracking-wider text-system-red">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
