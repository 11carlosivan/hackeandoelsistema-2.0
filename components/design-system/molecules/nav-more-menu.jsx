import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export function NavMoreMenu({ items }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center whitespace-nowrap text-[13px] font-black uppercase text-white transition hover:text-system-red xl:text-sm"
      >
        Mas
        <ChevronDown className="ml-1 transition group-hover:rotate-180" size={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <div className="invisible absolute right-0 top-full z-50 mt-4 w-56 rounded-md border border-terminal-gray bg-black/95 p-2 opacity-0 shadow-[0_22px_50px_rgba(0,0,0,0.45)] backdrop-blur transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="absolute -top-4 left-0 right-0 h-4" />
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-sm px-3 py-2 text-xs font-black uppercase text-on-surface-variant transition hover:bg-surface-container hover:text-system-red"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
