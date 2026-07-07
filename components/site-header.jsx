import Link from 'next/link';
import { siteConfig } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="border-b border-terminal-gray bg-background">
      <div className="hes-container flex min-h-20 items-center justify-between gap-6 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Hackeando el Sistema">
          <img src="/isotipo.png" alt="" className="h-12 w-12 object-contain" />
          <span className="hidden text-sm font-black uppercase leading-tight text-white sm:block">
            Hackeando
            <br />
            el Sistema
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-xs font-bold uppercase text-on-surface-variant md:flex">
          {siteConfig.mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-system-red">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
