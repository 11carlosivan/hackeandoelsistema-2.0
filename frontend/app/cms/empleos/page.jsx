import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsJobsPanel from '@/components/main-design/cms-jobs-panel';
import { getCmsJobs } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Gestión de Vacantes y Empleos - CMS',
  description: 'Administración editorial de ofertas de empleo publicadas, completadas o caducadas.',
  path: '/cms/empleos',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;

  const result = await getCmsJobs(accessToken, { limit: 50 });

  return (
    <Layout>
      <CmsJobsPanel
        initialJobs={result.jobs || []}
        totalJobs={result.meta?.total || 0}
        accessToken={accessToken}
      />
    </Layout>
  );
}
