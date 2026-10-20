import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsCommunityModerationPanel from '@/components/main-design/cms-community-moderation';
import { getCmsCommunityPosts } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Moderación de Comunidad - CMS',
  description: 'Panel de moderación para publicaciones y comentarios de la comunidad en app y web.',
  path: '/cms/comunidad',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;

  const result = await getCmsCommunityPosts(accessToken, { limit: 50 });

  return (
    <Layout>
      <CmsCommunityModerationPanel
        initialPosts={result.posts || []}
        totalPosts={result.meta?.total || 0}
        accessToken={accessToken}
      />
    </Layout>
  );
}
