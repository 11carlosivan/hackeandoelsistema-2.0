import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authors, articles, opinions } from '../data/mockData';

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find author
  const author = authors.find(auth => auth.id === id) || authors[0];

  // Filter articles and opinions by this author
  const authorArticles = articles.filter(art => art.authorId === author.id);
  const authorOpinions = opinions.filter(op => op.authorId === author.id);

  // Fallback metadata for mock HUD
  const locationCoords = author.id === 'v-shadows' 
    ? 'GEO_LOCK: 18.4861° N, 69.9312° W' 
    : 'GEO_LOCK: 52.5200° N, 13.4050° E';
  
  const pgpKey = author.id === 'v-shadows' ? '0x8F...EA14' : '0x4F...E192';

  const specializations = [
    'CIBER-INTELIGENCIA',
    'OSINT',
    'CRYPTOGRAPHY',
    'FORENSE DIGITAL',
    'SOCIOLOGÍA DE RED'
  ];

  return (
    <div className="w-full bg-background text-on-surface">
      
      {/* Agent Header Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start mb-12">
        
        {/* Portrait with Glitch/HUD */}
        <div className="lg:col-span-5 relative group w-full">
          <div className="glitch-border p-1 bg-terminal-gray/20">
            <div className="relative overflow-hidden aspect-[4/5] bg-surface-container border border-terminal-gray">
              <div className="absolute inset-0 scanline opacity-30 pointer-events-none z-10"></div>
              <img 
                className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" 
                alt={author.name}
                src={author.photo}
              />
              
              {/* HUD Overlays */}
              <div className="absolute inset-0 pointer-events-none border-[1px] border-system-red/20 flex flex-col justify-between p-4 font-label-sm text-system-red z-20">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-system-red animate-pulse rounded-full"></div>
                      <span className="font-bold">TRANSMISIÓN_ACTIVA</span>
                    </div>
                    <p className="text-[10px] font-mono">ID_REF: AGENTE_{author.name.toUpperCase().replace(/\s+/g, '_')}</p>
                  </div>
                  <div className="text-right text-[10px] font-mono">
                    <p>BIOMETRÍA: CONEXIÓN</p>
                    <p className="text-system-red">{locationCoords}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-end opacity-60 text-[9px]">
                  <p>ESTABILIDAD_SISTEMA: 99.4%</p>
                  <p>ESCANEO_EN_CURSO</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative HUD lines */}
          <div className="absolute -right-8 top-1/2 w-16 h-[1px] bg-system-red/30 hidden lg:block"></div>
          <div className="absolute -bottom-8 left-1/2 w-[1px] h-16 bg-system-red/30 hidden lg:block"></div>
        </div>

        {/* Bio & Status */}
        <div className="lg:col-span-7 flex flex-col justify-center h-full pt-6 lg:pt-0">
          <div className="mb-8">
            <span className="inline-block bg-system-red text-black font-label-caps text-label-caps px-3 py-1 mb-3 font-bold">
              PERFIL DE AGENTE: {author.clearance || 'NIVEL 5'}
            </span>
            <h1 className="font-headline-xl text-4xl md:text-headline-xl text-white uppercase leading-none tracking-tighter mb-4">
              {author.name}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant font-body-md leading-relaxed">
              {author.bio}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg border-t border-terminal-gray pt-8">
            
            {/* Security clearance */}
            <div className="space-y-4">
              <h3 className="font-label-caps text-label-caps text-system-red flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                AUTORIZACIÓN DE SEGURIDAD
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-terminal-gray pb-1 text-[12px]">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">PROTOCOLO SIGILO</span>
                  <span className="font-label-caps text-label-caps text-system-red font-bold">HABILITADO</span>
                </div>
                <div className="flex justify-between items-center border-b border-terminal-gray pb-1 text-[12px]">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">ACCESO A ARCHIVOS ENCRIPTADOS</span>
                  <span className="font-label-caps text-label-caps text-system-red font-bold">RESTRINGIDO</span>
                </div>
                <div className="flex justify-between items-center border-b border-terminal-gray pb-1 text-[12px]">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">CLAVE_ID</span>
                  <span className="font-label-caps text-label-caps text-on-surface-variant font-mono">{pgpKey}</span>
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="space-y-4">
              <h3 className="font-label-caps text-label-caps text-system-red flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-sm">military_tech</span>
                ESPECIALIZACIONES
              </h3>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-surface-container border border-terminal-gray text-[10px] font-label-caps text-on-surface-variant hover:text-white hover:border-system-red transition-all cursor-default"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Content Grid: Investigations vs Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter border-t border-terminal-gray pt-8 mt-12">
        
        {/* Recent Investigations */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-terminal-gray pb-2 mb-6">
            <h2 className="font-headline-md text-headline-md text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-system-red">find_in_page</span>
              INVESTIGACIONES RECIENTES
            </h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono text-[11px]">
              FLUJO_DATOS: {authorArticles.length} REGISTROS
            </span>
          </div>

          <div className="space-y-6">
            {authorArticles.length > 0 ? (
              authorArticles.map((art) => (
                <article 
                  key={art.id} 
                  onClick={() => navigate(`/articulo/${art.id}`)}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md group cursor-pointer border-b border-terminal-gray/40 pb-6 items-start"
                >
                  <div className="aspect-video relative overflow-hidden bg-surface-container border border-terminal-gray">
                    <img 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 opacity-70 group-hover:opacity-100" 
                      alt={art.title}
                      src={art.image}
                    />
                    {art.tag && (
                      <div className="absolute top-2 left-2 bg-system-red px-2 py-0.5 font-label-sm text-[10px] text-black font-bold">
                        {art.tag}
                      </div>
                    )}
                  </div>
                  
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-label-caps text-system-red font-bold">
                      <span>CATEGORÍA: {art.category}</span>
                      <span className="text-on-surface-variant font-mono">{art.views} ACCESOS</span>
                    </div>
                    
                    <h3 className="font-headline-md text-[18px] text-white group-hover:text-system-red transition-colors uppercase leading-snug">
                      {art.title}
                    </h3>
                    
                    <p className="text-body-md text-on-surface-variant text-sm line-clamp-2">
                      {art.subtitle}
                    </p>
                    
                    <div className="text-[10px] font-label-caps text-on-surface-variant pt-1">
                      REGISTRO: {art.date}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="border border-dashed border-terminal-gray p-8 text-center text-on-surface-variant font-label-caps text-[12px]">
                Ninguna investigación registrada en la base de datos central.
              </div>
            )}
          </div>
        </section>

        {/* Editorial Columns */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-terminal-gray pb-2 mb-6">
            <h3 className="font-label-caps text-xs text-white uppercase font-bold">
              COLUMNAS DE OPINIÓN
            </h3>
            <span className="material-symbols-outlined text-system-red text-[16px]">rate_review</span>
          </div>

          <div className="space-y-4">
            {authorOpinions.length > 0 ? (
              authorOpinions.map((op) => (
                <div 
                  key={op.id}
                  onClick={() => navigate(`/opinion/${op.id}`)}
                  className="bg-surface-container p-4 border border-terminal-gray hover:border-system-red transition-all cursor-pointer group"
                >
                  <span className="font-label-caps text-[9px] text-system-red block mb-1 font-bold">FECHA_REGISTRO: {op.date}</span>
                  <h4 className="font-headline-md text-[16px] text-white group-hover:text-system-red transition-colors italic leading-snug mb-2">
                    "{op.quote}"
                  </h4>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    {op.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-terminal-gray p-8 text-center text-on-surface-variant font-label-caps text-[11px]">
                Ningún registro editorial encontrado para este agente.
              </div>
            )}
          </div>
        </aside>

      </div>

    </div>
  );
}
