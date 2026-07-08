import Link from 'next/link';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';

export function CompactStoryCard({ post }) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-md border border-terminal-gray bg-surface-container shadow-[0_14px_30px_rgba(0,0,0,0.22)] lg:min-h-[119px]">
      {post.featuredImage?.url ? (
        <img
          src={post.featuredImage.url}
          alt={post.featuredImage.altText ?? ''}
          className="absolute inset-0 h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0">
          <StoryMediaPlaceholder label={post.primaryCategory?.name ?? 'HES'} showLabel={false} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/78 to-black/20" />
      <div className="relative z-10 flex min-h-[119px] flex-col justify-end p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-system-red">
          <span className="h-3 w-0.5 bg-system-red" />
          <span>{post.primaryCategory?.name}</span>
          <span className="text-white/55">/ hace 1 hora</span>
        </div>
        <h3 className="hes-text-shadow line-clamp-2 text-lg font-black leading-tight text-white">
          <Link href={post.url} className="hover:text-system-red">
            {post.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}
