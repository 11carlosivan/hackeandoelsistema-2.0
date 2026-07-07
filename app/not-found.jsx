import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="hes-container py-20">
      <p className="hes-kicker">404</p>
      <h1 className="mt-4 text-4xl font-black text-white">Pagina no encontrada</h1>
      <p className="mt-4 max-w-xl text-on-surface-variant">
        Esta ruta todavia no existe en la nueva base. En fases siguientes sera
        resuelta desde el inventario de URLs, redirects y routes.
      </p>
      <Link href="/" className="mt-8 inline-flex border border-system-red px-4 py-3 text-sm font-bold text-system-red">
        Volver al inicio
      </Link>
    </div>
  );
}
