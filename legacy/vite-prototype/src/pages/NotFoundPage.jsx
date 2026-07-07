import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { articles } from '../data/mockData';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = "ACCESO DENEGADO (404) | Hackeando el Sistema";
    
    // Set robots meta
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'NOINDEX, NOFOLLOW');

    return () => {
      if (robots) {
        robots.setAttribute('content', 'INDEX, FOLLOW');
      }
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Recommendations: 3 recent posts
  const recentPosts = articles.slice(0, 3);

  // Recommendations: categories
  const categoriesList = [
    { name: 'NACIONALES', id: 'NACIONALES' },
    { name: 'POLÍTICA', id: 'POLÍTICA' },
    { name: 'TECNOLOGÍA', id: 'TECNOLOGÍA' },
    { name: 'INTERNACIONAL', id: 'INTERNACIONAL' },
    { name: 'INVESTIGACIÓN', id: 'INVESTIGACIÓN' }
  ];

  return (
    <div className="w-full bg-background text-on-surface py-12 flex flex-col justify-center min-h-[70vh]">
      <div className="max-w-2xl w-full mx-auto bg-surface-container-lowest border border-system-red/60 p-8 relative">
        {/* Warning corner label */}
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-system-red font-bold animate-pulse">
          [!] ALERTA_CONEXIÓN_FALLIDA
        </div>

        {/* Cyberpunk terminal error code */}
        <div className="text-center mb-8 border-b border-terminal-gray pb-6">
          <div className="inline-block bg-system-red text-black font-mono font-bold text-[18px] px-6 py-2 mb-4 tracking-wider">
            ERROR 404 // CÓDIGO_410
          </div>
          <h1 className="font-headline-md text-3xl text-white uppercase font-bold tracking-tight">
            Enlace Roto o Archivo Eliminado
          </h1>
          <p className="text-[11.5px] text-on-surface-variant font-mono mt-2 leading-relaxed max-w-lg mx-auto">
            La dirección a la que intenta acceder no existe en esta terminal, o ha sido purgada del servidor por razones de seguridad de datos.
          </p>
        </div>

        {/* Suggestions & Search */}
        <div className="space-y-8 font-mono text-[11px]">
          
          {/* Interactive search panel */}
          <div className="bg-matrix-dim border border-terminal-gray p-4 space-y-3">
            <h3 className="text-white font-bold uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-system-red text-[16px]">search</span>
              Localizar registros alternativos
            </h3>
            
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                className="flex-grow bg-black/60 border border-terminal-gray focus:border-system-red focus:outline-none py-2 px-3 text-white placeholder:opacity-30"
                placeholder="Introduzca término de búsqueda..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-system-red text-black hover:bg-white hover:text-black font-label-caps text-label-caps font-bold px-6 py-2 transition-all active:scale-95 shrink-0"
              >
                BUSCAR
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Recent Publications */}
            <div className="space-y-3">
              <h3 className="text-white font-bold uppercase border-b border-terminal-gray pb-1.5">
                Últimos Informes
              </h3>
              <nav className="flex flex-col gap-2">
                {recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/articulo/${post.id}`}
                    className="text-on-surface-variant hover:text-system-red hover:underline truncate"
                  >
                    » {post.title.toUpperCase()}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <h3 className="text-white font-bold uppercase border-b border-terminal-gray pb-1.5">
                Clasificaciones Principales
              </h3>
              <div className="flex flex-wrap gap-2">
                {categoriesList.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.id}`}
                    className="border border-terminal-gray px-2 py-0.5 text-[9px] hover:border-system-red hover:text-system-red transition-all"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Action to go back home */}
          <div className="flex justify-center pt-6 border-t border-terminal-gray/40">
            <Link
              to="/"
              className="border border-system-red text-system-red hover:bg-system-red hover:text-black font-label-caps text-label-caps font-bold px-8 py-3 transition-colors active:scale-98"
            >
              VOLVER A LA TERMINAL PRINCIPAL
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
