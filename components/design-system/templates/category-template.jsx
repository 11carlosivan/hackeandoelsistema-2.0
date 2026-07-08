import Link from 'next/link';
import { ArrowUpRight, Clock3, Layers3, Newspaper, RadioTower } from 'lucide-react';
import { AdSlot } from '@/components/design-system/molecules/ad-slot';
import { EmptyState } from '@/components/design-system/molecules/empty-state';
import { Pagination } from '@/components/design-system/molecules/pagination';
import { PostCard } from '@/components/design-system/molecules/post-card';
import { PostMeta } from '@/components/design-system/atoms/post-meta';
import { StoryMediaPlaceholder } from '@/components/design-system/atoms/story-media-placeholder';
import { BreakingNewsBar } from '@/components/design-system/organisms/breaking-news-bar';
import { NetworkCard } from '@/components/design-system/organisms/network-card';
import { TrendingPanel } from '@/components/design-system/organisms/trending-panel';
import { WeatherCard } from '@/components/design-system/organisms/weather-card';

function formatLastmod(value) {
  if (!value) {
    return 'Actualizacion editorial';
  }

  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatArticleCount(total) {
  return `${total} ${total === 1 ? 'articulo' : 'articulos'}`;
}

function CategoryMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-terminal-gray bg-black/30 px-4 py-3">
      <div className="flex items-center gap-2 text-system-red">
        <Icon size={15} strokeWidth={2.5} aria-hidden="true" />
        <p className="text-[10px] font-black uppercase text-on-surface-variant">{label}</p>
      </div>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function LeadStory({ post }) {
  if (!post) {
    return null;
  }

  return (
    <article className="group grid overflow-hidden rounded-md border border-terminal-gray bg-surface-container-low shadow-[0_18px_44px_rgba(0,0,0,0.2)] lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <Link href={post.url} className="relative min-h-[260px] overflow-hidden bg-surface-container">
        {post.featuredImage?.url ? (
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.altText ?? ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <StoryMediaPlaceholder label={post.primaryCategory?.name ?? 'HES'} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.74)_100%)]" />
        {post.isBreaking ? (
          <span className="absolute left-5 top-5 bg-system-red px-3 py-1 text-[11px] font-black uppercase text-black">
            Ultima hora
          </span>
        ) : null}
      </Link>

      <div className="flex flex-col justify-center p-6 lg:p-8">
        <p className="hes-kicker">Historia principal</p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
          <Link href={post.url} className="hover:text-system-red">
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{post.excerpt}</p>
        ) : null}
        <div className="mt-6">
          <PostMeta post={post} />
          <Link
            href={post.url}
            className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-system-red hover:text-white"
          >
            Leer cobertura
            <ArrowUpRight size={15} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompactCategoryList({ posts }) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-terminal-gray bg-surface-container p-5">
      <div className="mb-1 flex items-center gap-2 text-system-red">
        <RadioTower size={16} strokeWidth={2.4} aria-hidden="true" />
        <h2 className="text-lg font-black uppercase text-white">Radar de categoria</h2>
      </div>
      <div className="mt-4 divide-y divide-terminal-gray">
        {posts.slice(0, 4).map((post) => (
          <article key={post.id} className="py-4 first:pt-0 last:pb-0">
            <Link href={post.url} className="group">
              <h3 className="text-sm font-black leading-snug text-white group-hover:text-system-red">{post.title}</h3>
              <p className="mt-2 text-xs font-bold uppercase text-on-surface-variant">{post.readingTimeMinutes ?? 3} min de lectura</p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CategoryTemplate({ payload }) {
  const { category, posts, pagination, route, adSlots } = payload;
  const leadPost = posts[0] ?? null;
  const remainingPosts = posts.slice(1);
  const lastmod = formatLastmod(route.lastmodAt);
  const categoryName = category.name;

  return (
    <div className="bg-background">
      {posts.length > 0 ? <BreakingNewsBar items={posts.slice(0, 3)} /> : null}

      <section className="border-b border-terminal-gray bg-[linear-gradient(135deg,#080808_0%,#141414_52%,#26070b_100%)]">
        <div className="hes-container py-8 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="hes-kicker">Categoria</p>
              <h1 className="mt-3 text-5xl font-black uppercase leading-none text-white md:text-7xl">{categoryName}</h1>
              {category.description ? (
                <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant md:text-lg">
                  {category.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <CategoryMetric icon={Newspaper} label="Publicaciones" value={formatArticleCount(pagination.totalItems)} />
              <CategoryMetric icon={Clock3} label="Actualizado" value={lastmod} />
              <CategoryMetric icon={Layers3} label="Pagina" value={`${pagination.page} / ${pagination.totalPages}`} />
            </div>
          </div>

          {category.children?.length > 0 ? (
            <div className="hes-scrollbar-none mt-7 flex gap-2 overflow-x-auto">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={child.url}
                  className="shrink-0 rounded-full border border-terminal-gray bg-surface-container px-4 py-2 text-xs font-black uppercase text-white hover:border-system-red hover:text-system-red"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="hes-container py-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            {leadPost ? <LeadStory post={leadPost} /> : (
              <EmptyState
                title="Esta categoria todavia no tiene publicaciones"
                body="Cuando el CMS publique contenido en esta seccion, aparecera aqui con su paginacion y metadata SEO."
              />
            )}

            {remainingPosts.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center justify-between border-b border-terminal-gray pb-3">
                  <h2 className="text-2xl font-black text-white">Mas de {categoryName}</h2>
                  <span className="text-xs font-black uppercase text-system-red">{pagination.totalItems} resultados</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {remainingPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            ) : null}

            <Pagination pagination={pagination} />
          </div>

          <aside className="min-w-0 space-y-4">
            <CompactCategoryList posts={posts} />
            {posts.length > 1 ? <TrendingPanel posts={posts} /> : null}
            <WeatherCard />
            <NetworkCard />
            {adSlots[0] ? <AdSlot slot={adSlots[0]} /> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
