import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-stack-lg border-t border-terminal-gray bg-surface-container-lowest mt-section-gap">
      <div className="w-full px-margin-page flex flex-col md:flex-row justify-between items-center max-w-full mx-auto gap-8">
        
        <div className="flex flex-col items-center md:items-start">
          <Link href="/">
            <img 
              alt="Hackeando el Sistema" 
              className="h-8 mb-4 opacity-70 grayscale hover:grayscale-0 transition-all cursor-pointer" 
              src="/logo.png"
            />
          </Link>
          <p className="font-label-sm text-label-sm text-on-surface-variant text-center md:text-left">
            © 2026 HACKEANDO EL SISTEMA | UNIDAD DE INTELIGENCIA DIGITAL | PROTOCOLO ACTIVO
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/pagina/terms-of-service">
            Términos de Servicio
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/pagina/privacy-policy">
            Privacidad
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/contacto-seguro">
            Contacto Seguro
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/pagina/advertising">
            Publicidad
          </Link>
          <Link className="text-system-red font-label-caps text-label-caps underline transition-opacity opacity-70 hover:opacity-100" href="/contacto-seguro">
            Protocolos de Seguridad
          </Link>
        </div>
        
        <div className="flex gap-4">
          <div className="w-8 h-8 flex items-center justify-center border border-terminal-gray text-on-surface-variant hover:text-system-red transition-all cursor-pointer" title="Feed RSS">
            <span className="material-symbols-outlined text-[20px]">rss_feed</span>
          </div>
          <div className="w-8 h-8 flex items-center justify-center border border-terminal-gray text-on-surface-variant hover:text-system-red transition-all cursor-pointer" title="Mapa de Red">
            <span className="material-symbols-outlined text-[20px]">public</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
