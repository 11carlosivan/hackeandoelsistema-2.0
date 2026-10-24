import PublicLayout from '@/components/main-design/public-layout';
import SportsView from '@/components/main-design/sports-view';
import { buildMetadata } from '@/lib/main-design/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = buildMetadata({
  title: 'Marcadores y Resultados Deportivos en Vivo | Hackeando el Sistema',
  description: 'Sigue en tiempo real los marcadores de la Pelota Invernal Dominicana (LIDOM), Grandes Ligas (MLB), NBA, Fútbol, NFL y Fórmula 1.',
  path: '/deportes',
});

export default function DeportesPage() {
  return (
    <PublicLayout>
      <SportsView />
    </PublicLayout>
  );
}
