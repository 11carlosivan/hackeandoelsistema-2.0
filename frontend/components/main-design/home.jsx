'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { articles as fallbackArticles, opinions, authors } from '@/lib/main-design/mock-data';
import SafeImage from './safe-image';

export default function Home({ initialArticles, initialCategories = [], summary = null, useMockFallback = true }) {
  const router = useRouter();
  const articles = initialArticles?.length > 0 ? initialArticles : (useMockFallback ? fallbackArticles : []);
  
  // Hero articles (slider on the left)
  const heroArticles = articles.filter(a => a.isHero || a.isFeatured);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const currentHero = heroArticles[currentHeroIndex] || heroArticles[0];

  // Active filter for LO ÚLTIMO
  const [activeFilter, setActiveFilter] = useState('TODAS');
  
  // Likes state map for feed items
  const [likedArticles, setLikedArticles] = useState({});

  const categories = [
    'TODAS',
    ...new Set(
      (initialCategories.length > 0
        ? initialCategories.map((category) => category.title || category.name)
        : ['POLÍTICA', 'NACIONALES', 'TECNOLOGÍA', 'INTERNACIONAL', 'INVESTIGACIÓN']
      ).filter(Boolean).map((category) => category.toUpperCase()),
    ),
  ].slice(0, 10);
  const visibleCategories = useMockFallback || initialCategories.length > 0 ? categories : ['TODAS'];

  const getAuthorName = (authorId) => {
    const articleAuthor = articles.find((article) => article.authorId === authorId)?.authorName;
    if (articleAuthor) return articleAuthor;

    const author = authors.find(auth => auth.id === authorId);
    return author ? author.name : 'Redacción';
  };

  const navigateToArticle = (article, hash = '') => {
    router.push(`${article.route || `/articulo/${article.id}`}${hash}`);
  };

  const handleNextHero = (e) => {
    e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev + 1) % heroArticles.length);
  };

  const handlePrevHero = (e) => {
    e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev - 1 + heroArticles.length) % heroArticles.length);
  };

  // Middle stack: take 3 articles that are not the current hero slider article
  const getMiddleArticles = () => {
    if (!currentHero) {
      return articles.slice(0, 3);
    }

    return articles
      .filter(a => a.id !== currentHero.id)
      .slice(0, 3);
  };
  const middleArticles = getMiddleArticles();

  // parse views string to compare (e.g. "15.4K" -> 15400)
  const parseViews = (viewsStr) => {
    if (!viewsStr) return 0;
    const num = parseFloat(viewsStr.replace('K', ''));
    return viewsStr.includes('K') ? num * 1000 : num;
  };

  // Trending articles (sorted by views desc, top 5)
  const trendingArticles = [...articles]
    .sort((a, b) => parseViews(b.views) - parseViews(a.views))
    .slice(0, 5);

  // Filter articles for LO ÚLTIMO grid
  const getFilteredArticles = () => {
    let list = articles;
    if (activeFilter !== 'TODAS') {
      list = articles.filter(a => a.category === activeFilter);
    }
    return list.slice(0, 4);
  };
  const filteredArticles = getFilteredArticles();

  // Featured opinions list
  const featuredOpinions = useMockFallback ? opinions.slice(0, 3) : [];

  const toggleLike = (artId, e) => {
    e.stopPropagation();
    setLikedArticles(prev => ({
      ...prev,
      [artId]: !prev[artId]
    }));
  };

  return (
    <div className="space-y-12">
      
      {/* 1. ÚLTIMAS NOTICIAS Bar (Horizontal Marquee News Ticker) - Rediseñado y Más Grande */}
      <div className="flex items-center border-y border-x-0 border-terminal-gray bg-surface-container-low/40 h-12 overflow-hidden text-[12px] font-mono select-none -mt-4 -mx-4 lg:-mx-6 mb-8">
        <div className="flex items-center gap-2 bg-system-red text-black px-5 h-full font-bold uppercase shrink-0">
          <span className="material-symbols-outlined text-[18px] animate-pulse">bolt</span>
          <span className="tracking-wider">Últimas Noticias</span>
        </div>
        <div className="relative flex-grow overflow-hidden h-full flex items-center">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-12 pl-4">
            {/* Duplicated list to allow seamless loop scrolling */}
            {articles.slice(0, 5).concat(articles.slice(0, 5)).map((art, idx) => (
              <Link 
                key={`${art.id}-${idx}`} 
                href={art.route || `/articulo/${art.id}`} 
                className="hover:text-system-red transition-colors flex items-center gap-2 text-white font-bold"
              >
                <span>{art.title.toUpperCase()}</span>
                <span className="text-system-red font-bold text-[10px]">• HACE {idx % 2 === 0 ? '1H' : '30M'}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {summary?.counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'POSTS', value: summary.counts.posts },
            { label: 'RUTAS SEO', value: summary.counts.routes },
            { label: 'CATEGORIAS', value: summary.counts.categories },
            { label: 'TAGS', value: summary.counts.tags },
          ].map((item) => (
            <div key={item.label} className="border border-terminal-gray bg-surface-container-low/25 px-4 py-3">
              <div className="font-label-caps text-[9px] text-system-red font-bold">{item.label}</div>
              <div className="font-headline-md text-2xl text-white">{Number(item.value || 0).toLocaleString('es-DO')}</div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Top Featured Split Grid (3-column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Hero news slider (Takes 6/12 columns) */}
        {currentHero && (
          <section 
            onClick={() => navigateToArticle(currentHero)}
            className="lg:col-span-6 relative group overflow-hidden border border-terminal-gray bg-surface-container-low h-[400px] md:h-[450px] cursor-pointer flex flex-col justify-end"
          >
            <div className="absolute inset-0 scanline z-10 pointer-events-none opacity-20"></div>
            <SafeImage
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" 
              alt={currentHero.title}
              src={currentHero.image}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-25"></div>
            
            {/* Slider Controls (Chevron hover buttons) */}
            {heroArticles.length > 1 && (
              <div className="absolute top-4 right-4 z-40 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handlePrevHero}
                  className="w-10 h-10 flex items-center justify-center bg-black/70 border border-white/20 hover:border-system-red hover:text-system-red transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-white text-[18px]">chevron_left</span>
                </button>
                <button 
                  onClick={handleNextHero}
                  className="w-10 h-10 flex items-center justify-center bg-black/70 border border-white/20 hover:border-system-red hover:text-system-red transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-white text-[18px]">chevron_right</span>
                </button>
              </div>
            )}

            {/* Content overlay */}
            <div className="relative p-6 z-30 max-w-full">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="bg-system-red text-black font-label-caps text-[9px] px-2 py-0.5 font-bold">
                  {currentHero.category}
                </span>
                {currentHero.tag && (
                  <span className="text-on-surface-variant font-label-caps text-[9px] border-l border-terminal-gray pl-3 uppercase">
                    {currentHero.tag}
                  </span>
                )}
              </div>
              
              <h2 className="font-headline-xl text-[24px] md:text-[28px] text-white mb-2.5 leading-snug uppercase group-hover:text-system-red transition-colors font-bold">
                {currentHero.title}
              </h2>
              
              <p className="text-[12px] text-on-surface-variant mb-4 line-clamp-2 font-body-md max-w-xl leading-relaxed">
                {currentHero.subtitle}
              </p>
              
              <div className="flex items-center gap-3 border-t border-terminal-gray/40 pt-3 text-[10px] font-mono text-on-surface-variant uppercase">
                <span>Por: {getAuthorName(currentHero.authorId)}</span>
                <span>•</span>
                <span>{currentHero.date}</span>
                <span>•</span>
                <span className="text-system-red font-bold">{currentHero.views} visitas</span>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="absolute bottom-4 right-6 z-30 flex gap-1.5">
              {heroArticles.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 transition-all ${idx === currentHeroIndex ? 'w-4 bg-system-red' : 'w-1.5 bg-terminal-gray'}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* Middle Column: Vertical stack of 3 news backdrop cards (Takes 3/12 columns) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-4 h-[400px] md:h-[450px]">
          {middleArticles.map((art, index) => (
            <div 
              key={art.id}
              onClick={() => navigateToArticle(art)}
              className="relative flex-grow h-[126px] border border-terminal-gray overflow-hidden group cursor-pointer flex flex-col justify-end p-3"
            >
              <SafeImage
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                alt={art.title}
                src={art.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10"></div>
              
              <div className="relative z-20">
                <span className="inline-block bg-system-red/90 text-black font-label-caps text-[8px] px-1.5 py-0.2 mb-1.5 font-bold uppercase">
                  {art.category}
                </span>
                <h3 className="text-white font-bold text-[11px] leading-tight line-clamp-2 uppercase group-hover:text-system-red transition-colors">
                  {art.title}
                </h3>
                <span className="text-[8px] text-on-surface-variant font-mono uppercase mt-1 block">
                  Hace {(index % 3) + 1} horas
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Trending articles "TENDENCIAS" ranking box (Takes 3/12 columns) */}
        <div className="lg:col-span-3 border border-terminal-gray bg-surface-container-low/40 p-4 h-[400px] md:h-[450px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-terminal-gray pb-2 mb-3">
            <span className="font-label-caps text-label-caps text-white font-bold tracking-wider">TENDENCIAS</span>
            <span className="material-symbols-outlined text-system-red text-[16px] animate-pulse">trending_up</span>
          </div>

          <div className="space-y-3.5 overflow-y-auto no-scrollbar flex-grow py-1">
            {trendingArticles.map((art, idx) => (
              <div 
                key={art.id}
                onClick={() => navigateToArticle(art)}
                className="flex items-start gap-3 cursor-pointer group select-none"
              >
                <span className="font-headline-md text-[20px] text-system-red/30 group-hover:text-system-red font-black leading-none mt-0.5 w-6 shrink-0 text-center font-mono">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h4 className="text-[12px] font-bold text-white group-hover:text-system-red transition-colors leading-tight line-clamp-2 uppercase">
                    {art.title}
                  </h4>
                  <span className="text-[9px] text-on-surface-variant font-mono uppercase block mt-0.5">
                    {art.views} LECTURAS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Feed "LO ÚLTIMO" Category Filters Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-gray pb-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-2.5 h-2.5 bg-system-red animate-pulse"></span>
            <h2 className="font-headline-md text-headline-md text-white uppercase font-bold">LO ÚLTIMO</h2>
          </div>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1 font-label-caps text-[9px] tracking-wider transition-all select-none border border-terminal-gray hover:border-system-red font-bold ${
                  activeFilter === cat 
                    ? 'bg-system-red text-black border-system-red' 
                    : 'bg-surface-container/20 text-on-surface-variant hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((art) => (
              <div 
                key={art.id} 
                onClick={() => navigateToArticle(art)}
                className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video relative overflow-hidden border-b border-terminal-gray">
                    <SafeImage
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                      alt={art.title}
                      src={art.image}
                    />
                    <div className="absolute top-2 left-2 bg-black/85 font-label-sm text-label-sm text-white px-2 py-0.5 font-bold uppercase tracking-wider border border-white/10">
                      {art.category}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-system-red font-mono text-[9px] font-bold uppercase">
                      <span>{art.date}</span>
                      <span>•</span>
                      <span>{art.views} visitas</span>
                    </div>
                    <h3 className="font-headline-md text-[14px] mb-2 text-white group-hover:text-system-red transition-colors leading-snug uppercase">
                      {art.title}
                    </h3>
                    <p className="text-on-surface-variant text-[11px] line-clamp-2 leading-relaxed font-body-md">
                      {art.subtitle}
                    </p>
                  </div>
                </div>

                {/* Card footer (with heart likes and comments) */}
                <div className="px-4 pb-4 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[9px] font-mono text-on-surface-variant">
                  <span>POR: {getAuthorName(art.authorId).toUpperCase()}</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => toggleLike(art.id, e)}
                      className={`flex items-center gap-1 hover:text-system-red transition-colors ${
                        likedArticles[art.id] ? 'text-system-red font-bold' : ''
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {likedArticles[art.id] ? 'favorite' : 'favorite_border'}
                      </span>
                      <span>{likedArticles[art.id] ? 13 : 12}</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToArticle(art, '#comentarios-seccion');
                      }}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
                      <span>3</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 border border-dashed border-terminal-gray p-8 text-center text-on-surface-variant font-label-caps text-[11px]">
              [ALERTA: SIN INFORMES REGISTRADOS BAJO ESTA CLASIFICACIÓN]
            </div>
          )}
        </div>
      </section>

      {/* 4. OPINIÓN DESTACADA Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-system-red"></span>
            <h2 className="font-headline-md text-headline-md text-white uppercase font-bold">OPINIÓN DESTACADA</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredOpinions.map((op) => {
            const author = authors.find(auth => auth.id === op.authorId) || {};
            return (
              <div 
                key={op.id} 
                onClick={() => router.push(`/opinion/${op.id}`)}
                className="bg-surface-container/20 border border-terminal-gray hover:border-system-red p-4 transition-all flex gap-4 items-center group cursor-pointer"
              >
                <SafeImage
                  className="w-14 h-14 rounded-full object-cover border-2 border-system-red shrink-0" 
                  alt={author.name}
                  src={author.photo}
                />
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-white font-bold text-[12px] truncate hover:underline uppercase">
                      {author.name}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-blue-500 fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  </div>
                  <h4 className="text-on-surface-variant text-[11px] font-medium italic truncate line-clamp-1 group-hover:text-system-red transition-colors">
                    "{op.quote}"
                  </h4>
                  <div className="text-[9px] text-on-surface-variant font-mono mt-1 uppercase">
                    {op.date}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

