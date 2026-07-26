import PublicLayout from '@/components/main-design/public-layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  generatePublicRouteMetadata,
  renderPublicRoutePage,
} from '@/lib/main-design/public-route-rendering';

export const revalidate = 300;

const routeParts = ['planes'];
const fallbackMetadata = buildMetadata({
  title: 'Planes',
  description: 'Planes y membresias de Hackeando el Sistema Network.',
  path: '/planes',
});

export async function generateMetadata() {
  return generatePublicRouteMetadata(routeParts, fallbackMetadata);
}

export default async function Page({ searchParams }) {
  return renderPublicRoutePage(
    routeParts,
    searchParams,
    <PublicLayout>
      <TerminalPage variant="plans" />
    </PublicLayout>,
  );
}
