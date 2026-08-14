import LegalPage from '@/components/main-design/legal-page';
import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Politica de Privacidad',
  description: 'Politica de privacidad de Hackeando el Sistema.',
  path: '/privacy-policy',
});

export default function Page() {
  return (
    <PublicLayout>
      <LegalPage kind="privacy" />
    </PublicLayout>
  );
}
