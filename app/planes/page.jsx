import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Planes',
  description: 'Planes y membresias de Hackeando el Sistema Network.',
  path: '/planes',
});

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="plans" />
    </Layout>
  );
}
