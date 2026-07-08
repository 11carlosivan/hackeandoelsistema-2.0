import Link from 'next/link';

export function CategoryFilterBar({ filters }) {
  return (
    <div className="relative min-w-0">
      <div className="hes-scrollbar-none flex max-w-full gap-2 overflow-x-auto whitespace-nowrap pr-1">
        {filters.map((filter, index) => {
          const isActive = index === 0;

          return (
            <Link
              key={filter.label}
              href={filter.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase leading-none transition ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-surface-container text-on-surface-variant hover:bg-system-red hover:text-black'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
