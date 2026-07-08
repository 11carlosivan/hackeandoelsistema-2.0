import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'CMS',
  description: 'Panel editorial de Hackeando el Sistema.',
  path: '/cms',
  noIndex: true,
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="cms" />
    </Layout>
  );
}
