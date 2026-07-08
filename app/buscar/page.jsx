import { Suspense } from 'react';
import Layout from '@/components/main-design/layout';
import SearchPage from '@/components/main-design/search-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Busqueda',
  description: 'Busqueda interna de Hackeando el Sistema.',
  path: '/buscar',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <Suspense fallback={<div className="text-on-surface-variant">Cargando busqueda...</div>}>
        <SearchPage />
      </Suspense>
    </Layout>
  );
}
