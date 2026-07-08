import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Crear publicacion',
  description: 'Editor de publicaciones de Hackeando el Sistema.',
  path: '/crear-publicacion',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="submit" />
    </Layout>
  );
}
