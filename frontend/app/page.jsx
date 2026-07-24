import { MainDesignApp } from '@/components/main-design/main-design-app';
import { getHomeFeed } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  path: '/',
});
export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let feed;

  try {
    feed = await getHomeFeed();
  } catch {
    feed = {
      source: 'fallback',
      articles: [],
      categories: [],
      summary: null,
    };
  }

  return <MainDesignApp feed={feed} />;
}
