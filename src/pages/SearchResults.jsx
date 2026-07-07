import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { articles, authors } from '../data/mockData';

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract query from URL (?q=term)
  const getQueryParam = () => {
    const params = new URLSearchParams(location.search);
    return params.get('q') || '';
  };

  const [query, setQuery] = useState(getQueryParam());
  const [results, setResults] = useState([]);

  useEffect(() => {
    const activeQuery = getQueryParam();
    setQuery(activeQuery);
    
    if (activeQuery.trim()) {
      const filtered = articles.filter(art => 
        art.title.toLowerCase().includes(activeQuery.toLowerCase()) ||
        art.subtitle.toLowerCase().includes(activeQuery.toLowerCase()) ||
        art.category.toLowerCase().includes(activeQuery.toLowerCase()) ||
        (art.tag && art.tag.toLowerCase().includes(activeQuery.toLowerCase()))
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [location.search]);

  const handleInPageSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const getAuthorName = (authorId) => {
    const author = authors.find(auth => auth.id === authorId);
    return author ? author.name : 'Redacción';
  };

  return (
    <div className="w-full bg-background text-on-surface">
      {/* Header Info */}
      <div className="flex justify-between items-end border-b border-system-red mb-12 pb-4">
        <h1 className="font-headline-md text-2xl md:text-3xl text-white tracking-wide uppercase">
          BÚSQUEDA DE INTELIGENCIA
        </h1>
        <span className="font-label-caps text-label-caps text-system-red animate-pulse">
          ESTADO_BÚSQUEDA: ACTIVO
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start px-2 md:px-0">
        
        {/* Main Content Area */}
        <div className="flex-grow max-w-3xl w-full space-y-8">
          
          {/* In-page Search Bar */}
          <form onSubmit={handleInPageSearch} className="border border-terminal-gray p-6 bg-surface-container-low/30 relative">
            <label className="font-label-caps text-[10px] text-system-red block mb-2 font-bold">
              ESTABLECIENDO FILTRO DE CONSULTA...
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                className="flex-grow bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:opacity-30 px-3"
                placeholder="Introduzca términos clave..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-system-red text-black font-label-caps text-label-caps font-bold px-6 hover:bg-white transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                EJECUTAR
              </button>
            </div>
          </form>

          {/* Search Term Info */}
          {getQueryParam() && (
            <div className="text-[12px] font-label-caps text-on-surface-variant">
              RESULTADOS PARA: <span className="text-white font-bold">"{getQueryParam()}"</span> — {results.length} INFORMES ENCONTRADOS
            </div>
          )}

          {/* Search Results List */}
          <div className="space-y-8">
            {results.length > 0 ? (
              results.map((art) => (
                <div 
                  key={art.id} 
                  className="group border border-terminal-gray bg-surface-container-low/20 p-6 flex flex-col md:flex-row gap-6 items-start hover:border-system-red transition-all cursor-pointer"
                  onClick={() => navigate(`/articulo/${art.id}`)}
                >
                  {/* Image */}
                  <div className="w-full md:w-48 aspect-video shrink-0 overflow-hidden border border-terminal-gray relative">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                      alt={art.title}
                      src={art.image}
                    />
                    <div className="absolute top-2 left-2 bg-black/80 font-label-sm text-label-sm text-white px-2 py-0.5 font-bold">
                      {art.category}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-system-red font-label-caps text-[9px] font-bold">
                        <span>{art.date}</span>
                        <span>•</span>
                        <span>{art.views} VISTAS</span>
                      </div>
                      
                      <h3 className="font-headline-md text-[18px] text-white group-hover:text-system-red transition-colors mb-1 uppercase leading-snug">
                        {art.title}
                      </h3>
                      
                      <p className="text-body-md text-on-surface-variant text-xs line-clamp-2">
                        {art.subtitle}
                      </p>
                    </div>
                    
                    <div className="text-[10px] font-label-caps text-on-surface-variant pt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-system-red rounded-full"></span>
                      <span>AGENTE: {getAuthorName(art.authorId).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              getQueryParam() && (
                <div className="border border-dashed border-terminal-gray p-12 text-center text-on-surface-variant font-label-caps text-[12px] space-y-2">
                  <p className="text-system-red">[ERROR: CONSULTA_SIN_RESULTADOS]</p>
                  <p className="normal-case opacity-75">No se encontraron informes coincidentes en el servidor central.</p>
                </div>
              )
            )}
          </div>

        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-12 lg:sticky lg:top-36">
          
          {/* Safe search parameters */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold">
              FILTROS DE SEGURIDAD
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Las consultas en este portal están protegidas. No se conservan logs persistentes en la caché local del navegador.
            </p>
            <div className="text-[10px] font-mono text-data-green flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-data-green rounded-full animate-pulse"></span>
              <span>TÚNEL_SEGURO_TLS: CORRECTO</span>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
