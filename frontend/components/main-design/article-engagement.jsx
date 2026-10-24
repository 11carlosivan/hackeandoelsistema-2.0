'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import AuthModal from '@/components/user/AuthModal';
import { fetchWithCsrfRetry } from './client-security';

function safeCount(value) {
  const number = Number(value || 0);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

async function requestJson(path, options = {}) {
  const apiBaseUrl = getClientApiBaseUrl();
  const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || 'Operacion no disponible.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

export default function ArticleEngagement({ article, initialComments = [] }) {
  const postId = article?.raw?.id || article?.postId;
  const articleUrl = useMemo(() => {
    if (typeof window === 'undefined') return article?.route || '/';
    return new URL(article?.route || window.location.pathname, window.location.origin).href;
  }, [article?.route]);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [engagementLoaded, setEngagementLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState('interactuar');
  const [counts, setCounts] = useState({
    likes: safeCount(article?.likeCount),
    saves: safeCount(article?.saveCount),
    shares: safeCount(article?.shareCount),
    comments: safeCount(article?.commentCount || initialComments?.length),
  });
  const [status, setStatus] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [commentsList, setCommentsList] = useState(
    initialComments.length > 0 ? initialComments : article?.comments || [],
  );
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState('');

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;
    setEngagementLoaded(false);

    requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/engagement`)
      .then((payload) => {
        if (cancelled) return;

        setLiked(Boolean(payload.data?.liked));
        setSaved(Boolean(payload.data?.saved));
        setAuthenticated(Boolean(payload.data?.authenticated));
        setCounts((current) => ({
          ...current,
          likes: safeCount(payload.data?.counts?.likes),
          saves: safeCount(payload.data?.counts?.saves),
          shares: safeCount(payload.data?.counts?.shares),
          comments: safeCount(payload.data?.counts?.comments ?? current.comments),
        }));
        setEngagementLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setEngagementLoaded(true);
        }
      });

    requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`)
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.data) && payload.data.length > 0) {
          setCommentsList(payload.data.map((c) => ({
            id: c.id,
            parentId: c.parentId || null,
            user: c.user || 'Lector',
            text: c.text,
            date: c.date ? new Date(c.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' }) : 'Reciente',
          })));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const requireAuth = (actionName) => {
    if (!engagementLoaded) {
      setStatus('Validando sesion...');
      return false;
    }

    if (!authenticated) {
      setAuthAction(actionName);
      setShowAuthModal(true);
      return false;
    }

    return true;
  };

  const toggleLike = async () => {
    if (!postId) return;
    if (!requireAuth('dar me gusta')) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)) }));

    try {
      const payload = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        body: JSON.stringify({ liked: nextLiked }),
      });
      setLiked(Boolean(payload.data?.liked));
      setCounts((current) => ({ ...current, likes: safeCount(payload.data?.likeCount ?? current.likes) }));
    } catch (error) {
      if (error.status === 401) {
        setLiked(!nextLiked);
        setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
        setAuthenticated(false);
        setAuthAction('dar me gusta');
        setShowAuthModal(true);
        return;
      }

      setLiked(!nextLiked);
      setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
      setStatus(error.message);
    }
  };

  const toggleSave = async () => {
    if (!postId) return;
    if (!requireAuth('guardar articulos')) return;

    const nextSaved = !saved;

    try {
      const payload = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/save`, {
        method: 'POST',
        body: JSON.stringify({ saved: nextSaved }),
      });
      setSaved(Boolean(payload.data?.saved));
      setAuthenticated(true);
      setCounts((current) => ({ ...current, saves: safeCount(payload.data?.saveCount ?? current.saves) }));
      setStatus(nextSaved ? 'Guardado en tu cuenta.' : 'Quitado de guardados.');
    } catch (error) {
      if (error.status === 401) {
        setAuthenticated(false);
        setAuthAction('guardar articulos');
        setShowAuthModal(true);
      } else {
        setStatus(error.message);
      }
    }
  };

  const shareArticle = async (channel = 'native') => {
    if (!postId) return;

    try {
      let shareChannel = channel;

      if (channel === 'native' && navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.subtitle,
          url: articleUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(articleUrl);
        shareChannel = 'copy';
      }

      const payload = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/share`, {
        method: 'POST',
        body: JSON.stringify({ channel: shareChannel }),
      });
      setCounts((current) => ({ ...current, shares: safeCount(payload.data?.shareCount ?? current.shares + 1) }));
      setStatus(shareChannel === 'copy' ? 'Enlace copiado.' : 'Compartido registrado.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!postId || submittingComment) return;
    if (!requireAuth('dejar comentarios')) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const textBody = String(formData.get('body') || '').trim();
    if (!textBody) return;

    setSubmittingComment(true);
    setCommentStatus('');

    try {
      const response = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: textBody }),
      });

      form.reset();
      const newComment = {
        id: response.data?.comment?.id || String(Date.now()),
        parentId: null,
        user: response.data?.comment?.user || 'Tú',
        text: response.data?.comment?.text || textBody,
        date: 'Reciente',
      };
      setCommentsList((prev) => [...prev, newComment]);
      setCounts((current) => ({ ...current, comments: current.comments + 1 }));
      setCommentStatus(response.data?.moderation?.message || 'Comentario publicado con éxito.');
    } catch (error) {
      setCommentStatus(error.status === 401 ? 'Inicia sesion para comentar.' : error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStartReply = (comment) => {
    if (!requireAuth('responder a este comentario')) return;
    setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, user: comment.user });
    setReplyText('');
    setReplyStatus('');
  };

  const submitReply = async (event, parentComment) => {
    event.preventDefault();
    if (!postId || submittingReply) return;
    if (!requireAuth('responder a este comentario')) return;

    const textBody = replyText.trim();
    if (!textBody) return;

    setSubmittingReply(true);
    setReplyStatus('');

    try {
      const response = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: textBody, parentId: parentComment.id }),
      });

      const newReply = {
        id: response.data?.comment?.id || String(Date.now()),
        parentId: parentComment.id,
        user: response.data?.comment?.user || 'Tú',
        text: response.data?.comment?.text || textBody,
        date: 'Reciente',
      };
      setCommentsList((prev) => [...prev, newReply]);
      setCounts((current) => ({ ...current, comments: current.comments + 1 }));
      setReplyText('');
      setReplyingTo(null);
      setReplyStatus('Respuesta publicada con éxito.');
    } catch (error) {
      setReplyStatus(error.status === 401 ? 'Inicia sesion para responder.' : error.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  if (!postId) {
    return null;
  }

  const topLevelComments = commentsList.filter((c) => !c.parentId);
  const getThreadReplies = (rootId) => {
    const list = [];
    const visited = new Set();
    const collect = (pid) => {
      for (const c of commentsList) {
        if (c.parentId === pid && !visited.has(c.id)) {
          visited.add(c.id);
          list.push(c);
          collect(c.id);
        }
      }
    };
    collect(rootId);
    return list;
  };

  return (
    <section className="border border-terminal-gray bg-surface-container-low/20 p-5 md:p-6">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionName={authAction}
        nextPath={article?.route || '/'}
      />

      {/* Engagement Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleLike}
          className={`inline-flex items-center gap-2 border px-4 py-3 font-label-caps text-[10px] font-bold transition-colors ${
            liked ? 'border-system-red bg-system-red text-black' : 'border-terminal-gray text-white hover:border-system-red'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{liked ? 'favorite' : 'favorite_border'}</span>
          {counts.likes}
        </button>

        <button
          type="button"
          onClick={toggleSave}
          className={`inline-flex items-center gap-2 border px-4 py-3 font-label-caps text-[10px] font-bold transition-colors ${
            saved ? 'border-system-red bg-system-red text-black' : 'border-terminal-gray text-white hover:border-system-red'
          }`}
          title={authenticated ? 'Guardar articulo' : 'Necesitas iniciar sesion para guardar'}
        >
          <span className="material-symbols-outlined text-[16px]">{saved ? 'bookmark' : 'bookmark_border'}</span>
          {counts.saves}
        </button>

        <button
          type="button"
          onClick={() => shareArticle('native')}
          className="inline-flex items-center gap-2 border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red"
        >
          <span className="material-symbols-outlined text-[16px]">ios_share</span>
          {counts.shares}
        </button>

        <a
          href="#comentarios-seccion"
          className="inline-flex items-center gap-2 border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red"
        >
          <span className="material-symbols-outlined text-[16px]">mode_comment</span>
          {counts.comments}
        </a>
      </div>

      {status ? <p className="mt-3 text-xs text-on-surface-variant">{status}</p> : null}

      {/* Comentarios de la Red Section */}
      <div id="comentarios-seccion" className="mt-8 border-t border-terminal-gray/80 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline-md text-2xl text-white uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-xl">forum</span>
            Comentarios de la red ({commentsList.length})
          </h2>
        </div>

        {/* Input Form or Sign-in Prompt */}
        {!engagementLoaded ? (
          <div className="border border-terminal-gray bg-black/30 p-4 mb-6">
            <p className="text-sm text-on-surface-variant">Cargando comentarios...</p>
          </div>
        ) : authenticated ? (
          <form onSubmit={submitComment} className="grid gap-3 border border-terminal-gray bg-black/30 p-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-label-caps text-system-red font-bold">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Escribe un comentario
            </div>
            <textarea
              name="body"
              required
              minLength={3}
              maxLength={2000}
              rows={3}
              placeholder="Escribe un comentario para moderacion"
              className="resize-y border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submittingComment}
                className="bg-system-red px-5 py-3 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
              >
                {submittingComment ? 'Enviando...' : 'Enviar comentario'}
              </button>
              {commentStatus ? <span className="text-xs text-on-surface-variant">{commentStatus}</span> : null}
            </div>
          </form>
        ) : (
          <div className="border border-terminal-gray bg-black/30 p-5 mb-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-system-red text-2xl mt-0.5">lock</span>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">Inicia sesion para comentar.</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Puedes leer todos los comentarios libremente. Para unirte a la conversación o responder a otros lectores, identifícate en la red.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/iniciar-sesion?next=${encodeURIComponent(article?.route || '/')}`}
                className="inline-flex bg-system-red px-4 py-2.5 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white"
              >
                Iniciar sesion
              </a>
              <a
                href="/register"
                className="inline-flex border border-terminal-gray px-4 py-2.5 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
              >
                Registrarse
              </a>
            </div>
          </div>
        )}

        {/* Lista de Comentarios Públicos */}
        <div className="space-y-4">
          {topLevelComments.length > 0 ? (
            topLevelComments.map((comment) => {
              const replies = getThreadReplies(comment.id);

              return (
                <div key={comment.id} className="border border-terminal-gray bg-black/25 p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-system-red bg-system-red/20 text-system-red font-bold text-xs flex items-center justify-center">
                        {comment.user ? comment.user[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{comment.user}</div>
                        <div className="text-[10px] font-label-caps text-on-surface-variant">{comment.date}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartReply(comment)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 border border-terminal-gray hover:border-system-red text-xs text-on-surface-variant hover:text-system-red font-label-caps transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">reply</span>
                      Responder
                    </button>
                  </div>

                  <p className="text-on-surface text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>

                  {/* Inline reply form for root comment */}
                  {replyingTo?.id === comment.id && (
                    <form onSubmit={(e) => submitReply(e, comment)} className="mt-3 p-4 border border-system-red/50 bg-black/60 space-y-3">
                      <div className="flex items-center justify-between text-xs text-system-red font-label-caps">
                        <span>Respondiendo a @{comment.user}</span>
                        <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-white">Cancelar</button>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                        minLength={3}
                        maxLength={2000}
                        rows={2}
                        placeholder={`Escribe tu respuesta para @${comment.user}...`}
                        className="w-full resize-y border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={submittingReply || !replyText.trim()}
                          className="bg-system-red px-4 py-2 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
                        >
                          {submittingReply ? 'Enviando...' : 'Publicar respuesta'}
                        </button>
                        {replyStatus ? <span className="text-xs text-on-surface-variant">{replyStatus}</span> : null}
                      </div>
                    </form>
                  )}

                  {/* Respuestas anidadas y respuestas a respuestas */}
                  {replies.length > 0 && (
                    <div className="ml-4 md:ml-8 mt-3 space-y-3 border-l-2 border-system-red/50 pl-4 pt-1">
                      {replies.map((reply) => {
                        const parentOfReply = commentsList.find((c) => c.id === reply.parentId);
                        const replyingToName = parentOfReply ? parentOfReply.user : comment.user;

                        return (
                          <div key={reply.id} className="border border-terminal-gray/60 bg-black/40 p-3.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{reply.user}</span>
                                <span className="text-[10px] font-label-caps text-system-red bg-system-red/10 px-2 py-0.5 rounded">
                                  en respuesta a @{replyingToName}
                                </span>
                              </div>
                              <span className="text-[10px] font-label-caps text-on-surface-variant">{reply.date}</span>
                            </div>
                            <p className="text-on-surface text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => handleStartReply(reply)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-terminal-gray hover:border-system-red text-[11px] text-on-surface-variant hover:text-system-red font-label-caps transition-colors"
                              >
                                <span className="material-symbols-outlined text-[13px]">reply</span>
                                Responder a @{reply.user}
                              </button>
                            </div>

                            {/* Inline reply form for this reply */}
                            {replyingTo?.id === reply.id && (
                              <form onSubmit={(e) => submitReply(e, reply)} className="mt-3 p-4 border border-system-red/50 bg-black/60 space-y-3">
                                <div className="flex items-center justify-between text-xs text-system-red font-label-caps">
                                  <span>Respondiendo a @{reply.user}</span>
                                  <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-white">Cancelar</button>
                                </div>
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  required
                                  minLength={3}
                                  maxLength={2000}
                                  rows={2}
                                  placeholder={`Escribe tu respuesta para @${reply.user}...`}
                                  className="w-full resize-y border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
                                />
                                <div className="flex items-center gap-3">
                                  <button
                                    type="submit"
                                    disabled={submittingReply || !replyText.trim()}
                                    className="bg-system-red px-4 py-2 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
                                  >
                                    {submittingReply ? 'Enviando...' : 'Publicar respuesta'}
                                  </button>
                                  {replyStatus ? <span className="text-xs text-on-surface-variant">{replyStatus}</span> : null}
                                </div>
                              </form>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="border border-terminal-gray/60 bg-black/20 p-6 text-center text-on-surface-variant text-sm">
              No hay comentarios registrados en este nodo. ¡Sé el primero en opinar!
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
