import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsSponsoredPostsPanel from '@/components/main-design/cms-sponsored-posts';
import { getCmsSponsoredPosts } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Gestión de Publicidad - CMS',
  description: 'Administración de campañas publicitarias y banners para la app móvil y la web.',
  path: '/cms/publicidad',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;

  const initialAds = await getCmsSponsoredPosts(accessToken);

  return (
    <Layout>
      <CmsSponsoredPostsPanel initialAds={initialAds} accessToken={accessToken} />
    </Layout>
  );
}
