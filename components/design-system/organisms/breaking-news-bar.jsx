import Link from 'next/link';
import { Zap } from 'lucide-react';

export function BreakingNewsBar({ items }) {
  return (
    <section className="border-b border-terminal-gray bg-surface-container-lowest">
      <div className="hes-container flex min-h-14 items-center gap-5 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 text-sm font-black uppercase text-system-red">
          <Zap size={16} fill="currentColor" strokeWidth={2.4} aria-hidden="true" />
          <span>Ultimas noticias</span>
        </div>
        <div className="flex min-w-0 gap-8 overflow-hidden text-sm text-on-surface-variant">
          {items.map((item) => (
            <Link key={item.id} href={item.url} className="truncate hover:text-white">
              <span className="font-bold text-white">{item.title}</span>
              <span className="ml-2 text-on-surface-variant">hace 20 min</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
