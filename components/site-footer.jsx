import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-terminal-gray bg-surface-container-lowest">
      <div className="hes-container flex flex-col gap-4 py-8 text-xs text-on-surface-variant md:flex-row md:items-center md:justify-between">
        <p>© 2026 Hackeando el Sistema. Al Codigo Fuente de la Verdad.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/contact/">Contacto</Link>
          <Link href="/privacy-policy/">Privacidad</Link>
          <Link href="/planes/">Planes</Link>
        </nav>
      </div>
    </footer>
  );
}
