import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import StaticContentPage from '@/components/main-design/static-content-page';
import TerminalPage from '@/components/main-design/terminal-page';
import { getPageBySlug, isApiNotFound } from '@/lib/main-design/api';
import { getStaticPageBySlug, publicStaticPages } from '@/lib/main-design/content';
import { shouldRedirectToCanonical } from '@/lib/main-design/public-shortcuts';
import { buildMetadata, staticPageMetadata } from '@/lib/main-design/seo';

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    return staticPageMetadata(await getPageBySlug(slug));
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }

    const staticPage = process.env.NODE_ENV === 'production' ? null : getStaticPageBySlug(slug);

    return staticPage
      ? buildMetadata({
          title: staticPage.title,
          description: staticPage.description,
          path: `/pagina/${staticPage.slug}`,
          noIndex: true,
        })
      : buildMetadata({ title: 'Pagina no encontrada', path: `/pagina/${slug}`, noIndex: true });
  }
}

export function generateStaticParams() {
  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  return publicStaticPages.map((page) => ({ slug: page.slug }));
}

export default async function Page({ params }) {
  const { slug } = await params;
  const sourcePath = `/pagina/${slug}/`;
  const staticPage = process.env.NODE_ENV === 'production' ? null : getStaticPageBySlug(slug);
  let apiPage = null;

  try {
    apiPage = await getPageBySlug(slug);
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }

    apiPage = null;
  }

  if (!staticPage && !apiPage) {
    notFound();
  }

  if (apiPage?.canonicalPath && shouldRedirectToCanonical(sourcePath, apiPage.canonicalPath)) {
    permanentRedirect(apiPage.canonicalPath);
  }

  return (
    <PublicLayout>
      {apiPage ? <StaticContentPage page={apiPage} /> : <TerminalPage slug={slug} />}
    </PublicLayout>
  );
}
