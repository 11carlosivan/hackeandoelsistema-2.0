import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';
import ContactSecureView from './contact-view';

export const metadata = buildMetadata({
  title: 'Contacto Institucional y Transparencia | Hackeando el Sistema',
  description: 'Canal oficial de contacto, información institucional y atención ciudadana de Hackeando el Sistema.',
  path: '/contacto-seguro',
});

export default function ContactSecurePage() {
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <ContactSecureView />
      </div>
    </PublicLayout>
  );
}
