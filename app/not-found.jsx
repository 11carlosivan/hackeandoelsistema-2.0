import Link from 'next/link';
import Layout from '@/components/main-design/layout';
import { EmptyState } from '@/components/main-design/content-primitives';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: '404',
  description: 'Ruta no encontrada en Hackeando el Sistema.',
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-16">
        <EmptyState
          title="404 / NODO NO ENCONTRADO"
          description="La ruta solicitada no existe en el archivo actual."
        />
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </Layout>
  );
}
