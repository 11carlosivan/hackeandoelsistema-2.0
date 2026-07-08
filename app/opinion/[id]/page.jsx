import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import OpinionPage from '@/components/main-design/opinion-page';
import { opinions } from '@/lib/main-design/mock-data';
import { getOpinionById } from '@/lib/main-design/content';
import { opinionMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return opinionMetadata(getOpinionById(id));
}

export function generateStaticParams() {
  return opinions.map((opinion) => ({ id: opinion.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const opinion = getOpinionById(id);

  if (!opinion) {
    notFound();
  }

  return (
    <Layout>
      <OpinionPage opinionId={id} />
    </Layout>
  );
}
