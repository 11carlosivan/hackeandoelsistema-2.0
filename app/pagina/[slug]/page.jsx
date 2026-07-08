import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <Layout>
      <TerminalPage slug={slug} />
    </Layout>
  );
}
