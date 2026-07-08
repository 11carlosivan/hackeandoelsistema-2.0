import { PostCard } from '@/components/design-system/molecules/post-card';
import { CategoryFilterBar } from '@/components/design-system/molecules/category-filter-bar';
import { SectionHeader } from '@/components/design-system/molecules/section-header';

const filters = [
  { label: 'Todas', href: '/' },
  { label: 'Politica', href: '/category/politica/' },
  { label: 'Nacional', href: '/category/nacionales/' },
  { label: 'Internacional', href: '/category/internacionales/' },
  { label: 'Economia', href: '/category/economia-negocios/' },
  { label: 'Deportes', href: '/category/deportes/' },
  { label: 'MLB', href: '/category/mlb/' },
  { label: 'NBA', href: '/category/nba/' },
  { label: 'Clima RD', href: '/category/clima-rd/' },
];

export function LatestNewsSection({ posts }) {
  return (
    <section className="rounded-md border border-terminal-gray bg-surface-container-lowest p-4">
      <SectionHeader
        title="Lo ultimo"
        action={<CategoryFilterBar filters={filters} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
