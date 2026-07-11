import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsPostDetail from '@/components/main-design/cms-post-detail';
import { getCmsPost } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Detalle de publicacion CMS',
  description: 'Detalle editorial protegido de Hackeando el Sistema.',
  path: '/cms/publicaciones',
  noIndex: true,
});

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const result = await getCmsPost(accessToken, id);

  return (
    <Layout>
      <CmsPostDetail post={result.post} error={result.error} />
    </Layout>
  );
}
