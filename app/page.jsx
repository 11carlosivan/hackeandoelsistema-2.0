import { MainDesignApp } from '@/components/main-design/main-design-app';
import { getHomeFeed } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  path: '/',
});

export default async function HomePage() {
  const feed = await getHomeFeed();

  return <MainDesignApp feed={feed} />;
}
