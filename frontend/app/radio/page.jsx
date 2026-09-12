import PublicLayout from '@/components/main-design/public-layout';
import RadioPage from '@/components/main-design/radio-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'HES Radio en vivo',
  description: 'Transmision en vivo de Hackeando el Sistema.',
  path: '/radio',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <PublicLayout>
      <RadioPage />
    </PublicLayout>
  );
}
