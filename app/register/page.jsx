import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Registro',
  description: 'Registro de miembros de Hackeando el Sistema Network.',
  path: '/register',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="register" />
    </Layout>
  );
}
