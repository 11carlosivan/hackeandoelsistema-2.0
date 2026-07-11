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
  const summary = await getCmsSummary();

  return (
    <Layout>
      <CmsDashboard summary={summary} />
    </Layout>
  );
}
