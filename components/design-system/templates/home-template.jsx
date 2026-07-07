import { AdSlot } from '@/components/design-system/molecules/ad-slot';
import { BreakingNewsBar } from '@/components/design-system/organisms/breaking-news-bar';
import { HomeHeroGrid } from '@/components/design-system/organisms/home-hero-grid';
import { LatestNewsSection } from '@/components/design-system/organisms/latest-news-section';
import { NetworkCard } from '@/components/design-system/organisms/network-card';
import { OpinionStrip } from '@/components/design-system/organisms/opinion-strip';
import { TrendingPanel } from '@/components/design-system/organisms/trending-panel';
import { WeatherCard } from '@/components/design-system/organisms/weather-card';

export function HomeTemplate({ payload }) {
  const heroPost = payload.featuredPosts[0];
  const secondaryPosts = payload.breakingPosts.length > 0 ? payload.breakingPosts : payload.latestPosts.slice(1, 4);
  const opinionPosts = payload.latestPosts.filter((post) => post.primaryCategory?.slug === 'opinion');
  const fallbackOpinion = opinionPosts.length > 0 ? opinionPosts : payload.latestPosts;

  return (
    <div className="bg-background">
      <BreakingNewsBar items={payload.latestPosts.slice(0, 3)} />

      <div className="hes-container py-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <HomeHeroGrid heroPost={heroPost} secondaryPosts={secondaryPosts} />
            <LatestNewsSection posts={payload.latestPosts} />
            <OpinionStrip posts={fallbackOpinion} />
          </div>

          <aside className="space-y-5">
            <TrendingPanel posts={payload.trendingPosts} />
            <WeatherCard />
            <NetworkCard />
            {payload.adSlots[0] ? <AdSlot slot={payload.adSlots[0]} /> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
