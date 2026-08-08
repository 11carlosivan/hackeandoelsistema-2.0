'use client';

import { useEffect, useMemo, useState } from 'react';

function htmlToText(html) {
  if (!html || typeof window === 'undefined') return '';

  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, style, iframe, noscript').forEach((node) => node.remove());

  return template.content.textContent || '';
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export default function ArticleAudioPlayer({ title = '', contentText = '', contentHtml = '' }) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const hasSupport = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    setSupported(hasSupport);

    return () => {
      if (hasSupport) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const readableText = useMemo(() => {
    const body = normalizeText(contentText) || normalizeText(htmlToText(contentHtml));
    return normalizeText(`${title}. ${body}`);
  }, [contentHtml, contentText, title]);

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  };

  const play = () => {
    if (!supported || !readableText) return;

    if (paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      setPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(readableText);
    utterance.lang = 'es-DO';
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      setPlaying(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setPlaying(false);
      setPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setPaused(false);
  };

  const pause = () => {
    if (!supported || !playing) return;
    window.speechSynthesis.pause();
    setPlaying(false);
    setPaused(true);
  };

  const changeRate = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(nextRate);

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      setPaused(false);
    }
  };

  if (!supported || !readableText) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-terminal-gray bg-black/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-system-red bg-system-red/10 text-system-red">
          <span className="material-symbols-outlined text-[22px]">{playing ? 'volume_up' : 'record_voice_over'}</span>
        </div>
        <div>
          <div className="font-label-caps text-[10px] font-bold tracking-wider text-white">Escuchar articulo</div>
          <div className="font-mono text-[10px] text-on-surface-variant">
            {playing ? 'Reproduciendo lectura...' : paused ? 'Lectura pausada' : 'Lectura por voz del navegador'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {playing ? (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-1.5 border border-terminal-gray bg-black px-4 py-2 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
          >
            <span className="material-symbols-outlined text-base">pause</span>
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={play}
            className="inline-flex items-center gap-1.5 bg-system-red px-4 py-2 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            {paused ? 'Reanudar' : 'Escuchar'}
          </button>
        )}

        {(playing || paused) && (
          <button
            type="button"
            onClick={stop}
            className="border border-terminal-gray bg-black p-2 text-on-surface-variant transition-colors hover:border-system-red hover:text-system-red"
            title="Detener"
          >
            <span className="material-symbols-outlined text-base">stop</span>
          </button>
        )}

        <button
          type="button"
          onClick={changeRate}
          className="border border-terminal-gray bg-black/60 px-3 py-2 font-mono text-[10px] text-white transition-colors hover:border-system-red hover:text-system-red"
          title="Velocidad"
        >
          {rate}x
        </button>
      </div>
    </div>
  );
}
