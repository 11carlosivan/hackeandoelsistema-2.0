import { PostCard } from '@/components/design-system/molecules/post-card';
import { SectionHeader } from '@/components/design-system/molecules/section-header';

const filters = ['Todas', 'Politica', 'Nacional', 'Internacional', 'Economia', 'Deportes', 'Clima RD'];

export function LatestNewsSection({ posts }) {
  return (
    <section className="rounded-md border border-terminal-gray bg-surface-container-lowest p-4 md:p-5">
      <SectionHeader
        title="Lo ultimo"
        action={
          <div className="hidden flex-wrap justify-end gap-2 lg:flex">
            {filters.map((filter, index) => (
              <span
                key={filter}
                className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                  index === 0 ? 'bg-white text-black' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {filter}
              </span>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
