import Link from 'next/link';
import { Zap } from 'lucide-react';

export function BreakingNewsBar({ items }) {
  return (
    <section className="border-b border-terminal-gray bg-surface-container-lowest shadow-[0_14px_35px_rgba(0,0,0,0.16)]">
      <div className="hes-container flex min-h-14 items-center gap-5 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 text-sm font-black uppercase text-system-red">
          <Zap size={16} fill="currentColor" strokeWidth={2.4} aria-hidden="true" />
          <span>Ultimas noticias</span>
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface-container-lowest to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface-container-lowest to-transparent" />
          <div className="hes-scrollbar-none flex min-w-0 gap-0 overflow-x-auto text-sm text-on-surface-variant">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                className="group flex min-w-[340px] items-center gap-3 border-l border-terminal-gray px-5 first:border-l-0 first:pl-0 hover:text-white"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-system-red/80" />
                <span className="truncate font-bold text-white group-hover:text-system-red">{item.title}</span>
                <span className="shrink-0 text-xs text-on-surface-variant">hace 20 min</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
