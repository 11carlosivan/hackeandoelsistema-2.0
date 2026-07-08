import { CategoryBadge } from '@/components/design-system/atoms/category-badge';
import { CompactStoryCard } from '@/components/design-system/molecules/compact-story-card';
import { PostMeta } from '@/components/design-system/atoms/post-meta';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';

export function HomeHeroGrid({ heroPost, secondaryPosts }) {
  if (!heroPost) {
    return null;
  }

  return (
    <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)]">
      <article className="group relative min-w-0 overflow-hidden rounded-md border border-terminal-gray bg-black shadow-[0_22px_45px_rgba(0,0,0,0.28)] lg:min-h-[390px]">
        {heroPost.featuredImage?.url ? (
          <img
            src={heroPost.featuredImage.url}
            alt={heroPost.featuredImage.altText ?? ''}
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0">
            <StoryMediaPlaceholder label={heroPost.primaryCategory?.name ?? 'HES'} showLabel={false} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/62 to-black/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(230,57,70,0.12),transparent_34%)]" />
        <div className="relative z-10 flex min-h-[390px] flex-col justify-end p-5 md:p-7">
          <div className="mb-4">
            <CategoryBadge category={heroPost.primaryCategory} />
          </div>
          <h1 className="max-w-full text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl xl:max-w-3xl xl:text-[44px]">
            {heroPost.title}
          </h1>
          {heroPost.excerpt ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{heroPost.excerpt}</p> : null}
          <div className="mt-5">
            <PostMeta post={heroPost} />
          </div>
          <div className="mt-5 flex gap-2">
            <span className="h-1 w-12 rounded-full bg-system-red" />
            <span className="h-1 w-12 rounded-full bg-white/40" />
            <span className="h-1 w-12 rounded-full bg-white/40" />
          </div>
        </div>
      </article>

      <div className="grid min-w-0 gap-4">
        {secondaryPosts.slice(0, 3).map((post) => (
          <CompactStoryCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
