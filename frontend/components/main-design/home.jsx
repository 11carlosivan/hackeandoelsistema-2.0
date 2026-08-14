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

  // Extract unique categories from articles and initialCategories (excluding OPINIÓN)
  const allCategoryNames = [
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

  // parse views string to compare (e.g. "15.4K" -> 15400)
  const parseViews = (viewsStr) => {
    if (!viewsStr) return 0;
    const num = parseFloat(String(viewsStr).replace('K', ''));
    return String(viewsStr).includes('K') ? num * 1000 : num;
  };

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

  const ITEMS_PER_ROW = 4;

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

      {/* 2. Top Featured Split Grid (3-column layout with 30s auto-moving slider) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Hero news slider (Takes 6/12 columns) */}
        {currentHero && (
          <section 
            onClick={() => navigateToArticle(currentHero)}
            className="lg:col-span-12 relative group overflow-hidden border border-terminal-gray bg-surface-container-low h-[400px] md:h-[450px] cursor-pointer flex flex-col justify-end"
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
              
              <h2 className="font-headline-xl text-[24px] md:text-[28px] text-white mb-2.5 leading-snug uppercase group-hover:text-system-red transition-colors font-bold">
                {currentHero.title}
              </h2>
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
      </div>

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

