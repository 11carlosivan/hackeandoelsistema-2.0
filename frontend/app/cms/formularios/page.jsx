import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsFormsList from '@/components/main-design/cms-forms-list';
import { getCmsForms } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Formularios CMS',
  description: 'Gestión de formularios, convocatorias y registros de Hackeando el Sistema.',
  path: '/cms/formularios',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const result = await getCmsForms(accessToken);

  return (
    <Layout>
      <CmsFormsList forms={result.forms} error={result.error} />
    </Layout>
  );
}
