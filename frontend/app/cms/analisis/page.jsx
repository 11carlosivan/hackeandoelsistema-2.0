import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import CmsAnalyticsPanel from '@/components/main-design/cms-analytics-panel';
import { getCmsSummary } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Análisis Estadístico - CMS',
  description: 'Módulo de análisis y conteo diario/mensual de visitas.',
  path: '/cms/analisis',
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

  return (
    <Layout>
      <CmsAnalyticsPanel />
    </Layout>
  );
}
