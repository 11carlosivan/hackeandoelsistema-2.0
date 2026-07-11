import Link from 'next/link';
import { getAuthorName } from '@/lib/main-design/authors';

export function SystemPageHeader({ eyebrow, title, description, stats = [] }) {
  return (
    <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 mb-10 relative overflow-hidden">
      <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="font-label-caps text-[10px] text-system-red font-bold tracking-widest mb-3">
            {eyebrow}
          </div>
          <h1 className="font-headline-xl text-4xl md:text-[56px] text-white uppercase leading-none tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-on-surface-variant text-body-md max-w-2xl mt-4 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 min-w-[220px]">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-terminal-gray bg-black/30 p-4">
                <div className="flex items-center gap-2 text-system-red font-label-caps text-[10px] font-bold mb-2">
                  {stat.icon && (
                    <span className="material-symbols-outlined text-[16px]">{stat.icon}</span>
                  )}
                  {stat.label}
                </div>
                <div className="font-headline-md text-xl text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ArticleListItem({ article }) {
  return (
    <Link
      href={article.route || `/articulo/${article.id}`}
      className="group border border-terminal-gray bg-surface-container-low/25 p-4 md:p-5 grid gap-5 md:grid-cols-[220px_1fr] hover:border-system-red transition-all"
    >
      <div className="relative aspect-video overflow-hidden border border-terminal-gray bg-black">
        <img
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={article.title}
          src={article.image}
        />
        <span className="absolute top-2 left-2 bg-system-red text-black font-label-caps text-[9px] px-2 py-0.5 font-bold">
          {article.category}
        </span>
      </div>

      <div className="min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-system-red font-label-caps text-[9px] font-bold mb-2">
            <span>{article.date}</span>
            {article.views && (
              <>
                <span>/</span>
                <span>{article.views} VISTAS</span>
              </>
            )}
            {article.readTime && (
              <>
                <span>/</span>
                <span>{article.readTime}</span>
              </>
            )}
          </div>
          <h2 className="font-headline-md text-xl text-white uppercase leading-tight group-hover:text-system-red transition-colors">
            {article.title}
          </h2>
          {article.subtitle && (
            <p className="text-on-surface-variant text-sm mt-2 line-clamp-2 leading-relaxed">
              {article.subtitle}
            </p>
          )}
        </div>

        <div className="text-[10px] font-label-caps text-on-surface-variant flex items-center gap-2 mt-4">
          <span className="w-1.5 h-1.5 bg-system-red" />
          <span>AUTOR: {(article.authorName || getAuthorName(article.authorId)).toUpperCase()}</span>
        </div>
      </div>
    </Link>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="border border-dashed border-terminal-gray p-10 text-center bg-surface-container-low/20">
      <div className="font-label-caps text-system-red text-[11px] font-bold mb-2">{title}</div>
      <p className="text-on-surface-variant text-sm">{description}</p>
    </div>
  );
}
