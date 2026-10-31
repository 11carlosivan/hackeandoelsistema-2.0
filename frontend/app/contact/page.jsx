import PublicLayout from '@/components/main-design/public-layout';
import { buildMetadata } from '@/lib/main-design/seo';
import ContactSecureView from '../contacto-seguro/contact-view';

export const metadata = buildMetadata({
  title: 'Contacto y Transparencia Editorial | Hackeando el Sistema',
  description: 'Canal oficial de contacto, información institucional, redacción periodística y atención ciudadana de Hackeando el Sistema.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <ContactSecureView />
      </div>
    </PublicLayout>
  );
}
