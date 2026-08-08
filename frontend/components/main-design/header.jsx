'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/main-design/client-api';

function normalizeCategoryPath(category) {
  if (category.fullPath) {
    const cleanPath = String(category.fullPath).trim().replace(/^\/+|\/+$/g, '');
    const categoryPath = cleanPath.startsWith('category/') ? cleanPath : `category/${cleanPath}`;

    return `/${categoryPath}/`;
  }

  if (category.slug) {
    return `/category/${category.slug}/`;
  }

  return '/archivo';
}

function buildNavigation(categories = []) {
  const categoryLinks = categories
    .filter((category) => category?.slug || category?.fullPath)
    .slice(0, 8)
    .map((category) => ({
      name: (category.title || category.name || category.slug).toUpperCase(),
      path: normalizeCategoryPath(category),
    }));

  return [
    { name: 'INICIO', path: '/' },
    ...categoryLinks,
    { name: 'ARCHIVO', path: '/archivo' },
  ];
}

function normalizePath(path) {
  if (!path || path === '/') return '/';

  return path.endsWith('/') ? path : `${path}/`;
}

export default function Header({ categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(storedTheme);

    try {
      const isAuth = localStorage.getItem('hes_authenticated') === 'true';
      const storedProfile = localStorage.getItem('hes_user_profile');
      if (isAuth && storedProfile) {
        setCurrentUser(JSON.parse(storedProfile));
      }
    } catch (_) {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  const navigation = buildNavigation(categories);
  const activePath = normalizePath(pathname);

  // Cerrar menú movil al cambiar de pagina
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  const handleAuthClick = () => {
    setIsMobileMenuOpen(false);
    if (currentUser) {
      const slug = encodeURIComponent((currentUser.nombre || 'admin1').toLowerCase().replace(/\s+/g, '-'));
      router.push(`/perfil/${slug}`);
    } else {
      router.push('/iniciar-sesion');
    }
  };

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hes_authenticated');
      localStorage.removeItem('hes_user_profile');
    }
    try {
      await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null);
    } catch (_) {}

    setCurrentUser(null);
    router.push('/');
    router.refresh();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      router.push(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-background border-b border-terminal-gray fixed top-0 w-full z-50">
      <div className="flex flex-col w-full px-margin-page max-w-full mx-auto pt-3 pb-2">
        <div className="flex justify-between items-center">
          <Link className="flex items-center cursor-pointer" href="/">
            <img
              alt="Hackeando el Sistema"
              className="h-16 md:h-24 object-contain"
              src="/isotipo.png"
            />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-4 text-on-surface-variant font-label-caps text-label-caps tracking-widest">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red scale-75 animate-pulse">rss_feed</span>
                TRANSMISION_EN_VIVO
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red scale-75">public</span>
                RED_GLOBAL_INTEL
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                className="bg-surface-container-low border-none border-b border-terminal-gray font-label-caps text-label-caps focus:ring-0 focus:border-system-red transition-all w-64 px-4 py-2 text-white placeholder:opacity-40"
                placeholder="BUSCAR EN EL SISTEMA..."
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit" className="material-symbols-outlined absolute right-2 top-2 text-on-surface-variant hover:text-system-red transition-colors">
                search
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden flex items-center justify-center p-2 border border-terminal-gray bg-black/45 text-on-surface-variant hover:text-system-red hover:border-system-red transition-all active:scale-95 cursor-pointer"
              title="Buscar"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSearchOpen ? 'close' : 'search'}
              </span>
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2 border border-terminal-gray bg-black/45 text-on-surface-variant hover:text-system-red hover:border-system-red transition-all active:scale-95 cursor-pointer font-bold"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              <span className="material-symbols-outlined text-[18px] select-none">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              className="hidden md:flex items-center gap-2 bg-black border border-system-red text-system-red font-label-caps text-[12px] px-4 py-1.5 hover:bg-system-red hover:text-black transition-all active:scale-95 font-bold uppercase truncate max-w-[200px]"
              onClick={handleAuthClick}
            >
              <span className="material-symbols-outlined text-[18px]">
                {currentUser ? 'account_circle' : 'terminal'}
              </span>
              {currentUser ? currentUser.nombre : 'ACCESO'}
            </button>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 border border-terminal-gray bg-black/50 text-on-surface-variant font-label-caps text-[11px] px-3 py-1.5 hover:border-system-red hover:text-system-red transition-all active:scale-95 font-bold uppercase"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                DESCONECTAR
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 border border-system-red bg-black/80 text-system-red hover:bg-system-red hover:text-black transition-all active:scale-95 cursor-pointer"
              title="Menú"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Dropdown */}
        {isSearchOpen && (
          <form onSubmit={handleSearchSubmit} className="md:hidden relative my-3">
            <input
              className="w-full bg-surface-container-low border border-terminal-gray font-label-caps text-xs px-4 py-2.5 text-white focus:border-system-red outline-none"
              placeholder="BUSCAR NOTICIA O TEMA..."
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button type="submit" className="material-symbols-outlined absolute right-3 top-2.5 text-system-red">
              search
            </button>
          </form>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex overflow-x-auto no-scrollbar gap-8 py-2 mt-2">
          {navigation.map((category) => {
            const categoryPath = normalizePath(category.path);
            const isActive = activePath === categoryPath ||
              (categoryPath !== '/' && activePath.startsWith(categoryPath));

            return (
              <Link
                key={category.name}
                href={category.path}
                className={`${
                  isActive
                    ? 'text-system-red border-b-2 border-system-red pb-1 font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:text-system-red transition-colors duration-200'
                } font-label-caps text-label-caps whitespace-nowrap`}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-terminal-gray bg-black/95 backdrop-blur-lg mt-3 p-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input in Mobile Menu */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                className="w-full bg-surface-container-low border border-terminal-gray font-label-caps text-xs px-4 py-2 text-white focus:border-system-red outline-none"
                placeholder="BUSCAR EN EL SISTEMA..."
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit" className="material-symbols-outlined absolute right-3 top-2 text-system-red">
                search
              </button>
            </form>

            {/* Auth Buttons in Mobile Menu */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-system-red text-black font-label-caps text-xs py-2.5 font-bold uppercase"
                onClick={handleAuthClick}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {currentUser ? 'account_circle' : 'terminal'}
                </span>
                {currentUser ? currentUser.nombre : 'INICIAR SESION'}
              </button>

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="border border-terminal-gray bg-black px-3 py-2 text-system-red hover:border-system-red font-label-caps text-xs font-bold"
                  title="Cerrar sesión"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>

            {/* Mobile Categories Links */}
            <div className="border-t border-terminal-gray/40 pt-4">
              <div className="font-label-caps text-[9px] text-system-red font-bold tracking-widest mb-3 uppercase">
                CATEGORIAS Y SECCIONES
              </div>
              <div className="grid grid-cols-2 gap-2">
                {navigation.map((category) => {
                  const categoryPath = normalizePath(category.path);
                  const isActive = activePath === categoryPath ||
                    (categoryPath !== '/' && activePath.startsWith(categoryPath));

                  return (
                    <Link
                      key={category.name}
                      href={category.path}
                      className={`p-2.5 border text-xs font-label-caps font-bold transition-all ${
                        isActive
                          ? 'border-system-red bg-system-red/10 text-system-red'
                          : 'border-terminal-gray/40 bg-black/40 text-white hover:border-system-red'
                      }`}
                    >
                      {category.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
