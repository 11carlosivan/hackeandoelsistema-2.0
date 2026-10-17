import PublicLayout from '@/components/main-design/public-layout';
import JobsListView from '@/components/main-design/jobs-list-view';
import { getPublicJobs } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = buildMetadata({
  title: 'Bolsa de Empleos | Hackeando el Sistema',
  description: 'Encuentra las mejores oportunidades de empleo en periodismo digital, tecnología, medios de comunicación y más.',
  path: '/empleos',
});

export default async function EmpleosPage() {
  const result = await getPublicJobs();

  return (
    <PublicLayout>
      <JobsListView initialJobs={result?.jobs || []} totalJobs={result?.total || 0} />
    </PublicLayout>
  );
}
