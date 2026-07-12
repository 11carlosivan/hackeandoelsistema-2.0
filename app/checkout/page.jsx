import PublicLayout from '@/components/main-design/public-layout';
import TerminalPage from '@/components/main-design/terminal-page';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Checkout',
  description: 'Flujo de pago de Hackeando el Sistema Network.',
  path: '/checkout',
  noIndex: true,
});

export default function Page() {
  return (
    <PublicLayout>
      <TerminalPage variant="checkout" />
    </PublicLayout>
  );
}
