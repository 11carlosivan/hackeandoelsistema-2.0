import Link from 'next/link';
import { Search, Sun, UserRound } from 'lucide-react';
import { IconButton } from '@/components/design-system/atoms/icon-button';
import { NavMoreMenu } from '@/components/design-system/molecules/nav-more-menu';
import { NavLink } from '@/components/design-system/atoms/nav-link';
import { PrimaryButton } from '@/components/design-system/atoms/primary-button';
import { siteConfig } from '@/lib/site';

export function PublicHeader() {
  const primaryNav = siteConfig.mainNav.slice(0, 6);
  const secondaryNav = siteConfig.mainNav.slice(6);

  return (
    <header className="sticky top-0 z-50 border-b border-terminal-gray bg-black/95 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="hes-container flex min-h-20 items-center gap-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-system-red"
          aria-label="Hackeando el Sistema"
        >
          <span className="block h-12 w-36 overflow-hidden">
            <img src="/logo_texto.png" alt="Hackeando el Sistema" className="h-full w-full object-cover" />
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-4 xl:gap-5 lg:flex">
          {primaryNav.map((item, index) => (
            <NavLink key={item.href} href={item.href} active={index === 0}>
              {item.label}
            </NavLink>
          ))}
          <NavMoreMenu items={secondaryNav} />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <IconButton label="Buscar">
            <Search size={18} strokeWidth={2.4} />
          </IconButton>
          <IconButton label="Cambiar tema">
            <Sun size={18} strokeWidth={2.4} />
          </IconButton>
          <PrimaryButton href="/register/" className="hidden sm:inline-flex">
            Unete al Network
          </PrimaryButton>
          <Link
            href="/iniciar-sesion/"
            className="hidden items-center gap-2 text-sm font-bold text-white hover:text-system-red md:inline-flex"
          >
            <UserRound size={17} strokeWidth={2.3} />
            <span>Iniciar sesion</span>
          </Link>
        </div>
      </div>
      <nav className="hes-container hes-scrollbar-none flex gap-5 overflow-x-auto border-t border-terminal-gray py-3 lg:hidden">
        {siteConfig.mainNav.slice(0, 10).map((item, index) => (
          <NavLink key={item.href} href={item.href} active={index === 0}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
