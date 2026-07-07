import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { articles, authors } from '../data/mockData';

export default function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const categoryName = id ? id.toUpperCase() : 'NOTICIAS';

  // Filter articles
  const filteredArticles = articles.filter(
    art => art.category === categoryName
  );

  const getAuthorName = (authorId) => {
    const author = authors.find(auth => auth.id === authorId);
    return author ? author.name : 'Redacción';
  };

  return (
    <div className="w-full bg-background text-on-surface">
      {/* Category Header */}
      <div className="flex justify-between items-end border-b border-system-red mb-12 pb-4">
        <h1 className="font-headline-xl text-3xl md:text-[40px] text-white tracking-wide uppercase">
          CATEGORÍA // {categoryName}
        </h1>
        <span className="font-label-caps text-label-caps text-system-red animate-pulse">
          NODE_FILTER: {filteredArticles.length} ITEMS_FOUND
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start px-2 md:px-0">
        
        {/* Articles List */}
        <div className="flex-grow max-w-3xl w-full space-y-12">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((art) => (
              <div 
                key={art.id} 
                className="group border border-terminal-gray bg-surface-container-low/40 p-6 flex flex-col md:flex-row gap-6 items-start hover:border-system-red transition-all cursor-pointer"
                onClick={() => navigate(`/articulo/${art.id}`)}
              >
                {/* Article Image */}
                <div className="w-full md:w-60 aspect-video shrink-0 overflow-hidden border border-terminal-gray relative">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                    alt={art.title}
                    src={art.image}
                  />
                  {art.tag && (
                    <div className="absolute top-2 left-2 bg-black/85 font-label-sm text-label-sm text-white px-2 py-0.5 font-bold">
                      {art.tag}
                    </div>
                  )}
                </div>

                {/* Article Info */}
                <div className="flex-grow flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-system-red font-label-caps text-[10px] font-bold">
                      <span>{art.date}</span>
                      <span>•</span>
                      <span>{art.views} VISTAS</span>
                      <span>•</span>
                      <span>{art.readTime}</span>
                    </div>
                    
                    <h2 className="font-headline-md text-[20px] text-white group-hover:text-system-red transition-colors mb-2 uppercase leading-snug">
                      {art.title}
                    </h2>
                    
                    <p className="text-body-md text-on-surface-variant line-clamp-2 mb-4">
                      {art.subtitle}
                    </p>
                  </div>
                  
                  <div className="text-[11px] font-label-caps text-on-surface-variant flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-system-red rounded-full"></span>
                    <span>AUTOR: {getAuthorName(art.authorId).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-terminal-gray p-12 text-center text-on-surface-variant font-label-caps text-[13px]">
              [ERROR: NODE_EMPTY] No hay informes clasificados bajo esta categoría en este momento.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-12 lg:sticky lg:top-36">
          
          {/* Ad Space */}
          <div className="p-6 bg-surface-container border border-terminal-gray relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-30 text-[10px] font-label-caps">AD_ID: 992-X</div>
            <div className="text-system-red font-headline-md text-[18px] mb-2 uppercase">PROTEJA SU TERMINAL</div>
            <p className="text-[12px] text-on-surface-variant mb-4 font-body-md leading-relaxed">
              VPN de grado militar con cifrado cuántico. Indetectable por agentes de escaneo Aegis-9.
            </p>
            <button className="w-full border border-system-red text-system-red py-2 text-[11px] font-label-caps hover:bg-system-red hover:text-background transition-all font-bold active:scale-95">
              ADQUIRIR ACCESO
            </button>
          </div>

          {/* System Tag Cloud */}
          <div className="bg-surface-container/20 p-6 border border-terminal-gray">
            <h3 className="font-label-caps text-xs text-white mb-4 border-b border-terminal-gray pb-2 uppercase font-bold">
              METADATA_TAGS
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#Criptografía</span>
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#SeguridadVial</span>
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#Gentrificación</span>
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#PresupuestoNacional</span>
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#IA_Vigilancia</span>
              <span className="text-[10px] bg-black border border-terminal-gray text-on-surface-variant hover:text-system-red hover:border-system-red px-2 py-1 font-label-caps cursor-pointer">#BuzónSeguro</span>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
