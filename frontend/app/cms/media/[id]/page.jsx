import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsMediaDetail from '@/components/main-design/cms-media-detail';
import { getCmsMediaAsset } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Detalle media CMS',
  description: 'Detalle protegido de media de Hackeando el Sistema.',
  path: '/cms/media',
  noIndex: true,
});

export default async function Page({ params }) {
  const routeParams = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const result = await getCmsMediaAsset(accessToken, routeParams.id);

  return (
    <Layout>
      <CmsMediaDetail media={result.media} error={result.error} />
    </Layout>
  );
}
