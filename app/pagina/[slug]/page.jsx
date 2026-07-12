import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import StaticContentPage from '@/components/main-design/static-content-page';
import TerminalPage from '@/components/main-design/terminal-page';
import { getPageBySlug } from '@/lib/main-design/api';
import { getStaticPageBySlug, publicStaticPages } from '@/lib/main-design/content';
import { staticPageMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    return staticPageMetadata(await getPageBySlug(slug));
  } catch {
    return staticPageMetadata(getStaticPageBySlug(slug));
  }
}

export function generateStaticParams() {
  return publicStaticPages.map((page) => ({ slug: page.slug }));
}

export default async function Page({ params }) {
  const { slug } = await params;
  const staticPage = getStaticPageBySlug(slug);
  let apiPage = null;

  try {
    apiPage = await getPageBySlug(slug);
  } catch {
    apiPage = null;
  }

  if (!staticPage && !apiPage) {
    notFound();
  }

  return (
    <Layout>
      {apiPage ? <StaticContentPage page={apiPage} /> : <TerminalPage slug={slug} />}
    </Layout>
  );
}
