import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Recuperar password',
  description: 'Recuperacion de acceso para usuarios de Hackeando el Sistema.',
  path: '/password-recover',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="recover" />
    </Layout>
  );
}
