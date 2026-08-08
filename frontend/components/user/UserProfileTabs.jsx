'use client';

import { useState } from 'react';
import Link from 'next/link';
import VerifiedBadge from './VerifiedBadge';

export default function UserProfileTabs({ userActivity = {} }) {
  const [activeTab, setActiveTab] = useState('reposts');

  const {
    reposts = [
      {
        id: 'rep-1',
        title: 'Análisis: Impacto Económico en las Principales Provincias del País',
        category: 'Economía',
        date: '02 de Agosto, 2026',
        snippet: 'El desarrollo tecnológico y bancario continúa mostrando un crecimiento acelerado...',
        route: '/articulo/analisis-impacto-economico',
      },
      {
        id: 'rep-2',
        title: 'Nuevas Regulaciones para Medios Digitales y Periodismo Independiente',
        category: 'Nacionales',
        date: '28 de Julio, 2026',
        snippet: 'El congreso aprueba un nuevo borrador de ley enfocado en la libertad de prensa...',
        route: '/articulo/nuevas-regulaciones-medios-digitales',
      },
    ],
    commentsMade = [
      {
        id: 'cm-1',
        articleTitle: 'Análisis: Impacto Económico en las Principales Provincias',
        articleRoute: '/articulo/analisis-impacto-economico',
        date: '03 de Agosto, 2026',
        text: 'Excelente reportaje. Considero que el sector de telecomunicaciones jugará un rol decisivo en las zonas urbanas.',
        likes: 5,
      },
      {
        id: 'cm-2',
        articleTitle: 'Opinión: La verdad detrás de las estadísticas oficiales',
        articleRoute: '/opinion/verdad-estadisticas-oficiales',
        date: '30 de Julio, 2026',
        text: 'Coincido plenamente con la postura del autor, las cifras presentadas reflejan la realidad de los sectores populares.',
        likes: 12,
      },
    ],
    commentsReceived = [
      {
        id: 'cr-1',
        authorName: 'María Rodríguez',
        isVerified: true,
        date: '03 de Agosto, 2026',
        text: '¡Muy buen comentario! Agregaría además el impacto en las pequeñas empresas locales.',
        onCommentText: 'Excelente reportaje. Considero que el sector de telecomunicaciones...',
      },
      {
        id: 'cr-2',
        authorName: 'Carlos Gómez',
        isVerified: true,
        date: '01 de Agosto, 2026',
        text: 'Totalmente de acuerdo contigo en ese punto.',
        onCommentText: 'Coincido plenamente con la postura del autor...',
      },
    ],
  } = userActivity;

  return (
    <div className="w-full space-y-6">
      {/* Navegación por Pestañas */}
      <div className="flex border-b border-terminal-gray overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('reposts')}
          className={`flex items-center gap-2 px-6 py-3.5 font-label-caps text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'reposts'
              ? 'border-system-red text-system-red bg-surface-container-low/40'
              : 'border-transparent text-on-surface-variant hover:text-white hover:border-terminal-gray'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">repeat</span>
          Reposts / Publicaciones ({reposts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('commentsMade')}
          className={`flex items-center gap-2 px-6 py-3.5 font-label-caps text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'commentsMade'
              ? 'border-system-red text-system-red bg-surface-container-low/40'
              : 'border-transparent text-on-surface-variant hover:text-white hover:border-terminal-gray'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">comment</span>
          Comentarios Hechos ({commentsMade.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('commentsReceived')}
          className={`flex items-center gap-2 px-6 py-3.5 font-label-caps text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'commentsReceived'
              ? 'border-system-red text-system-red bg-surface-container-low/40'
              : 'border-transparent text-on-surface-variant hover:text-white hover:border-terminal-gray'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">forum</span>
          Comentarios Recibidos ({commentsReceived.length})
        </button>
      </div>

      {/* Contenido de cada pestaña */}
      <div className="space-y-4">
        {/* Pestaña: Reposts */}
        {activeTab === 'reposts' && (
          <div className="space-y-4">
            {reposts.length > 0 ? (
              reposts.map((item) => (
                <div
                  key={item.id}
                  className="border border-terminal-gray bg-surface-container-low/20 p-5 hover:border-system-red transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-label-caps text-system-red text-[10px] font-bold">
                      {item.category || 'NOTICIA'}
                    </span>
                    <span className="text-xs text-on-surface-variant">{item.date}</span>
                  </div>
                  <Link href={item.route || '#'}>
                    <h3 className="font-headline-md text-xl text-white hover:text-system-red transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  <p className="text-on-surface-variant text-sm mt-2 line-clamp-2">
                    {item.snippet}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-terminal-gray text-on-surface-variant text-sm">
                No ha reposteado publicaciones aún.
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Comentarios Hechos */}
        {activeTab === 'commentsMade' && (
          <div className="space-y-4">
            {commentsMade.length > 0 ? (
              commentsMade.map((item) => (
                <div
                  key={item.id}
                  className="border border-terminal-gray bg-surface-container-low/20 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>Comentario en:</span>
                    <span>{item.date}</span>
                  </div>
                  <Link href={item.articleRoute || '#'} className="font-headline-md text-base text-white hover:text-system-red transition-colors block">
                    "{item.articleTitle}"
                  </Link>
                  <div className="p-3 bg-black border-l-2 border-system-red text-sm text-on-surface">
                    {item.text}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] text-system-red">favorite</span>
                    <span>{item.likes} Me gusta</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-terminal-gray text-on-surface-variant text-sm">
                No ha realizado comentarios aún.
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Comentarios Recibidos */}
        {activeTab === 'commentsReceived' && (
          <div className="space-y-4">
            {commentsReceived.length > 0 ? (
              commentsReceived.map((item) => (
                <div
                  key={item.id}
                  className="border border-terminal-gray bg-surface-container-low/20 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-headline-md text-sm text-white font-bold">{item.authorName}</span>
                      {item.isVerified && <VerifiedBadge size="sm" />}
                      <span className="text-xs text-on-surface-variant">te ha respondido:</span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{item.date}</span>
                  </div>
                  {item.onCommentText && (
                    <div className="text-xs text-on-surface-variant italic pl-3 border-l border-terminal-gray">
                      En respuesta a tu comentario: "{item.onCommentText}"
                    </div>
                  )}
                  <div className="p-3 bg-black border border-terminal-gray text-sm text-on-surface">
                    {item.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-terminal-gray text-on-surface-variant text-sm">
                No ha recibido respuestas o comentarios aún.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
