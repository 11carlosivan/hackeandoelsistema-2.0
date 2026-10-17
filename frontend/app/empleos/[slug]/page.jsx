import { notFound } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import JobDetailView from '@/components/main-design/job-detail-view';
import { getJobBySlug } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    return buildMetadata({
      title: 'Vacante no encontrada',
      path: `/empleos/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${job.title} en ${job.companyName} | Bolsa de Empleos HES`,
    description: job.description?.slice(0, 160) || 'Vacante laboral disponible en Hackeando el Sistema.',
    path: `/empleos/${slug}`,
  });
}

export default async function JobDetailPage({ params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    notFound();
  }

  return (
    <PublicLayout>
      <JobDetailView job={job} />
    </PublicLayout>
  );
}
