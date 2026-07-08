import { MainDesignApp } from '@/components/main-design/main-design-app';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  path: '/',
});

export default function HomePage() {
  return <MainDesignApp />;
}
