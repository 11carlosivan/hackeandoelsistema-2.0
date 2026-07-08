'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { name: 'INICIO', path: '/' },
    { name: 'NACIONALES', path: '/categoria/NACIONALES' },
    { name: 'POLÍTICA', path: '/categoria/POLÍTICA' },
    { name: 'TECNOLOGÍA', path: '/categoria/TECNOLOGÍA' },
    { name: 'INTERNACIONAL', path: '/categoria/INTERNACIONAL' },
    { name: 'INVESTIGACIÓN', path: '/categoria/INVESTIGACIÓN' }
  ];

  return (
    <header className="bg-background border-b border-terminal-gray fixed top-0 w-full z-50">
      <div className="flex flex-col w-full px-margin-page max-w-full mx-auto pt-4 pb-2">
        <div className="flex justify-between items-center mb-4">
          <Link className="flex items-center cursor-pointer" href="/">
            <img 
              alt="Hackeando el Sistema" 
              className="h-20 md:h-24 object-contain" 
              src="/isotipo.png"
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-4 text-on-surface-variant font-label-caps text-label-caps tracking-widest">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red scale-75 animate-pulse">rss_feed</span> 
                TRANSMISIÓN_EN_VIVO
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="material-symbols-outlined absolute right-2 top-2 text-on-surface-variant hover:text-system-red transition-colors">
                search
              </button>
            </form>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              className="hidden md:flex items-center gap-2 bg-black border border-system-red text-system-red font-label-caps text-[12px] px-4 py-1.5 hover:bg-system-red hover:text-black transition-all active:scale-95 font-bold"
              onClick={() => router.push('/cms')}
            >
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              ACCESO
            </button>
          </div>
        </div>
        
        <nav className="flex overflow-x-auto no-scrollbar gap-8 py-2">
          {categories.map((cat) => {
            const isActive = pathname === cat.path ||
              (cat.path !== '/' && pathname.startsWith(cat.path));
            return (
              <Link
                key={cat.name}
                href={cat.path}
                className={`${
                  isActive 
                    ? 'text-system-red border-b-2 border-system-red pb-1 font-bold' 
                    : 'text-on-surface-variant hover:text-on-surface hover:text-system-red transition-colors duration-200'
                } font-label-caps text-label-caps whitespace-nowrap`}
              >
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
