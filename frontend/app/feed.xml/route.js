import { getHomeFeed } from '@/lib/main-design/api';
import { buildRssFeed } from '@/lib/main-design/rss';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export function shouldUseEmptyFeedFallback() {
  return process.env.NODE_ENV !== 'production';
}

export async function GET() {
  let feed = { articles: [] };

  try {
    feed = await getHomeFeed();
  } catch (error) {
    if (!shouldUseEmptyFeedFallback()) {
      throw error;
    }
  }

  const body = buildRssFeed({
    articles: feed.articles || [],
    updatedAt: feed.articles?.[0]?.publishedAt || new Date(),
  });

  return new Response(body, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=1800',
    },
  });
}
