import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsPageDetail from '@/components/main-design/cms-page-detail';
import { getCmsPage } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Detalle de pagina CMS',
  description: 'Detalle protegido de pagina estatica.',
  path: '/cms/paginas',
  noIndex: true,
});

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const result = await getCmsPage(accessToken, id);

  return (
    <Layout>
      <CmsPageDetail page={result.page} error={result.error} />
    </Layout>
  );
}
