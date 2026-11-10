'use client';

import React, { useMemo } from 'react';

const BULB_PALETTE = [
  {
    name: 'red',
    fill: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.75)',
    duration: '4.2s',
    delay: '0s',
    tilt: 0,
  },
  {
    name: 'gold',
    fill: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.75)',
    duration: '3.7s',
    delay: '1.2s',
    tilt: -2,
  },
  {
    name: 'green',
    fill: '#10b981',
    glow: 'rgba(16, 185, 129, 0.75)',
    duration: '4.8s',
    delay: '2.5s',
    tilt: 2.5,
  },
  {
    name: 'blue',
    fill: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.75)',
    duration: '3.9s',
    delay: '0.6s',
    tilt: -1.5,
  },
  {
    name: 'magenta',
    fill: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.75)',
    duration: '4.5s',
    delay: '1.9s',
    tilt: 1.5,
  },
  {
    name: 'amber',
    fill: '#f97316',
    glow: 'rgba(249, 115, 22, 0.75)',
    duration: '3.5s',
    delay: '3.1s',
    tilt: -2,
  },
];

const SEGMENT_COUNT = 80; // Suffices to seamlessly cover up to 4K displays (3840px / 48px)

export default function ChristmasLights() {
  const segments = useMemo(() => {
    return Array.from({ length: SEGMENT_COUNT }, (_, index) => {
      const config = BULB_PALETTE[index % BULB_PALETTE.length];
      return {
        id: index,
        ...config,
      };
    });
  }, []);

  return (
    <div
      className="absolute top-0 left-0 w-full pointer-events-none select-none overflow-hidden z-20 h-6 flex flex-nowrap"
      aria-hidden="true"
    >
      <style>{`
        @keyframes holidayBreathe {
          0%, 100% {
            opacity: 0.95;
            filter: drop-shadow(0 0 5px var(--glow)) drop-shadow(0 0 2px var(--color));
          }
          30% {
            opacity: 0.82;
            filter: drop-shadow(0 0 3.5px var(--glow));
          }
          60% {
            opacity: 0.42;
            filter: drop-shadow(0 0 1.5px var(--glow)) brightness(0.85);
          }
          80% {
            opacity: 0.72;
            filter: drop-shadow(0 0 3px var(--glow));
          }
        }

        .holiday-bulb-group {
          animation-name: holidayBreathe;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          will-change: opacity, filter;
        }

        @media (prefers-reduced-motion: reduce) {
          .holiday-bulb-group {
            animation: none !important;
            opacity: 0.85 !important;
            filter: drop-shadow(0 0 3px var(--glow)) !important;
          }
        }
      `}</style>

      {segments.map((seg) => (
        <svg
          key={seg.id}
          viewBox="0 0 48 24"
          className="shrink-0 w-12 h-6"
          preserveAspectRatio="none"
        >
          {/* Hanging dark pine cable with natural droop */}
          <path
            d="M 0 1 Q 24 7 48 1"
            stroke="#142e1b"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Subtle cable highlight */}
          <path
            d="M 0 1.5 Q 24 7.5 48 1.5"
            stroke="rgba(34, 197, 94, 0.15)"
            strokeWidth="0.5"
            fill="none"
          />

          {/* Sockets / Cap attached to the cable */}
          <rect
            x="21.5"
            y="5.5"
            width="5"
            height="3.5"
            rx="0.5"
            fill="#1c2d20"
            stroke="#0b170e"
            strokeWidth="0.5"
          />

          {/* Light bulb with gentle twinkling animation */}
          <g
            className="holiday-bulb-group"
            style={{
              '--color': seg.fill,
              '--glow': seg.glow,
              animationDuration: seg.duration,
              animationDelay: seg.delay,
              transformOrigin: '24px 9px',
              transform: seg.tilt ? `rotate(${seg.tilt}deg)` : undefined,
            }}
          >
            {/* Teardrop glass bulb */}
            <path
              d="M 24 8.5 C 21 8.5 19 11 19 14 C 19 17 22 20.5 24 22.5 C 26 20.5 29 17 29 14 C 29 11 27 8.5 24 8.5 Z"
              fill={seg.fill}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="0.5"
            />

            {/* Inner warm filament core */}
            <circle
              cx="24"
              cy="14"
              r="2"
              fill="rgba(255, 255, 255, 0.45)"
            />

            {/* Glass specular curved reflection */}
            <path
              d="M 21.2 11 Q 20.2 13.5 21.2 16"
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth="0.75"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      ))}
    </div>
  );
}

