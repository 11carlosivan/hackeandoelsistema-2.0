import Layout from '@/components/main-design/layout';
import CmsPostCreateForm from '@/components/main-design/cms-post-create-form';
import CmsSessionActions from '@/components/main-design/cms-session-actions';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Nueva publicacion CMS',
  description: 'Crear borrador protegido en Hackeando el Sistema.',
  path: '/cms/publicaciones/nueva',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / PUBLICACIONES"
          title="Nuevo borrador"
          description="Crea una publicacion en estado borrador. No entra al sitemap ni queda disponible publicamente."
          stats={[
            { label: 'ESTADO', value: 'DRAFT', icon: 'edit_note' },
            { label: 'ROBOTS', value: 'NOINDEX', icon: 'visibility_off' },
            { label: 'RUTA', value: 'No publica', icon: 'link_off' },
          ]}
        />

        <div className="flex justify-end mb-8">
          <CmsSessionActions />
        </div>

        <CmsPostCreateForm />
      </div>
    </Layout>
  );
}
