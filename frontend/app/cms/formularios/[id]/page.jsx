import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsFormDetailView from '@/components/main-design/cms-form-detail-view';
import { getCmsFormDetail } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Respuestas de Formulario CMS',
  description: 'Detalle y exportación de registros de formulario en Hackeando el Sistema.',
  path: '/cms/formularios',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const result = await getCmsFormDetail(accessToken, id);

  return (
    <Layout>
      <CmsFormDetailView form={result.form} error={result.error} />
    </Layout>
  );
}
