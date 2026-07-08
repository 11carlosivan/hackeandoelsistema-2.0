import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { getStaticPageBySlug, publicStaticPages } from '@/lib/main-design/content';
import { staticPageMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return staticPageMetadata(getStaticPageBySlug(slug));
}

export function generateStaticParams() {
  return publicStaticPages.map((page) => ({ slug: page.slug }));
}

export default async function Page({ params }) {
  const { slug } = await params;
  const staticPage = getStaticPageBySlug(slug);

  if (!staticPage) {
    notFound();
  }

  return (
    <Layout>
      <TerminalPage slug={slug} />
    </Layout>
  );
}
