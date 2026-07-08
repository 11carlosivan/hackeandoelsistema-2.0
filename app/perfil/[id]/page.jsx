import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import ProfilePage from '@/components/main-design/profile-page';
import { authors } from '@/lib/main-design/mock-data';
import { getAuthorById } from '@/lib/main-design/content';
import { authorMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return authorMetadata(getAuthorById(id));
}

export function generateStaticParams() {
  return authors.map((author) => ({ id: author.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const author = getAuthorById(id);

  if (!author) {
    notFound();
  }

  return (
    <Layout>
      <ProfilePage authorId={id} />
    </Layout>
  );
}
