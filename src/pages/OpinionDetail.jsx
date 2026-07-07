import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { opinions, authors, articles } from '../data/mockData';

export default function OpinionDetail() {
  const { id } = useParams();

  // Find opinion
  const opinion = opinions.find(op => op.id === id) || opinions[0];
  const author = authors.find(auth => auth.id === opinion.authorId) || authors[0];

  // Newsletter state
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  // Other opinions (excluding current)
  const otherOpinions = opinions
    .filter(op => op.id !== opinion.id)
    .slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto w-full py-4 px-2 md:px-0">
      
      {/* Article Header */}
      <header className="mb-12">
        <div className="inline-block bg-system-red text-background px-3 py-1 font-label-caps text-[11px] mb-6 font-bold">
          OPINIÓN
        </div>
        
        <h1 className="font-headline-xl text-[36px] md:text-headline-xl text-white uppercase leading-tight mb-8">
          {opinion.title.toUpperCase()}
        </h1>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between border-y border-terminal-gray py-6 gap-6">
          {/* Author Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-surface-container-high border-2 border-system-red rounded-full overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-500">
              <img 
                alt={author.name} 
                className="w-full h-full object-cover" 
                src={author.photo}
              />
              <div className="absolute inset-0 bg-system-red/10"></div>
            </div>
            <div>
              <Link to={`/perfil/${author.id}`} className="font-headline-md text-xl text-white hover:text-system-red transition-colors uppercase">
                {author.name}
              </Link>
              <div className="font-label-caps text-xs text-system-red uppercase tracking-widest">
                {author.role}
              </div>
            </div>
          </div>
          
          {/* Metadata & Sharing */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-4 font-label-sm text-on-surface-variant text-xs">
              <span>{opinion.date}</span>
              <span className="w-1 h-1 bg-terminal-gray rounded-full"></span>
              <span>LECTURA: 6 MIN</span>
            </div>
            <div className="flex gap-4">
              <button className="text-on-surface-variant hover:text-system-red transition-colors" title="Compartir">
                <span className="material-symbols-outlined text-[16px]">share</span>
              </button>
              <span className="text-on-surface-variant hover:text-white text-xs font-label-caps cursor-pointer">FACEBOOK</span>
              <span className="text-on-surface-variant hover:text-white text-xs font-label-caps cursor-pointer">X</span>
              <span className="text-on-surface-variant hover:text-white text-xs font-label-caps cursor-pointer">WHATSAPP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative w-full aspect-video mb-12 border border-terminal-gray overflow-hidden group">
        <img 
          alt="Surveillance Concept" 
          className="w-full h-full object-cover grayscale brightness-50 sepia-[.5] hue-rotate-[320deg] contrast-125 transition-transform duration-700 group-hover:scale-103" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkhd6nNIdaNqTuVFRCtNUeUfW5lnCJBKoGcFVy6YZOEXerpYRamVltryN2NPVNy0GF80Nhj8SSUfRgb6Gk3Tpi6dfWNCmyohxPtftTO7nOHHPT3g8zq-y1yUvBRC7LP87HbLB5LdlElWo8QGOM6eytmuDCNy1ewBL8bHf9MFxGK_Xo04uJE_zjGhhCRhcNl8jjDMpDNjW5jcSTxNiQli4hfHUp8xpsnbh57lZU5RV_cp2EY3ssyhRU1Q"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60"></div>
        <div className="absolute bottom-4 left-4 border-l-2 border-system-red pl-4">
          <span className="font-label-caps text-[10px] text-on-surface-variant">REF_IMG: NODO_DE_VIGILANCIA_ALPHA</span>
        </div>
      </div>

      {/* Opinion Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        
        {/* Left Column (Body) */}
        <div className="col-span-12 md:col-span-8 lg:col-start-2 lg:col-span-7 space-y-8">
          <div className="prose prose-invert max-w-none">
            {/* Split paragraph and render dropcap */}
            <p className="text-body-lg text-on-surface-variant leading-relaxed mb-8 first-letter:text-6xl first-letter:font-headline-xl first-letter:text-system-red first-letter:mr-3 first-letter:float-left">
              {opinion.content.substring(0, opinion.content.indexOf('.') + 1)}
            </p>
            
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-8">
              {opinion.content.substring(opinion.content.indexOf('.') + 1)}
            </p>

            {/* Custom Pull Quote with Corner Pixels */}
            <div className="my-12 p-8 border-y-2 border-system-red/20 bg-surface-container-lowest relative">
              {/* Corner accent pixels */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-system-red"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-system-red"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-system-red"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-system-red"></div>
              
              <blockquote className="border-none p-0 m-0 italic text-2xl font-headline-md text-system-red text-center">
                "{opinion.quote}"
              </blockquote>
              <cite className="block text-center mt-4 font-label-caps text-xs text-on-surface-variant uppercase">
                — {author.name.toUpperCase()} / REGISTRO_COLUMNISTA
              </cite>
            </div>

            <p className="text-body-md text-on-surface-variant leading-relaxed mb-8">
              El peligro real no reside en la cámara de la esquina, sino en la cámara que llevamos voluntariamente en el bolsillo. La infraestructura de red actual ha sido diseñada para la captura de inteligencia masiva. Cada nodo es un punto de extracción. Las brechas de seguridad que reportamos diariamente en esta terminal no son fallos del sistema; son características inherentes de una red que prioriza la visibilidad sobre la seguridad.
            </p>
            
            <h2 className="font-headline-md text-2xl text-on-surface mb-6 uppercase tracking-tight border-b border-terminal-gray pb-2">
              Hacia el encriptado total
            </h2>
            
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-8">
              La única respuesta lógica es la insurgencia criptográfica. Encriptar no es un acto de ocultación delictiva, sino un acto de preservación de la autonomía humana. Mientras las agencias estatales y los conglomerados de IA sigan refinando sus herramientas de minería humana, nuestra única defensa es el ruido, el cifrado y la desobediencia algorítmica.
            </p>
          </div>

          {/* Related Opinions */}
          {otherOpinions.length > 0 && (
            <section className="mt-16 pt-12 border-t border-terminal-gray">
              <h3 className="font-headline-md text-xl text-system-red mb-8 uppercase tracking-widest">
                OTRAS COLUMNAS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {otherOpinions.map((op) => {
                  const auth = authors.find(a => a.id === op.authorId) || {};
                  return (
                    <Link 
                      key={op.id} 
                      to={`/opinion/${op.id}`}
                      className="group bg-surface-container-low border border-terminal-gray p-6 hover:border-system-red transition-all block"
                    >
                      <span className="font-label-caps text-[10px] text-system-red mb-2 block font-bold">OPINIÓN / {auth.name.toUpperCase()}</span>
                      <h4 className="font-headline-md text-lg text-white group-hover:text-system-red transition-colors leading-tight mb-2 uppercase">
                        "{op.quote}"
                      </h4>
                      <span className="font-label-sm text-xs text-on-surface-variant">{op.date}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <aside className="col-span-12 md:col-span-4 lg:col-start-10 lg:col-span-3 space-y-8 w-full">
          
          {/* Intelligence Resources */}
          <div className="bg-surface-container p-6 border border-terminal-gray">
            <h3 className="font-label-caps text-xs text-system-red mb-4 border-b border-terminal-gray pb-2 uppercase font-bold">
              RECURSOS DE INTELIGENCIA
            </h3>
            <ul className="space-y-4">
              <li>
                <a className="flex items-center gap-3 text-on-surface-variant hover:text-white transition-colors group" href="#/download/manifiesto">
                  <span className="material-symbols-outlined text-sm text-system-red group-hover:animate-pulse">download</span>
                  <span className="font-label-sm text-xs uppercase">MANIFIESTO_CRIPTO.PDF</span>
                </a>
              </li>
              <li>
                <a className="flex items-center gap-3 text-on-surface-variant hover:text-white transition-colors group" href="#/download/protocolos">
                  <span className="material-symbols-outlined text-sm text-system-red group-hover:animate-pulse">link</span>
                  <span className="font-label-sm text-xs uppercase">PROTOCOLOS_DE_ACCESO</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Secure Network Signup */}
          <div className="bg-system-red/5 p-6 border border-system-red/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 text-system-red/10 group-hover:text-system-red/20 transition-colors pointer-events-none">
              <span className="material-symbols-outlined text-[100px]">priority_high</span>
            </div>
            
            <h3 className="font-headline-md text-system-red text-lg mb-2">ÚNETE A LA RED</h3>
            <p className="font-body-md text-xs text-on-surface-variant mb-4 leading-relaxed">
              Recibe informes de inteligencia filtrados y alertas críticas directamente en tu terminal.
            </p>
            
            {subscribed ? (
              <div className="p-3 bg-system-red/20 border border-system-red text-[11px] font-label-caps text-white text-center">
                [CONEXIÓN SEGURA CONFIGURADA]
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <input 
                  className="bg-surface-container-lowest border border-terminal-gray text-xs font-label-sm p-3 focus:border-system-red focus:outline-none text-white placeholder:opacity-30" 
                  placeholder="CORREO_ENCRIPTADO..." 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button 
                  type="submit"
                  className="bg-system-red text-black font-label-caps text-xs py-3 hover:brightness-110 transition-all uppercase font-bold active:scale-95"
                >
                  SUSCRIBIRSE
                </button>
              </form>
            )}
          </div>

        </aside>

      </div>
    </div>
  );
}
