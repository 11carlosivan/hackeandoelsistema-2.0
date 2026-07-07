import { notFound, permanentRedirect } from 'next/navigation';
import { ResolvedRouteView } from '@/components/resolved-route-view';
import { resolveRoute } from '@/lib/routing/route-resolver';
import { metadataFromResolvedRoute } from '@/lib/seo/metadata';

function resolveSingleSlug(params) {
  return resolveRoute(`/${params.slug}/`);
}

export async function generateMetadata({ params }) {
  return metadataFromResolvedRoute(resolveSingleSlug(await params));
}

export default async function RootEntityPage({ params }) {
  const resolvedRoute = resolveSingleSlug(await params);

  if (resolvedRoute.status === 'REDIRECTED') {
    permanentRedirect(resolvedRoute.targetUrl);
  }

  if (!resolvedRoute.found || resolvedRoute.status === 'GONE') {
    notFound();
  }

  return <ResolvedRouteView resolvedRoute={resolvedRoute} />;
}
