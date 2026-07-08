import { Suspense } from 'react';
import Layout from '@/components/main-design/layout';
import SearchPage from '@/components/main-design/search-page';

export default function Page() {
  return (
    <Layout>
      <Suspense fallback={<div className="text-on-surface-variant">Cargando busqueda...</div>}>
        <SearchPage />
      </Suspense>
    </Layout>
  );
}
