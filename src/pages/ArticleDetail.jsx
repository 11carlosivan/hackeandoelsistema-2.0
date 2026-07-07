import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { articles, authors, comments as initialComments } from '../data/mockData';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find the article
  const article = articles.find(art => art.id === id) || articles[0];
  const author = authors.find(auth => auth.id === article.authorId) || authors[0];

  // Comments state
  const [commentsList, setCommentsList] = useState(initialComments[article.id] || []);
  const [newCommentUser, setNewCommentUser] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Handle comment submit
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const userSignature = newCommentUser.trim() || 'ANONYMOUS_USER';
    const newComment = {
      id: `c_${Date.now()}`,
      user: userSignature.toUpperCase().replace(/\s+/g, '_'),
      date: 'JUST NOW',
      text: newCommentText.trim()
    };

    setCommentsList([...commentsList, newComment]);
    setNewCommentText('');
    setNewCommentUser('');
  };

  // Copy link state
  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Like, Save and Share Toolbar states
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    // Reset states when article changes
    setIsLiked(false);
    setIsSaved(false);
    setShowShareMenu(false);
    
    // Parse views count to estimate realistic likes
    const viewStr = article.views || "10.0K";
    const numericViews = parseFloat(viewStr.replace('K', '')) * (viewStr.includes('K') ? 1000 : 1);
    const initialLikes = Math.floor(numericViews * 0.02) + 24;
    setLikeCount(initialLikes);
  }, [article.id]);

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const scrollToComments = () => {
    const commentsSection = document.getElementById('comentarios-seccion');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Related articles (filter same category, excluding current)
  const relatedArticles = articles
    .filter(art => art.category === article.category && art.id !== article.id)
    .slice(0, 3);

  // More investigations (excluding current)
  const moreInvestigations = articles
    .filter(art => art.id !== article.id)
    .slice(0, 2);

  return (
    <div className="w-full bg-background text-on-surface">
      
      {/* Article Hero Banner */}
      <section className="relative w-full h-[50vh] md:h-[70vh] flex items-end border border-terminal-gray mb-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <img 
            className="w-full h-full object-cover" 
            alt={article.title}
            src={article.image}
          />
        </div>
        
        <div className="relative z-20 px-6 md:px-12 pb-12 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-system-red text-black font-bold px-3 py-1 font-label-caps text-[12px]">
              {article.category}
            </span>
            {article.tag && (
              <span className="font-label-caps text-[12px] text-system-red border border-system-red/50 px-3 py-1 tracking-widest">
                [{article.tag}]
              </span>
            )}
          </div>
          
          <h1 className="font-headline-xl text-[36px] md:text-headline-xl text-white mb-4 leading-tight uppercase">
            {article.title}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl">
            {article.subtitle}
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-on-surface-variant border-t border-white/10 pt-6">
            <div className="flex items-center gap-3">
              <Link to={`/perfil/${author.id}`}>
                <img 
                  className="w-10 h-10 rounded-full border border-system-red overflow-hidden hover:opacity-85" 
                  alt={author.name}
                  src={author.photo}
                />
              </Link>
              <div>
                <div className="font-label-caps text-[10px] text-system-red">AUTOR / AGENTE</div>
                <Link to={`/perfil/${author.id}`} className="font-bold text-white hover:underline">
                  {author.name.toUpperCase()}
                </Link>
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div>
              <div className="font-label-caps text-[10px]">FECHA DE EMISIÓN</div>
              <div className="text-white text-[13px] font-label-caps">{article.date}</div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div>
              <div className="font-label-caps text-[10px]">TIEMPO DE LECTURA</div>
              <div className="text-white text-[13px] font-label-caps">{article.readTime}</div>
            </div>
            
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div>
              <div className="font-label-caps text-[10px]">VISTAS TERMINAL</div>
              <div className="text-white text-[13px] font-label-caps">{article.views}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2 md:px-0 w-full">
        
        {/* Article Body */}
        <article className="lg:col-start-2 lg:col-span-7 col-span-12 space-y-10">
          
          {article.content && article.content.map((block, index) => {
            if (block.type === 'paragraph') {
              // Apply dropcap to first paragraph
              const isFirst = index === 0;
              return (
                <p 
                  key={index} 
                  className={`text-body-md text-on-surface-variant leading-relaxed ${
                    isFirst 
                      ? 'text-body-lg first-letter:text-6xl first-letter:font-headline-xl first-letter:text-system-red first-letter:mr-3 first-letter:float-left' 
                      : ''
                  }`}
                >
                  {block.text}
                </p>
              );
            }
            
            if (block.type === 'blockquote') {
              return (
                <blockquote 
                  key={index} 
                  className="border-l-4 border-system-red bg-surface-container-low p-10 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-[80px]">format_quote</span>
                  </div>
                  <p className="font-headline-md text-headline-md text-white italic mb-4 relative z-10">
                    "{block.text}"
                  </p>
                  {block.author && (
                    <cite className="font-label-caps text-label-caps text-system-red block">
                      — {block.author.toUpperCase()}
                    </cite>
                  )}
                </blockquote>
              );
            }

            if (block.type === 'gallery') {
              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                  {block.images.map((img, imgIdx) => (
                    <div key={imgIdx} className="relative aspect-video overflow-hidden border border-terminal-gray group">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        alt={img.caption}
                        src={img.url}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/80 glass-terminal text-[10px] font-label-caps text-on-surface">
                        {img.caption}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            
            return null;
          })}

          {/* Verification Audit Section */}
          {article.veracity && (
            <div className="border border-terminal-gray p-6 bg-surface-container/20">
              <div className="flex items-center gap-2 mb-4 text-system-red">
                <span className="material-symbols-outlined">security_update_good</span>
                <span className="font-label-caps text-label-caps">AUDITORÍA DE VERACIDAD (H.E.S ANALYTICS)</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] font-label-caps text-on-surface-variant mb-1">
                    <span>Cotejo de Hechos (Fact-Checking)</span>
                    <span className="text-white font-bold">{article.veracity.factCheck}%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-gray">
                    <div className="h-full bg-system-red" style={{ width: `${article.veracity.factCheck}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-[11px] font-label-caps text-on-surface-variant mb-1">
                    <span>Fiabilidad de Fuentes</span>
                    <span className="text-white font-bold">{article.veracity.sourceCheck}%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-gray">
                    <div className="h-full bg-system-red" style={{ width: `${article.veracity.sourceCheck}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-[11px] font-label-caps text-on-surface-variant mb-1">
                    <span>Análisis Algorítmico IA</span>
                    <span className="text-white font-bold">{article.veracity.aiAnalysis}%</span>
                  </div>
                  <div className="h-1.5 bg-terminal-gray">
                    <div className="h-full bg-system-red" style={{ width: `${article.veracity.aiAnalysis}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Social Action Toolbar (Matching user wireframe) */}
          <div className="flex flex-wrap items-center justify-between gap-6 py-4 px-6 border border-terminal-gray bg-surface-container-low/40 text-[13px] font-label-caps text-on-surface-variant mb-8 relative select-none">
            <div className="flex items-center gap-8">
              {/* Like Button */}
              <button 
                onClick={handleLike} 
                className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-system-red font-bold' : 'hover:text-white'}`}
                title="Me gusta"
              >
                <span className="material-symbols-outlined text-[20px] fill-current">thumb_up</span>
                <span className={isLiked ? 'text-system-red' : 'text-on-surface-variant'}>{likeCount}</span>
              </button>

              {/* Comment Button (Scrolls to Comments section) */}
              <button 
                onClick={scrollToComments} 
                className="flex items-center gap-2 hover:text-white transition-colors"
                title="Ir a los comentarios"
              >
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                <span>{commentsList.length}</span>
              </button>

              {/* Share Button with Popover */}
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)} 
                  className={`flex items-center gap-2 transition-colors ${showShareMenu ? 'text-system-red font-bold' : 'hover:text-white'}`}
                  title="Compartir"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                  <span>Compartir</span>
                </button>
                
                {showShareMenu && (
                  <div className="absolute bottom-10 left-0 bg-background border border-terminal-gray p-2 flex gap-2 z-30 shadow-[0_0_12px_rgba(0,0,0,0.5)]">
                    {/* Facebook Share */}
                    <a 
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 border border-terminal-gray hover:border-system-red hover:text-system-red flex items-center justify-center transition-colors"
                      title="Compartir en Facebook"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V1H13c-2.8 0-5 2.2-5 5v2z"/>
                      </svg>
                    </a>
                    {/* WhatsApp Share */}
                    <a 
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' - ' + window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 border border-terminal-gray hover:border-system-red hover:text-system-red flex items-center justify-center transition-colors"
                      title="Compartir en WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.202-1.362a9.92 9.92 0 0 0 4.808 1.246h.005c5.505 0 9.99-4.478 9.99-9.986C22.005 6.478 17.518 2 12.012 2zm6.009 14.425c-.247.697-1.246 1.36-1.712 1.455-.466.096-.944.137-2.915-.658-2.52-1.018-4.103-3.6-4.23-3.77-.127-.17-1.02-1.356-1.02-2.585 0-1.23.637-1.83.864-2.078.226-.249.494-.312.658-.312.165 0 .33.003.473.01.15.007.35-.03.547.447.197.48.677 1.65.735 1.77.058.12.098.26.019.414-.079.156-.118.254-.236.39-.118.137-.25.305-.357.41-.12.117-.245.244-.106.48.138.238.614 1.01 1.314 1.632.902.802 1.66 1.05 1.89 1.168.23.117.362.1.495-.05.133-.153.585-.68.742-.912.157-.23.315-.19.53-.11.215.08 1.362.64 1.597.76.236.118.393.177.45.277.058.1.058.58-.19 1.277z"/>
                      </svg>
                    </a>
                    {/* Copy Link */}
                    <button 
                      onClick={handleCopyLink}
                      className="w-8 h-8 border border-terminal-gray hover:border-system-red hover:text-system-red flex items-center justify-center relative transition-colors"
                      title="Copiar Enlace"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      {copied && (
                        <span className="absolute -top-8 bg-system-red text-black text-[9px] px-2 py-0.5 font-bold uppercase whitespace-nowrap animate-pulse border border-system-red">
                          COPIADO
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Save / Bookmark Button */}
            <button 
              onClick={handleSave} 
              className={`flex items-center gap-2 transition-colors ${isSaved ? 'text-data-green font-bold' : 'hover:text-white'}`}
              title="Guardar informe"
            >
              <span className={`material-symbols-outlined text-[20px] ${isSaved ? 'text-data-green fill-current' : ''}`}>
                {isSaved ? 'bookmark_added' : 'bookmark'}
              </span>
              <span>{isSaved ? 'Guardado' : 'Guardar'}</span>
            </button>
          </div>
          
        </article>

        {/* Sidebar */}
        <aside className="lg:col-start-10 lg:col-span-3 col-span-12 space-y-12 lg:sticky lg:top-36">
          
          {/* Ad Space */}
          <div className="p-6 bg-surface-container border border-terminal-gray relative overflow-hidden group cursor-pointer">
            <div className="absolute top-0 right-0 p-2 opacity-30 text-[10px] font-label-caps">ID_ANUNCIO: 992-X</div>
            <div className="text-system-red font-headline-md text-[18px] mb-2 uppercase">PROTEJA SU TERMINAL</div>
            <p className="text-[12px] text-on-surface-variant mb-4 font-body-md leading-relaxed">
              VPN de grado militar con cifrado cuántico. Indetectable por agentes de escaneo Aegis-9.
            </p>
            <button className="w-full border border-system-red text-system-red py-2 text-[11px] font-label-caps hover:bg-system-red hover:text-background transition-all font-bold active:scale-95">
              ADQUIRIR ACCESO
            </button>
          </div>

          {/* Related Intelligence */}
          {relatedArticles.length > 0 && (
            <div>
              <div className="flex items-center justify-between border-b border-system-red pb-2 mb-6">
                <span className="font-label-caps text-label-caps text-white">INTEL RELACIONADO</span>
                <span className="material-symbols-outlined text-system-red text-[16px]">hub</span>
              </div>
              <div className="space-y-6">
                {relatedArticles.map((art) => (
                  <Link key={art.id} to={`/articulo/${art.id}`} className="group block">
                    <div className="text-system-red font-label-caps text-[10px] mb-1">{art.date}</div>
                    <h4 className="text-white font-bold leading-tight group-hover:text-system-red transition-colors">
                      {art.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Author Profile Card (From user request) */}
          <div className="border border-terminal-gray bg-surface-container-low overflow-hidden">
            {/* Banner */}
            <div className="h-28 bg-gradient-to-r from-red-950/60 to-black relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-system-red/10 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-grid opacity-15"></div>
            </div>

            {/* Profile Avatar & Verified */}
            <div className="px-6 pb-6 relative">
              <div className="relative w-20 h-20 -mt-10 mb-3 inline-block">
                <img 
                  className="w-full h-full rounded-full object-cover border-2 border-terminal-gray bg-surface-container" 
                  alt={author.name}
                  src={author.photo}
                />
                <span className="absolute bottom-0 right-1 w-4 h-4 bg-data-green rounded-full border-2 border-surface-container-low" title="Activo en la Red"></span>
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="text-white font-bold text-headline-sm uppercase tracking-tight">
                  {author.name}
                </h3>
                <span className="material-symbols-outlined text-[16px] text-blue-500 fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant font-mono mb-4">
                {author.username || `@${author.id.replace(/-/g, '_')}`}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 border-y border-terminal-gray py-3 mb-4 text-center font-mono">
                <div>
                  <div className="text-white text-body-md font-bold">{author.stats?.comments || "120"}</div>
                  <div className="text-[9px] text-on-surface-variant font-label-caps uppercase">Comentarios</div>
                </div>
                <div>
                  <div className="text-white text-body-md font-bold">{author.stats?.likes || "240"}</div>
                  <div className="text-[9px] text-on-surface-variant font-label-caps uppercase">Me gusta</div>
                </div>
                <div>
                  <div className="text-white text-body-md font-bold">{author.stats?.posts || "45"}</div>
                  <div className="text-[9px] text-on-surface-variant font-label-caps uppercase">Publicaciones</div>
                </div>
              </div>

              {/* Bio & Details */}
              <p className="text-[12px] text-on-surface-variant mb-4 font-body-md leading-relaxed">
                {author.bio}
              </p>

              <div className="space-y-1.5 text-[11px] text-on-surface-variant font-mono mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  <span>{author.location || "Santo Domingo, RD"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  <a href={`https://${author.website || 'hackeandoelsistema.net'}`} target="_blank" rel="noreferrer" className="hover:text-system-red hover:underline">
                    {author.website || "hackeandoelsistema.net"}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>{author.memberSince || "Miembro desde enero 2023"}</span>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/perfil/${author.id}`)}
                className="w-full border border-system-red text-system-red py-2 text-[11px] font-label-caps hover:bg-system-red hover:text-background transition-all font-bold active:scale-95 text-center uppercase"
              >
                VER PERFIL COMPLETO
              </button>
            </div>
          </div>

          {/* Únete al Network Block */}
          <div className="p-6 border border-terminal-gray bg-surface-container/20">
            <h3 className="font-headline-md text-[18px] text-white mb-2 uppercase">
              ÚNETE AL NETWORK
            </h3>
            <p className="text-[12px] text-on-surface-variant mb-4 font-body-md leading-relaxed">
              Crea tu cuenta gratuita y forma parte de nuestra comunidad.
            </p>
            
            <button 
              onClick={() => navigate('/secure-contact')}
              className="w-full bg-system-red text-black py-2.5 text-[11px] font-label-caps hover:bg-white hover:text-black transition-all font-bold active:scale-95 text-center uppercase mb-4"
            >
              CREAR CUENTA
            </button>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                {authors.slice(0, 6).map((auth) => (
                  <img 
                    key={auth.id} 
                    className="inline-block h-6 w-6 rounded-full ring-2 ring-background object-cover" 
                    src={auth.photo} 
                    alt={auth.name} 
                  />
                ))}
              </div>
              <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider font-bold">
                +5K MIEMBROS
              </span>
            </div>
          </div>

        </aside>
      </div>

      {/* Bottom Section: Comments & More Content */}
      <section id="comentarios-seccion" className="bg-surface-container-lowest border border-terminal-gray py-12 px-6 md:px-12 mt-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Comments Terminal */}
          <div className="mb-16">
            <h2 className="font-headline-md text-headline-md text-white flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-system-red">forum</span> 
              COMENTARIOS DE LA RED
            </h2>
            
            <div className="space-y-6">
              {commentsList.length > 0 ? (
                commentsList.map((comm) => (
                  <div key={comm.id} className="p-4 border-l-2 border-terminal-gray bg-surface-container/60">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-label-caps text-[10px] text-system-red font-bold">
                        USUARIO: {comm.user}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-label-caps">
                        {comm.date}
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface leading-relaxed">
                      {comm.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center border border-dashed border-terminal-gray text-on-surface-variant text-label-caps text-[12px]">
                  No hay comentarios registrados en este nodo.
                </div>
              )}

              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="mt-8 border border-terminal-gray p-6 bg-black/20">
                <div className="font-label-caps text-[10px] text-on-surface-variant mb-4">
                  ESTABLECIENDO CONEXIÓN SEGURA PARA COMENTAR...
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="FIRMA DE USUARIO (O ANÓNIMO)"
                    className="w-full bg-matrix-dim border-b border-terminal-gray border-t-0 border-x-0 focus:ring-0 focus:border-system-red text-body-md p-3 text-white placeholder:opacity-30 font-label-caps text-[12px]"
                    value={newCommentUser}
                    onChange={(e) => setNewCommentUser(e.target.value)}
                  />
                </div>
                
                <textarea 
                  className="w-full bg-matrix-dim border-b border-terminal-gray border-t-0 border-x-0 focus:ring-0 focus:border-system-red text-body-md p-4 mb-4 text-white placeholder:opacity-30" 
                  placeholder="Escriba su mensaje encriptado aquí..."
                  rows="3"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  required
                ></textarea>
                
                <button 
                  type="submit"
                  className="bg-system-red text-black px-6 py-2.5 font-label-caps text-label-caps font-bold hover:bg-white hover:text-black transition-all active:scale-95"
                >
                  ENVIAR ENCRIPTADO
                </button>
              </form>
            </div>
          </div>

          {/* Recommended Investigations */}
          <div>
            <h2 className="font-headline-md text-headline-md text-white mb-8 border-b border-terminal-gray pb-2 uppercase">
              Más Investigaciones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {moreInvestigations.map((art) => (
                <div 
                  key={art.id} 
                  onClick={() => navigate(`/articulo/${art.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="aspect-video overflow-hidden mb-4 border border-terminal-gray">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                      alt={art.title}
                      src={art.image}
                    />
                  </div>
                  <div className="text-system-red font-label-caps text-[10px] mb-2 font-bold">
                    {art.category} {art.tag && ` / ${art.tag}`}
                  </div>
                  <h3 className="font-headline-md text-[20px] text-white group-hover:text-system-red transition-colors leading-snug">
                    {art.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </section>

    </div>
  );
}
