import { CategoryBadge } from '@/components/design-system/atoms/category-badge';
import { CompactStoryCard } from '@/components/design-system/molecules/compact-story-card';
import { PostMeta } from '@/components/design-system/atoms/post-meta';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';

export function HomeHeroGrid({ heroPost, secondaryPosts }) {
  if (!heroPost) {
    return null;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.4fr_0.75fr]">
      <article className="group relative min-h-[420px] overflow-hidden rounded-md border border-terminal-gray bg-black">
        {heroPost.featuredImage?.url ? (
          <img
            src={heroPost.featuredImage.url}
            alt={heroPost.featuredImage.altText ?? ''}
            className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0">
            <StoryMediaPlaceholder label={heroPost.primaryCategory?.name ?? 'HES'} showLabel={false} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-6 md:p-8">
          <div className="mb-4">
            <CategoryBadge category={heroPost.primaryCategory} />
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-5xl">
            {heroPost.title}
          </h1>
          {heroPost.excerpt ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{heroPost.excerpt}</p> : null}
          <div className="mt-6">
            <PostMeta post={heroPost} />
          </div>
          <div className="mt-6 flex gap-2">
            <span className="h-1 w-12 rounded-full bg-system-red" />
            <span className="h-1 w-12 rounded-full bg-white/40" />
            <span className="h-1 w-12 rounded-full bg-white/40" />
          </div>
        </div>
      </article>

      <div className="grid gap-4">
        {secondaryPosts.slice(0, 3).map((post) => (
          <CompactStoryCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
