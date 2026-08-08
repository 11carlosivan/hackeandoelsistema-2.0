'use client';

import { useState, useEffect } from 'react';

export default function ArticleAudioPlayer({ title = '', contentText = '', contentHtml = '' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
    }
  }, []);

  const extractCleanText = () => {
    let rawText = contentText || '';
    if (!rawText && contentHtml && typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentHtml;
      rawText = tempDiv.textContent || tempDiv.innerText || '';
    }
    const fullText = `${title}. ${rawText}`;
    return fullText.replace(/\s+/g, ' ').trim();
  };

  const handlePlay = () => {
    if (!isSupported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel(); // Detener lecturas previas

    const textToRead = extractCleanText();
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'es-DO'; // Preferir español de República Dominicana o genérico es-ES / es-MX
    utterance.rate = rate;

    // Buscar voz en español disponible en el navegador
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith('es') || v.lang.includes('es-')
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!isSupported || !isPlaying) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const handleStop = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const changeSpeed = () => {
    const nextRate = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
    setRate(nextRate);
    if (isPlaying) {
      handleStop();
      setTimeout(handlePlay, 100);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="border border-terminal-gray bg-black/40 p-4 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-system-red/10 border border-system-red flex items-center justify-center text-system-red">
          <span className="material-symbols-outlined text-xl">
            {isPlaying ? 'volume_up' : 'campaign'}
          </span>
        </div>
        <div>
          <div className="font-label-caps text-xs text-white font-bold tracking-wider">
            Escuchar artículo
          </div>
          <div className="text-[10px] text-on-surface-variant font-mono">
            {isPlaying ? 'Reproduciendo audio...' : isPaused ? 'Audio pausado' : 'Lectura por voz con IA'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            type="button"
            onClick={handlePlay}
            className="flex items-center gap-1.5 bg-system-red text-black px-4 py-2 font-label-caps text-[10px] font-bold hover:bg-white transition-colors cursor-pointer rounded-sm"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            <span>{isPaused ? 'Reanudar' : 'Escuchar'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="flex items-center gap-1.5 border border-terminal-gray bg-black px-4 py-2 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors cursor-pointer rounded-sm"
          >
            <span className="material-symbols-outlined text-base">pause</span>
            <span>Pausar</span>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={handleStop}
            className="p-2 border border-terminal-gray bg-black text-on-surface-variant hover:text-system-red hover:border-system-red transition-colors cursor-pointer rounded-sm"
            title="Detener"
          >
            <span className="material-symbols-outlined text-base">stop</span>
          </button>
        )}

        <button
          type="button"
          onClick={changeSpeed}
          className="border border-terminal-gray bg-black/60 px-2.5 py-2 font-mono text-[10px] text-white hover:border-system-red hover:text-system-red transition-colors cursor-pointer rounded-sm"
          title="Cambiar velocidad"
        >
          {rate}x
        </button>
      </div>
    </div>
  );
}
