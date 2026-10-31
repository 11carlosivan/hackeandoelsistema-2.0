import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-stack-lg border-t border-terminal-gray bg-surface-container-lowest mt-section-gap">
      <div className="w-full px-margin-page flex flex-col md:flex-row justify-between items-start md:items-center max-w-full mx-auto gap-8">
        <div className="flex flex-col items-center md:items-start max-w-md">
          <Link href="/">
            <img
              alt="Hackeando el Sistema"
              className="h-8 mb-3 opacity-70 grayscale hover:grayscale-0 transition-all cursor-pointer"
              src="/logo.png"
            />
          </Link>
          <p className="font-label-sm text-label-sm text-white font-bold">
            HACKEANDO EL SISTEMA DIGITAL MEDIA
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            Dirección General: Melvin Sena &bull; Santo Domingo, República Dominicana
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
            Contacto: <a href="mailto:contacto@hackeandoelsistema.net" className="text-white hover:text-system-red">contacto@hackeandoelsistema.net</a> &bull; Tel: <a href="tel:+18094317570" className="text-white hover:text-system-red">+1 (809) 431-7570</a>
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 text-xs opacity-70">
            (c) 2026 HACKEANDO EL SISTEMA | PERIODISMO DIGITAL INDEPENDIENTE
          </p>
        </div>

        <nav aria-label="Enlaces legales y contacto" className="flex flex-wrap justify-center gap-6">
          <Link className="text-system-red font-label-caps text-label-caps font-bold hover:underline" href="/contacto">
            Contacto & Editorial
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/politica-de-privacidad">
            Privacidad
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/terminos-de-uso">
            Términos
          </Link>
          <Link className="text-on-surface-variant font-label-caps text-label-caps hover:text-white transition-opacity opacity-70 hover:opacity-100" href="/contacto-seguro">
            Contacto Seguro
          </Link>
        </nav>

        <div className="flex gap-4">
          <Link
            aria-label="Mapa de red"
            className="w-8 h-8 flex items-center justify-center border border-terminal-gray text-on-surface-variant hover:text-system-red transition-all"
            href="/archivo"
            title="Mapa de Red"
          >
            <span className="material-symbols-outlined text-[20px]">public</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
