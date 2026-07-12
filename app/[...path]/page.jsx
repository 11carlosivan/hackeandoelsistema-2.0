import {
  generatePublicRouteMetadata,
  renderPublicRoutePage,
} from '@/lib/main-design/public-route-rendering';

export async function generateMetadata({ params }) {
  const { path } = await params;

  return generatePublicRouteMetadata(path);
}

export default async function LegacyRoutePage({ params, searchParams }) {
  const { path } = await params;

  return renderPublicRoutePage(path, searchParams);
}
