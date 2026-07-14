import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import CmsAnalyticsDashboard from '@/components/main-design/cms-analytics-dashboard';
import { getCmsSummary } from '@/lib/main-design/api';
import { getAnalyticsData } from '@/lib/main-design/ga4-adapter';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Analiticas CMS',
  description: 'Panel protegido de analiticas editoriales.',
  path: '/cms/analiticas',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const summary = await getCmsSummary(accessToken);
  const roles = summary?.viewer?.roles || [];

  if (!roles.includes('ADMIN')) {
    redirect('/cms/');
  }

  const analytics = await getAnalyticsData();

  return (
    <Layout>
      <CmsAnalyticsDashboard analytics={analytics} />
    </Layout>
  );
}
