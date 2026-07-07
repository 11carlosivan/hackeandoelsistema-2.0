import Link from 'next/link';

export function Pagination({ pagination }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center justify-between border-t border-terminal-gray pt-5 text-sm font-bold" aria-label="Paginacion">
      {pagination.previousPageUrl ? (
        <Link href={pagination.previousPageUrl} className="text-system-red">
          Anterior
        </Link>
      ) : (
        <span className="text-on-surface-variant">Anterior</span>
      )}
      <span className="text-on-surface-variant">
        Pagina {pagination.page} de {pagination.totalPages}
      </span>
      {pagination.nextPageUrl ? (
        <Link href={pagination.nextPageUrl} className="text-system-red">
          Siguiente
        </Link>
      ) : (
        <span className="text-on-surface-variant">Siguiente</span>
      )}
    </nav>
  );
}
