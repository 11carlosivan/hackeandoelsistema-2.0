import PublicLayout from '@/components/main-design/public-layout';
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
    <PublicLayout>
      <TerminalPage variant="register" />
    </PublicLayout>
  );
}
