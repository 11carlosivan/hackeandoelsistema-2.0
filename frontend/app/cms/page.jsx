import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsDashboard from '@/components/main-design/cms-dashboard';
import { getCmsSummary } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'CMS',
  description: 'Panel editorial de Hackeando el Sistema.',
  path: '/cms',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const summary = await getCmsSummary(accessToken);

  return (
    <Layout>
      <CmsDashboard summary={summary} accessToken={accessToken} />
    </Layout>
  );
}
