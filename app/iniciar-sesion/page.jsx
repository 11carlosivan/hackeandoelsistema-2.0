import Layout from '@/components/main-design/layout';
import TerminalPage from '@/components/main-design/terminal-page';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return (
    <Layout>
      <TerminalPage variant="login" />
    </Layout>
  );
}
