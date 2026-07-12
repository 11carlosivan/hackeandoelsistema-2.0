import PublicLayout from '@/components/main-design/public-layout';
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
    <PublicLayout>
      <TerminalPage variant="submit" />
    </PublicLayout>
  );
}
