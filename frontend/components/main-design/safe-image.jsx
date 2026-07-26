'use client';

import { useEffect, useState } from 'react';

const DEFAULT_FALLBACK_SRC = '/isotipo.png';

export default function SafeImage({ src, fallbackSrc = DEFAULT_FALLBACK_SRC, alt = '', onError, ...props }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  return (
    <img
      {...props}
      alt={alt}
      src={currentSrc}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }

        onError?.(event);
      }}
    />
  );
}
