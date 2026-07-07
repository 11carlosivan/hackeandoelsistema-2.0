import { notFound, permanentRedirect } from 'next/navigation';
import { ResolvedRouteView } from '@/components/resolved-route-view';
import { pathFromSegments, resolveRoute } from '@/lib/routing/route-resolver';
import { metadataFromResolvedRoute } from '@/lib/seo/metadata';

function resolveCategory(params) {
  return resolveRoute(pathFromSegments(['category', ...(params.slug ?? [])]));
}

export async function generateMetadata({ params }) {
  return metadataFromResolvedRoute(resolveCategory(await params));
}

export default async function CategoryPage({ params }) {
  const resolvedRoute = resolveCategory(await params);

  if (resolvedRoute.status === 'REDIRECTED') {
    permanentRedirect(resolvedRoute.targetUrl);
  }

  if (!resolvedRoute.found || resolvedRoute.status === 'GONE') {
    notFound();
  }

  return <ResolvedRouteView resolvedRoute={resolvedRoute} />;
}
