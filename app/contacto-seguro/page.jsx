import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Contacto Seguro',
  description: 'Canal seguro para fuentes, lectores y alianzas de Hackeando el Sistema.',
  path: '/contacto-seguro',
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="contact" />
    </Layout>
  );
}
