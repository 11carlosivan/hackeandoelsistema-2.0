import { HomeTemplate } from '@/components/design-system/templates/home-template';
import { buildHomePayload } from '@/lib/contracts/payload-builders';
import { resolveRoute } from '@/lib/routing/route-resolver';
import { metadataFromResolvedRoute } from '@/lib/seo/metadata';

export function generateMetadata() {
  return metadataFromResolvedRoute(resolveRoute('/'));
}

export default function HomePage() {
  const resolvedRoute = resolveRoute('/');
  const payload = buildHomePayload(resolvedRoute);

  return <HomeTemplate payload={payload} />;
}
