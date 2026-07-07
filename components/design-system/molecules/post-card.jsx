import Link from 'next/link';
import { CategoryBadge } from '@/components/design-system/atoms/category-badge';
import { PostMeta } from '@/components/design-system/atoms/post-meta';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';

export function PostCard({ post, variant = 'default' }) {
  const isFeature = variant === 'feature';

  return (
    <article className="group grid h-full overflow-hidden border border-terminal-gray bg-surface-container-low transition-colors hover:border-system-red">
      <Link href={post.url} className="block">
        <div className={isFeature ? 'aspect-[16/9] overflow-hidden bg-surface-container' : 'aspect-[16/10] overflow-hidden bg-surface-container'}>
          {post.featuredImage?.url ? (
            <img
              src={post.featuredImage.url}
              alt={post.featuredImage.altText ?? ''}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <StoryMediaPlaceholder label={post.primaryCategory?.name ?? 'HES'} />
          )}
        </div>
      </Link>

      <div className={isFeature ? 'p-6' : 'p-4'}>
        <div className="mb-3 flex items-center gap-2">
          <CategoryBadge category={post.primaryCategory} />
          {post.isBreaking ? <span className="text-[11px] font-black uppercase text-system-red">Ultima hora</span> : null}
        </div>

        <h3 className={isFeature ? 'text-3xl font-black leading-tight text-white' : 'text-lg font-black leading-snug text-white'}>
          <Link href={post.url} className="hover:text-system-red">
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className={isFeature ? 'mt-4 line-clamp-3 text-base leading-7 text-on-surface-variant' : 'mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant'}>
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-5">
          <PostMeta post={post} />
        </div>
      </div>
    </article>
  );
}
