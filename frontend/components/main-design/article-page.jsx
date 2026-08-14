import Link from 'next/link';
import { articles as fallbackArticles, authors as fallbackAuthors, comments as fallbackComments } from '@/lib/main-design/mock-data';
import { getAuthorName } from '@/lib/main-design/authors';
import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import { ArticleListItem } from './content-primitives';
import ArticleEngagement from './article-engagement';
import ArticleAudioPlayer from './article-audio-player';
import ArticleViewTracker from './article-view-tracker';
import SafeImage from './safe-image';
import ArticleAudioPlayer from './article-audio-player';

function renderBlock(block, index) {
  if (block.type === 'blockquote') {
    return (
      <blockquote key={index} className="border-l-4 border-system-red bg-surface-container-low p-6 md:p-8">
        <p className="font-headline-md text-2xl text-white italic leading-tight">"{block.text}"</p>
        {block.author && (
          <cite className="font-label-caps text-system-red text-[10px] block mt-4">
            {block.author.toUpperCase()}
          </cite>
        )}
      </blockquote>
    );
  }

  if (block.type === 'gallery') {
    return (
      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {block.images.map((image) => (
          <figure key={image.url} className="border border-terminal-gray bg-black overflow-hidden">
            <SafeImage className="w-full aspect-video object-cover" alt={image.caption} src={image.url} />
            <figcaption className="p-3 text-[10px] font-label-caps text-on-surface-variant">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }

  return (
    <p key={index} className="text-on-surface-variant text-body-md leading-relaxed">
      {block.text}
    </p>
  );
}

export default function ArticlePage({ articleId }) {
  const article = fallbackArticles.find((item) => item.id === articleId) || fallbackArticles[0];
  const related = fallbackArticles
    .filter((item) => item.category === article.category && item.id !== article.id)
    .slice(0, 3);

  return (
    <ArticlePageView
      article={article}
      authors={fallbackAuthors}
      comments={fallbackComments[article.id] || []}
      related={related}
    />
  );
}

export function ArticlePageView({ article, author: providedAuthor = null, authors = [], comments = [], related = [] }) {
  const author = providedAuthor || authors.find((item) => item.id === article.authorId) || {
    id: article.authorId || 'redaccion-hes',
    name: article.authorName || 'Redaccion',
    role: 'Equipo editorial',
    photo: '/isotipo.png',
  };
  const articleComments = comments.length > 0 ? comments : article.comments || [];
  const relatedArticles = related.length > 0 ? related : article.related || [];
  const safeContentHtml = article.contentHtml ? sanitizeEditorialHtml(article.contentHtml) : null;
  const trackedPostId = article.postId || article.raw?.id;

  return (
    <div className="w-full bg-background text-on-surface">
      <ArticleViewTracker postId={trackedPostId} />
      <article>
        <section className="relative min-h-[56vh] border border-terminal-gray overflow-hidden flex items-end mb-10">
          <SafeImage className="absolute inset-0 w-full h-full object-cover" alt={article.title} src={article.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/70 to-black/20" />
          <div className="absolute inset-0 scanline opacity-15 pointer-events-none" />

          <div className="relative z-10 p-6 md:p-10 max-w-5xl">
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Link
                href={article.categoryPath || `/category/${encodeURIComponent(String(article.category || '').toLowerCase())}/`}
                className="bg-system-red text-black font-label-caps text-[10px] px-3 py-1 font-bold"
              >
                {article.category}
              </Link>
              {article.tag && (
                <span className="border border-system-red/60 text-system-red font-label-caps text-[10px] px-3 py-1">
                  {article.tag}
                </span>
              )}
            </div>

            <h1 className="font-headline-xl text-4xl md:text-[56px] text-white uppercase leading-none tracking-tight">
              {article.title}
            </h1>
            <p className="text-on-surface-variant text-lg max-w-3xl mt-5 leading-relaxed">
              {article.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 border-t border-terminal-gray/60 mt-7 pt-5 text-[10px] font-label-caps text-on-surface-variant">
              <Link href={article.authorPath || `/perfil/${author.id}`} className="flex items-center gap-3 hover:text-system-red">
                <SafeImage className="w-9 h-9 rounded-full object-cover border border-system-red" alt={author.name} src={author.photo} />
              <span>{(article.authorName || getAuthorName(article.authorId)).toUpperCase()}</span>
              </Link>
              <span>/</span>
              <span>{article.date}</span>
              <span>/</span>
              <span>{article.readTime || 'LECTURA'}</span>
              <span>/</span>
              <span className="text-system-red font-bold inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">visibility</span>
                {article.views || '0'} VISTAS
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="border border-terminal-gray bg-surface-container-low/20 p-6 md:p-8 space-y-7">
              <ArticleAudioPlayer
                title={article.title}
                contentText={article.contentText}
                contentHtml={article.contentHtml}
              />

              {safeContentHtml ? (
                <div
                  className="editorial-content"
                  dangerouslySetInnerHTML={{ __html: safeContentHtml }}
                />
              ) : (
                (article.content || []).map(renderBlock)
              )}
            </div>

            {article.veracity && (
              <section className="border border-terminal-gray bg-black/20 p-6">
                <h2 className="font-label-caps text-system-red text-[11px] font-bold mb-4">
                  AUDITORIA DE VERACIDAD
                </h2>
                {Object.entries(article.veracity).map(([label, value]) => (
                  <div key={label} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-[10px] font-label-caps text-on-surface-variant mb-1">
                      <span>{label.toUpperCase()}</span>
                      <span className="text-white">{value}%</span>
                    </div>
                    <div className="h-1.5 bg-terminal-gray">
                      <div className="h-full bg-system-red" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            )}

            <ArticleEngagement article={article} />

            <section id="comentarios-seccion" className="border border-terminal-gray bg-surface-container-low/20 p-6">
              <h2 className="font-headline-md text-2xl text-white uppercase mb-5">Comentarios de la red</h2>
              <div className="space-y-4">
                {articleComments.length > 0 ? (
                  articleComments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-system-red bg-black/20 p-4">
                      <div className="flex justify-between gap-4 font-label-caps text-[10px] text-system-red mb-2">
                        <span>{comment.user}</span>
                        <span>{comment.date}</span>
                      </div>
                      <p className="text-on-surface-variant text-sm">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-on-surface-variant text-sm">No hay comentarios registrados en este nodo.</p>
                )}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-36 self-start">
            <div className="border border-terminal-gray bg-surface-container-low p-6">
              <h2 className="font-headline-md text-xl text-white uppercase mb-3">Agente</h2>
              <Link href={article.authorPath || `/perfil/${author.id}`} className="flex items-center gap-4 group">
                <SafeImage className="w-14 h-14 rounded-full object-cover border border-system-red" alt={author.name} src={author.photo} />
                <div>
                  <div className="font-bold text-white group-hover:text-system-red">{author.name}</div>
                  <div className="text-[10px] font-label-caps text-on-surface-variant">{author.role}</div>
                </div>
              </Link>
            </div>

            <div className="space-y-4">
              <h2 className="font-headline-md text-xl text-white uppercase border-b border-terminal-gray pb-2">
                Relacionado
              </h2>
              {relatedArticles.length > 0 ? (
                relatedArticles.map((item) => (
                  <ArticleListItem key={item.id} article={item} />
                ))
              ) : (
                <p className="border border-terminal-gray bg-surface-container-low/20 p-5 text-sm text-on-surface-variant">
                  No hay publicaciones relacionadas disponibles para este informe.
                </p>
              )}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
