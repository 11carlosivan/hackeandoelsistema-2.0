import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CategoryBadge } from '@/components/design-system/atoms/category-badge';
import { PostMeta } from '@/components/design-system/atoms/post-meta';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';

export function PostCard({ post, variant = 'default' }) {
  const isFeature = variant === 'feature';

  return (
    <article className="group grid h-full overflow-hidden rounded-md border border-terminal-gray bg-surface-container-low shadow-[0_14px_32px_rgba(0,0,0,0.18)] transition-colors hover:border-system-red">
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

      <div className={`flex h-full flex-col ${isFeature ? 'p-6' : 'p-4'}`}>
        <div className="mb-3 flex items-center gap-2">
          <CategoryBadge category={post.primaryCategory} />
          {post.isBreaking ? <span className="text-[11px] font-black uppercase text-system-red">Ultima hora</span> : null}
        </div>

        <h3 className={isFeature ? 'text-3xl font-black leading-tight text-white' : 'line-clamp-3 text-base font-black leading-snug text-white'}>
          <Link href={post.url} className="hover:text-system-red">
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className={isFeature ? 'mt-4 line-clamp-3 text-base leading-7 text-on-surface-variant' : 'mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant'}>
            {post.excerpt}
          </p>
        ) : null}

        <div className="mt-auto pt-5">
          <PostMeta post={post} />
          <Link
            href={post.url}
            className="mt-4 inline-flex items-center gap-2 border-t border-terminal-gray pt-3 text-xs font-black uppercase text-system-red transition group-hover:text-white"
          >
            Leer analisis
            <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
