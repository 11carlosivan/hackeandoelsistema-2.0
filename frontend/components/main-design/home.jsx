'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { articles as fallbackArticles, opinions, authors } from '@/lib/main-design/mock-data';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';
import SafeImage from './safe-image';

export default function Home({ initialArticles, initialCategories = [], summary = null, useMockFallback = true }) {
  const router = useRouter();
  const articles = initialArticles?.length > 0 ? initialArticles : (useMockFallback ? fallbackArticles : []);
  
  // Hero articles (slider on the left)
  const heroArticles = articles.filter(a => a.isHero || a.isFeatured || a.category === 'INVESTIGACIÓN' || a.category === 'POLÍTICA');
  const actualHeroArticles = heroArticles.length > 0 ? heroArticles : articles.slice(0, 4);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const currentHero = actualHeroArticles[currentHeroIndex] || actualHeroArticles[0];

  // Auto-play hero slider every 30 seconds (30,000 ms)
  useEffect(() => {
    if (actualHeroArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % actualHeroArticles.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [actualHeroArticles.length]);

  // Likes state map for feed items
  const [likedArticles, setLikedArticles] = useState({});
  const [articleLikeCounts, setArticleLikeCounts] = useState({});

  // Pagination state per category for the main categories section
  const [categoryPageMap, setCategoryPageMap] = useState({});

  // Dynamic home category and layout configuration from CMS settings
  const [homeConfig, setHomeConfig] = useState({ selectedCategories: null, categoryLayouts: {} });

  useEffect(() => {
    const loadHomeConfig = () => {
      try {
        const stored = localStorage.getItem('hes_home_category_config');
        if (stored) {
          const parsed = JSON.parse(stored);
          setHomeConfig(parsed);
        }
      } catch (_) {}
    };

    loadHomeConfig();

    const handleUpdate = (e) => {
      if (e.detail) setHomeConfig(e.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hes_home_config_updated', handleUpdate);
      return () => window.removeEventListener('hes_home_config_updated', handleUpdate);
    }
  }, []);

  // Extract unique categories from articles and initialCategories (excluding OPINIÓN)
  const defaultCategoryNames = [
    ...new Set(
      [
        ...(initialCategories.map((c) => c.title || c.name)),
        ...articles.map((a) => a.category),
        'POLÍTICA', 'NACIONALES', 'TECNOLOGÍA', 'INTERNACIONAL', 'INVESTIGACIÓN'
      ]
        .filter(Boolean)
        .map((c) => c.toUpperCase())
        .filter((c) => c !== 'OPINIÓN' && c !== 'OPINION')
    )
  ];

  const allCategoryNames = homeConfig.selectedCategories?.length > 0
    ? homeConfig.selectedCategories
    : defaultCategoryNames;

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
    if (e) e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev + 1) % actualHeroArticles.length);
  };

  const handlePrevHero = (e) => {
    if (e) e.stopPropagation();
    setCurrentHeroIndex((prev) => (prev - 1 + actualHeroArticles.length) % actualHeroArticles.length);
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
    const num = parseFloat(String(viewsStr).replace('K', ''));
    return String(viewsStr).includes('K') ? num * 1000 : num;
  };

  // Trending articles (sorted by views desc, top 5)
  const trendingArticles = [...articles]
    .sort((a, b) => parseViews(b.views) - parseViews(a.views))
    .slice(0, 5);

  // All opinions list (both from mock-data opinions and any articles tagged with OPINIÓN)
  const opinionArticlesFromArticles = articles.filter(
    (a) => a.category === 'OPINIÓN' || a.category === 'OPINION'
  );
  
  const formattedMockOpinions = opinions.map((op) => {
    const author = authors.find((auth) => auth.id === op.authorId) || {};
    return {
      id: op.id,
      title: op.title || op.quote,
      quote: op.quote,
      authorName: author.name || 'Columnista',
      authorPhoto: author.photo,
      date: op.date,
      isOpinionItem: true,
      route: `/opinion/${op.id}`
    };
  });

  const formattedArticleOpinions = opinionArticlesFromArticles.map((art) => ({
    id: art.id,
    title: art.title,
    quote: art.subtitle || art.title,
    authorName: getAuthorName(art.authorId),
    authorPhoto: authors.find(auth => auth.id === art.authorId)?.photo || art.image,
    date: art.date,
    isOpinionItem: false,
    route: art.route || `/articulo/${art.id}`
  }));

  // Combined list of opinions
  const allOpinions = [...formattedMockOpinions, ...formattedArticleOpinions];

  const toggleLike = async (article, e) => {
    e.stopPropagation();
    const articleKey = article.id;
    const postId = article.raw?.id;
    const nextLiked = !likedArticles[articleKey];

    setLikedArticles(prev => ({
      ...prev,
      [articleKey]: nextLiked
    }));

    if (!postId) {
      return;
    }

    try {
      const response = await fetch(`${getClientApiBaseUrl()}/api/v1/public/posts/id/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({ liked: nextLiked }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'No se pudo registrar el like.');
      }

      setLikedArticles(prev => ({
        ...prev,
        [articleKey]: Boolean(payload.data?.liked),
      }));
      setArticleLikeCounts(prev => ({
        ...prev,
        [articleKey]: Number(payload.data?.likeCount ?? article.likeCount ?? 0),
      }));
    } catch {
      setLikedArticles(prev => ({
        ...prev,
        [articleKey]: !nextLiked,
      }));
    }
  };

  const formatRelativeTime = (value) => {
    const publishedAt = value ? new Date(value) : null;
    if (!publishedAt || Number.isNaN(publishedAt.getTime())) return 'FECHA PENDIENTE';
    const diffMinutes = Math.max(1, Math.floor((Date.now() - publishedAt.getTime()) / 60000));
    if (diffMinutes < 60) return `${diffMinutes} MIN`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} H`;
    return `${Math.floor(diffHours / 24)} D`;
  };

  const ITEMS_PER_ROW = 7;

  const handleNextCategoryRow = (catName, maxPages) => {
    setCategoryPageMap((prev) => {
      const currentPage = prev[catName] || 0;
      const nextPage = (currentPage + 1) % maxPages;
      return { ...prev, [catName]: nextPage };
    });
  };

  return (
    <div className="space-y-12">
      
      {/* 1. ÚLTIMAS NOTICIAS Bar (Horizontal Marquee News Ticker) */}
      <div className="flex items-center border-y border-x-0 border-terminal-gray bg-surface-container-low/40 h-12 overflow-hidden text-[12px] font-mono select-none -mt-4 -mx-4 lg:-mx-6 mb-8">
        <div className="flex items-center gap-2 bg-system-red text-black px-5 h-full font-bold uppercase shrink-0">
          <span className="material-symbols-outlined text-[18px] animate-pulse">bolt</span>
          <span className="tracking-wider">Últimas Noticias</span>
        </div>
        <div className="relative flex-grow overflow-hidden h-full flex items-center">
          <div className="animate-marquee flex flex-row flex-nowrap items-center gap-12 pl-4 w-max">
            {articles.slice(0, 5).concat(articles.slice(0, 5)).map((art, idx) => (
              <Link 
                key={`${art.id}-${idx}`} 
                href={art.route || `/articulo/${art.id}`} 
                className="hover:text-system-red transition-colors flex items-center gap-2 text-white font-bold whitespace-nowrap shrink-0"
              >
                <span>{art.title.toUpperCase()}</span>
                <span className="text-system-red font-bold text-[10px]">• HACE {formatRelativeTime(art.publishedAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Featured Split Grid (3-column layout: Hero Slider 6 cols + Middle 3 cols + Trending 3 cols) */}
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
            {actualHeroArticles.length > 1 && (
              <div className="absolute top-4 right-4 z-40 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handlePrevHero}
                  title="Anterior (Auto 30s)"
                  className="w-10 h-10 flex items-center justify-center bg-black/70 border border-white/20 hover:border-system-red hover:text-system-red transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-white text-[18px]">chevron_left</span>
                </button>
                <button 
                  onClick={handleNextHero}
                  title="Siguiente (Auto 30s)"
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
                <span className="text-[9px] font-mono text-system-red/80 ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-system-red animate-ping"></span>
                  AUTO-SLIDE 30S
                </span>
              </div>
              
              <h2 className="font-headline-xl text-[22px] md:text-[26px] text-white mb-2 leading-snug uppercase group-hover:text-system-red transition-colors font-bold">
                {currentHero.title}
              </h2>
              <p className="text-[11px] text-on-surface-variant line-clamp-2 font-body-md max-w-xl leading-relaxed">
                {currentHero.subtitle}
              </p>
              <div className="flex items-center gap-3 border-t border-terminal-gray/40 pt-2.5 mt-3 text-[10px] font-mono text-on-surface-variant uppercase">
                <span>Por: {getAuthorName(currentHero.authorId)}</span>
                <span>•</span>
                <span>{currentHero.date}</span>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="absolute bottom-4 right-6 z-30 flex gap-1.5">
              {actualHeroArticles.map((_, idx) => (
                <div 
                  key={idx} 
                  onClick={(e) => { e.stopPropagation(); setCurrentHeroIndex(idx); }}
                  className={`h-1.5 transition-all cursor-pointer ${idx === currentHeroIndex ? 'w-5 bg-system-red' : 'w-1.5 bg-terminal-gray hover:bg-white'}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* Middle Column: Vertical stack of 3 news backdrop cards (Takes 3/12 columns) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-4 h-[400px] md:h-[450px]">
          {middleArticles.map((art) => (
            <div 
              key={art.id}
              onClick={() => navigateToArticle(art)}
              className="relative flex-grow h-[126px] border border-terminal-gray overflow-hidden group cursor-pointer flex flex-col justify-end p-3 bg-surface-container-low"
            >
              <SafeImage
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                alt={art.title}
                src={art.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
              
              <div className="relative z-20">
                <span className="inline-block bg-system-red/90 text-black font-label-caps text-[8px] px-1.5 py-0.2 mb-1 font-bold uppercase">
                  {art.category}
                </span>
                <h3 className="text-white font-bold text-[11px] leading-tight line-clamp-2 uppercase group-hover:text-system-red transition-colors">
                  {art.title}
                </h3>
                <div className="flex items-center gap-2 text-[8px] text-on-surface-variant font-mono uppercase mt-1">
                  <span>Hace {formatRelativeTime(art.publishedAt)}</span>
                </div>
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
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. OPINIÓN DESTACADA Section (Con foto del autor, verificado y título del artículo de opinión) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-system-red"></span>
            <h2 className="font-headline-md text-headline-md text-white uppercase font-bold">OPINIÓN</h2>
            <span className="text-[10px] font-mono text-on-surface-variant border border-terminal-gray px-2 py-0.5">
              {allOpinions.length} COLUMNAS
            </span>
          </div>
          <Link 
            href="/opinion" 
            className="text-[11px] font-mono text-system-red hover:underline flex items-center gap-1 uppercase font-bold"
          >
            <span>Ver todas las opiniones</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allOpinions.map((op) => (
            <div 
              key={op.id} 
              onClick={() => router.push(op.route)}
              className="bg-surface-container/20 border border-terminal-gray hover:border-system-red p-5 transition-all flex gap-4 items-start group cursor-pointer hover:bg-surface-container-low/40 relative overflow-hidden"
            >
              {op.authorPhoto ? (
                <SafeImage
                  className="w-14 h-14 rounded-full object-cover border-2 border-system-red shrink-0" 
                  alt={op.authorName}
                  src={op.authorPhoto}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-system-red/20 border-2 border-system-red flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-system-red text-[24px]">edit_note</span>
                </div>
              )}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-white font-bold text-[13px] truncate uppercase group-hover:text-system-red transition-colors">
                    {op.authorName}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-blue-500 fill-current shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </div>

                {/* Título/Cita de la última columna de opinión */}
                <h4 className="text-white font-bold text-[12px] leading-snug line-clamp-2 mb-1.5 group-hover:text-system-red transition-colors uppercase">
                  {op.title}
                </h4>
                {op.quote && op.quote !== op.title && (
                  <p className="text-on-surface-variant text-[11px] font-medium italic line-clamp-2 mb-2">
                    "{op.quote}"
                  </p>
                )}

                <div className="text-[9px] text-system-red font-mono uppercase flex items-center gap-2 mt-auto">
                  <span>{op.date}</span>
                  <span>•</span>
                  <span className="hover:underline font-bold">Leer columna →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SECCIONES PRINCIPALES POR CATEGORÍA (7 noticias por categoría en patrones alternados según la secuencia solicitada) */}
      <div className="space-y-16">
        {allCategoryNames.map((catName, catIdx) => {
          let categoryArticles = articles.filter((a) => a.category?.toUpperCase() === catName);
          
          // Complete or fallback so every selected category is rendered properly
          if (categoryArticles.length < ITEMS_PER_ROW) {
            const extraArticles = articles.filter(a => a.category?.toUpperCase() !== catName && !categoryArticles.some(c => c.id === a.id));
            categoryArticles = [...categoryArticles, ...extraArticles.slice(0, ITEMS_PER_ROW - categoryArticles.length)];
          }

          const totalPages = Math.ceil(categoryArticles.length / ITEMS_PER_ROW);
          const currentPage = categoryPageMap[catName] || 0;
          const startIndex = currentPage * ITEMS_PER_ROW;
          const visibleCategoryArticles = categoryArticles.slice(startIndex, startIndex + ITEMS_PER_ROW);

          const patternIndex = homeConfig.categoryLayouts && homeConfig.categoryLayouts[catName] !== undefined
            ? Number(homeConfig.categoryLayouts[catName]) % 3
            : catIdx % 3;

          return (
            <section key={catName} className="space-y-6 border-t border-terminal-gray/60 pt-8">
              {/* Category Header with Row Counter and Next Row Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-terminal-gray pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-system-red"></span>
                  <h3 className="font-headline-md text-headline-md text-white uppercase font-bold tracking-wide">
                    {catName}
                  </h3>
                  <span className="bg-surface-container-low border border-terminal-gray text-[10px] font-mono text-on-surface-variant px-2 py-0.5">
                    {categoryArticles.length} PUBLICACIONES
                  </span>
                </div>

                {/* Pagination Controls (Ciclado continuo de filas sin salir de la página) */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    FILA <strong className="text-white">{currentPage + 1}</strong> DE <strong className="text-white">{Math.max(1, totalPages)}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNextCategoryRow(catName, Math.max(1, totalPages))}
                      title="Mover a la siguiente fila de noticias de esta categoría"
                      className="px-3 py-1 bg-surface-container border border-terminal-gray hover:border-system-red text-white hover:text-system-red text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 active:scale-95 select-none cursor-pointer"
                    >
                      <span>Cargar Próxima Fila</span>
                      <span className="material-symbols-outlined text-[14px] text-system-red">autorenew</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic 7-Card Grid Layouts according to exact user sequence */}
              {(() => {
                // CATEGORY PATTERN 1: 3 cards in top row (4 cols each) + 4 small cards in bottom row (3 cols each) = 7 articles
                if (patternIndex === 0) {
                  const topRowArticles = visibleCategoryArticles.slice(0, 3);
                  const bottomRowArticles = visibleCategoryArticles.slice(3, 7);

                  return (
                    <div className="space-y-6">
                      {/* Top Row: 3 Medium Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topRowArticles.map((art, idx) => (
                          <div 
                            key={`${art.id}-top-${idx}`} 
                            onClick={() => navigateToArticle(art)}
                            className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <div className="h-[160px] relative overflow-hidden border-b border-terminal-gray">
                                <SafeImage
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  alt={art.title}
                                  src={art.image}
                                />
                                <div className="absolute top-2 left-2 bg-black/85 text-[9px] text-white px-2 py-0.5 font-bold uppercase border border-white/10">
                                  {art.category}
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-2 text-system-red font-mono text-[9px] font-bold uppercase">
                                  <span>{art.date}</span>
                                </div>
                                <h4 className="font-headline-md text-[14px] mb-2 text-white group-hover:text-system-red transition-colors leading-snug uppercase font-bold line-clamp-2">
                                  {art.title}
                                </h4>
                                <p className="text-on-surface-variant text-[11px] line-clamp-2 leading-relaxed font-body-md">
                                  {art.subtitle}
                                </p>
                              </div>
                            </div>
                            <div className="px-4 pb-3 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[9px] font-mono text-on-surface-variant">
                              <span>POR: {getAuthorName(art.authorId).toUpperCase()}</span>
                              <span className="text-system-red font-bold uppercase">VER</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Row: 4 Small Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {bottomRowArticles.map((art, idx) => (
                          <div 
                            key={`${art.id}-bot-${idx}`} 
                            onClick={() => navigateToArticle(art)}
                            className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <div className="h-[120px] relative overflow-hidden border-b border-terminal-gray">
                                <SafeImage
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  alt={art.title}
                                  src={art.image}
                                />
                                <div className="absolute top-2 left-2 bg-black/85 text-[8px] text-white px-1.5 py-0.5 font-bold uppercase border border-white/10">
                                  {art.category}
                                </div>
                              </div>
                              <div className="p-3">
                                <div className="flex items-center gap-1.5 mb-1 text-system-red font-mono text-[8px] font-bold uppercase">
                                  <span>{art.date}</span>
                                </div>
                                <h5 className="font-headline-md text-[12px] mb-1 text-white group-hover:text-system-red transition-colors leading-tight uppercase font-bold line-clamp-2">
                                  {art.title}
                                </h5>
                              </div>
                            </div>
                            <div className="px-3 pb-2 pt-1.5 border-t border-terminal-gray/30 flex justify-between items-center text-[8px] font-mono text-on-surface-variant">
                              <span className="truncate max-w-[100px]">{getAuthorName(art.authorId).toUpperCase()}</span>
                              <span className="text-system-red font-bold">→</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // CATEGORY PATTERN 2: Opinion Style with Large Card on LEFT (7 cols) + 3 Stacked Cards on Right (5 cols) + 3 Cards Below
                if (patternIndex === 1) {
                  const heroArt = visibleCategoryArticles[0];
                  const sideArts = visibleCategoryArticles.slice(1, 4);
                  const bottomArts = visibleCategoryArticles.slice(4, 7);

                  return (
                    <div className="space-y-6">
                      {/* Top Split: Hero on Left + 3 Stacked Side Cards on Right */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Hero Left Card (7 cols) */}
                        {heroArt && (
                          <div 
                            onClick={() => navigateToArticle(heroArt)}
                            className="md:col-span-7 bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                          >
                            <div className="relative h-[230px] overflow-hidden border-b border-terminal-gray">
                              <SafeImage
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                alt={heroArt.title}
                                src={heroArt.image}
                              />
                              <div className="absolute top-3 left-3 bg-system-red text-black font-label-sm text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
                                {heroArt.category} • DESTACADO
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-2 text-system-red font-mono text-[10px] font-bold uppercase">
                                <span>{heroArt.date}</span>
                              </div>
                              <h4 className="font-headline-md text-[18px] mb-2 text-white group-hover:text-system-red transition-colors leading-snug uppercase font-bold">
                                {heroArt.title}
                              </h4>
                              <p className="text-on-surface-variant text-[12px] line-clamp-2 leading-relaxed">
                                {heroArt.subtitle}
                              </p>
                            </div>
                            <div className="px-5 pb-4 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
                              <span>POR: {getAuthorName(heroArt.authorId).toUpperCase()}</span>
                              <span className="text-system-red font-bold uppercase">LEER ARTÍCULO →</span>
                            </div>
                          </div>
                        )}

                        {/* 3 Stacked Horizontal Cards on Right (5 cols) */}
                        <div className="md:col-span-5 flex flex-col justify-between gap-3">
                          {sideArts.map((art, idx) => (
                            <div 
                              key={`${art.id}-side-${idx}`} 
                              onClick={() => navigateToArticle(art)}
                              className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-row h-[115px]"
                            >
                              <div className="w-2/5 relative overflow-hidden border-r border-terminal-gray">
                                <SafeImage
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0" 
                                  alt={art.title}
                                  src={art.image}
                                />
                              </div>
                              <div className="w-3/5 p-3 flex flex-col justify-between">
                                <div>
                                  <span className="text-system-red font-mono text-[8px] font-bold uppercase block mb-1">
                                    {art.date}
                                  </span>
                                  <h5 className="font-headline-md text-[12px] text-white group-hover:text-system-red transition-colors leading-tight uppercase font-bold line-clamp-2">
                                    {art.title}
                                  </h5>
                                </div>
                                <span className="text-[8px] font-mono text-on-surface-variant uppercase">
                                  POR: {getAuthorName(art.authorId).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Row: 3 Cards (4 cols each) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {bottomArts.map((art, idx) => (
                          <div 
                            key={`${art.id}-b3-${idx}`} 
                            onClick={() => navigateToArticle(art)}
                            className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <div className="h-[135px] relative overflow-hidden border-b border-terminal-gray">
                                <SafeImage
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  alt={art.title}
                                  src={art.image}
                                />
                              </div>
                              <div className="p-3.5">
                                <span className="text-system-red font-mono text-[9px] font-bold uppercase block mb-1">
                                  {art.date}
                                </span>
                                <h5 className="font-headline-md text-[13px] text-white group-hover:text-system-red transition-colors leading-tight uppercase font-bold line-clamp-2">
                                  {art.title}
                                </h5>
                              </div>
                            </div>
                            <div className="px-3.5 pb-3 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[9px] font-mono text-on-surface-variant">
                              <span>POR: {getAuthorName(art.authorId).toUpperCase()}</span>
                              <span className="text-system-red font-bold">VER</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // CATEGORY PATTERN 3: Opinion Style with Large Card on RIGHT (7 cols) + 3 Stacked Cards on Left (5 cols) + 3 Cards Below
                const heroArt = visibleCategoryArticles[0];
                const sideArts = visibleCategoryArticles.slice(1, 4);
                const bottomArts = visibleCategoryArticles.slice(4, 7);

                return (
                  <div className="space-y-6">
                    {/* Top Split: 3 Stacked Cards on Left + Hero Card on Right */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* 3 Stacked Horizontal Cards on Left (5 cols) */}
                      <div className="md:col-span-5 flex flex-col justify-between gap-3">
                        {sideArts.map((art, idx) => (
                          <div 
                            key={`${art.id}-side-l-${idx}`} 
                            onClick={() => navigateToArticle(art)}
                            className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-row h-[115px]"
                          >
                            <div className="w-2/5 relative overflow-hidden border-r border-terminal-gray">
                              <SafeImage
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 absolute inset-0" 
                                alt={art.title}
                                src={art.image}
                              />
                            </div>
                            <div className="w-3/5 p-3 flex flex-col justify-between">
                              <div>
                                <span className="text-system-red font-mono text-[8px] font-bold uppercase block mb-1">
                                  {art.date}
                                </span>
                                <h5 className="font-headline-md text-[12px] text-white group-hover:text-system-red transition-colors leading-tight uppercase font-bold line-clamp-2">
                                  {art.title}
                                </h5>
                              </div>
                              <span className="text-[8px] font-mono text-on-surface-variant uppercase">
                                POR: {getAuthorName(art.authorId).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Hero Right Card (7 cols) */}
                      {heroArt && (
                        <div 
                          onClick={() => navigateToArticle(heroArt)}
                          className="md:col-span-7 bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                        >
                          <div className="relative h-[230px] overflow-hidden border-b border-terminal-gray">
                            <SafeImage
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={heroArt.title}
                              src={heroArt.image}
                            />
                            <div className="absolute top-3 left-3 bg-system-red text-black font-label-sm text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
                              {heroArt.category} • DESTACADO
                            </div>
                          </div>
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-2 text-system-red font-mono text-[10px] font-bold uppercase">
                              <span>{heroArt.date}</span>
                            </div>
                            <h4 className="font-headline-md text-[18px] mb-2 text-white group-hover:text-system-red transition-colors leading-snug uppercase font-bold">
                              {heroArt.title}
                            </h4>
                            <p className="text-on-surface-variant text-[12px] line-clamp-2 leading-relaxed">
                              {heroArt.subtitle}
                            </p>
                          </div>
                          <div className="px-5 pb-4 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
                            <span>POR: {getAuthorName(heroArt.authorId).toUpperCase()}</span>
                            <span className="text-system-red font-bold uppercase">LEER ARTÍCULO →</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: 3 Cards (4 cols each) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {bottomArts.map((art, idx) => (
                        <div 
                          key={`${art.id}-b3-r-${idx}`} 
                          onClick={() => navigateToArticle(art)}
                          className="bg-surface-container-low border border-terminal-gray hover:border-system-red transition-all group cursor-pointer overflow-hidden flex flex-col justify-between"
                        >
                          <div>
                            <div className="h-[135px] relative overflow-hidden border-b border-terminal-gray">
                              <SafeImage
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                alt={art.title}
                                src={art.image}
                              />
                            </div>
                            <div className="p-3.5">
                              <span className="text-system-red font-mono text-[9px] font-bold uppercase block mb-1">
                                {art.date}
                              </span>
                              <h5 className="font-headline-md text-[13px] text-white group-hover:text-system-red transition-colors leading-tight uppercase font-bold line-clamp-2">
                                {art.title}
                              </h5>
                            </div>
                          </div>
                          <div className="px-3.5 pb-3 pt-2 border-t border-terminal-gray/30 flex justify-between items-center text-[9px] font-mono text-on-surface-variant">
                            <span>POR: {getAuthorName(art.authorId).toUpperCase()}</span>
                            <span className="text-system-red font-bold">VER</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>
          );
        })}
      </div>

    </div>
  );
}


