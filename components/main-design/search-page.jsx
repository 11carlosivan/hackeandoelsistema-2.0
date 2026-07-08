'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { articles } from '@/lib/main-design/mock-data';
import { ArticleListItem, EmptyState, SystemPageHeader } from './content-primitives';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(activeQuery);

  const results = useMemo(() => {
    const normalizedQuery = activeQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return articles.filter((article) => {
      return [
        article.title,
        article.subtitle,
        article.category,
        article.tag,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [activeQuery]);

  const handleSubmit = (event) => {
    event.preventDefault();
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="BUSQUEDA"
        title="Inteligencia"
        description="Consulta de publicaciones, categorias y tags del archivo editorial."
        stats={[
          { label: 'RESULTADOS', value: `${results.length}`, icon: 'search' },
          { label: 'ESTADO', value: activeQuery ? 'Activo' : 'Espera', icon: 'radar' },
        ]}
      />

      <form onSubmit={handleSubmit} className="border border-terminal-gray bg-surface-container-low/30 p-5 mb-8">
        <label className="font-label-caps text-[10px] text-system-red font-bold block mb-3">
          FILTRO DE CONSULTA
        </label>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="flex-1 bg-black/40 border border-terminal-gray focus:border-system-red outline-none px-4 py-3 text-white"
            placeholder="Buscar por titular, categoria o tag..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-6 py-3 hover:bg-white transition-colors">
            Ejecutar
          </button>
        </div>
      </form>

      <section className="space-y-5">
        {results.length > 0 ? (
          results.map((article) => <ArticleListItem key={article.id} article={article} />)
        ) : activeQuery ? (
          <EmptyState
            title="CONSULTA SIN RESULTADOS"
            description="No se encontraron informes coincidentes en el servidor central."
          />
        ) : (
          <EmptyState
            title="EN ESPERA"
            description="Introduce una busqueda para consultar el archivo."
          />
        )}
      </section>
    </div>
  );
}
