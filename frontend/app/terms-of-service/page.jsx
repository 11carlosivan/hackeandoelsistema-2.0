import LegalPage from '@/components/main-design/legal-page';
import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Terminos de Uso',
  description: 'Terminos de uso de Hackeando el Sistema.',
  path: '/terms-of-service',
});

export default function Page() {
  return (
    <PublicLayout>
      <LegalPage kind="terms" />
    </PublicLayout>
  );
}
