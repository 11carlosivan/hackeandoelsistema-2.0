import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/design-system/molecules/section-header';

export function OpinionStrip({ posts }) {
  return (
    <section>
      <SectionHeader
        title="Opinion destacada"
        action={
          <Link href="/category/opinion/" className="inline-flex items-center gap-2">
            Ver todas
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {posts.slice(0, 3).map((post) => (
          <Link
            key={post.id}
            href={post.url}
            className="grid grid-cols-[4rem_1fr] gap-4 rounded-md border border-terminal-gray bg-surface-container p-4 shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition hover:border-system-red"
          >
            <div className="grid h-16 w-16 place-items-center rounded-md bg-black text-xl font-black text-system-red">
              {post.author.displayName.slice(0, 1)}
            </div>
            <div>
              <h3 className="font-black text-white">{post.author.displayName}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{post.title}</p>
              <p className="mt-2 text-xs text-on-surface-variant">hace 3 horas</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
