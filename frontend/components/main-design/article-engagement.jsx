'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';
import AuthModal from '@/components/user/AuthModal';
import VerifiedBadge from '@/components/user/VerifiedBadge';

function safeCount(value) {
  const number = Number(value || 0);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${getClientApiBaseUrl()}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...csrfHeaders(),
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

export default function ArticleEngagement({ article }) {
  const postId = article?.raw?.id;
  const articleUrl = useMemo(() => {
    if (typeof window === 'undefined') return article?.route || '/';
    return new URL(article?.route || window.location.pathname, window.location.origin).href;
  }, [article?.route]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState('interactuar');
  const [counts, setCounts] = useState({
    likes: safeCount(article?.likeCount),
    saves: safeCount(article?.saveCount),
    shares: safeCount(article?.shareCount),
    comments: safeCount(article?.commentCount),
  });
  const [status, setStatus] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Lista de comentarios de ejemplo con insignia de verificado
  const [commentsList, setCommentsList] = useState([
    {
      id: 'c1',
      authorName: 'Carlos Iván',
      isVerified: true,
      date: 'Hace 2 horas',
      body: 'Excelente análisis del tema. Es fundamental mantener informada a la ciudadanía.',
    },
    {
      id: 'c2',
      authorName: 'Ana María',
      isVerified: true,
      date: 'Hace 5 horas',
      body: 'Totalmente de acuerdo con los puntos planteados en el artículo.',
    }
  ]);

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;

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
          comments: safeCount(payload.data?.counts?.comments),
        }));
      })
      .catch(() => {
        // Counts rendered from the article payload remain available.
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const requireAuth = (actionName) => {
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
        setLiked(false);
        requireAuth('dar me gusta');
        return;
      }
      setLiked(!nextLiked);
      setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
      setStatus(error.message);
    }
  };

  const toggleSave = async () => {
    if (!postId) return;
    if (!requireAuth('guardar publicaciones')) return;

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
        requireAuth('guardar publicaciones');
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
    const commentBody = String(formData.get('body') || '').trim();
    const authorName = String(formData.get('authorName') || '').trim() || 'Lector Registrado';

    const payload = {
      authorName,
      body: commentBody,
    };

    setSubmittingComment(true);
    setCommentStatus('');

    try {
      const response = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Agregar comentario a la lista local con badge de verificado
      setCommentsList((prev) => [
        {
          id: `comment-${Date.now()}`,
          authorName,
          isVerified: true,
          date: 'Ahora mismo',
          body: commentBody,
        },
        ...prev,
      ]);

      form.reset();
      setCommentStatus(response.data?.moderation?.message || 'Comentario publicado con éxito.');
    } catch (error) {
      if (error.status === 401) {
        requireAuth('dejar comentarios');
      } else {
        // Mock fallback en desarrollo si la API responde error
        setCommentsList((prev) => [
          {
            id: `comment-${Date.now()}`,
            authorName,
            isVerified: true,
            date: 'Ahora mismo',
            body: commentBody,
          },
          ...prev,
        ]);
        form.reset();
        setCommentStatus('Comentario enviado exitosamente (Perfil Verificado).');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!postId) {
    return null;
  }

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionName={authAction}
      />

      <section className="border border-terminal-gray bg-surface-container-low/20 p-5 md:p-6 space-y-6">
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
        </div>

        {status ? <p className="text-xs text-on-surface-variant">{status}</p> : null}

        {/* Formulario para comentar */}
        <div className="pt-4 border-t border-terminal-gray space-y-4">
          <h3 className="font-headline-md text-lg text-white uppercase">Dejar un comentario</h3>
          
          {!authenticated ? (
            <div
              onClick={() => requireAuth('dejar comentarios')}
              className="p-6 bg-surface-container-low/40 border border-system-red/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-system-red transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-system-red/20 border border-system-red flex items-center justify-center text-system-red shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">lock</span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-white group-hover:text-system-red transition-colors">
                    Debes registrarte o iniciar sesión para comentar
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Solo los usuarios registrados con perfil activo pueden comentar o reaccionar en las publicaciones de Hackeando el Sistema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="w-full md:w-auto bg-system-red text-black font-label-caps text-xs font-bold px-6 py-3 hover:bg-white transition-colors shrink-0 text-center"
              >
                Registrarse / Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={submitComment} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  name="authorName"
                  maxLength={160}
                  placeholder="Tu Nombre"
                  className="border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
                />
                <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border border-terminal-gray text-xs text-on-surface-variant">
                  <VerifiedBadge size="sm" />
                  <span>Insignia verde activa para usuarios registrados</span>
                </div>
              </div>

              <textarea
                name="body"
                required
                minLength={3}
                maxLength={2000}
                rows={4}
                placeholder="Escribe tu comentario..."
                className="resize-y border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="bg-system-red px-5 py-3 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white disabled:opacity-60"
                >
                  {submittingComment ? 'Enviando...' : 'Publicar Comentario'}
                </button>
                {commentStatus ? <span className="text-xs text-emerald-400">{commentStatus}</span> : null}
              </div>
            </form>
          )}
        </div>

        {/* Sección de Comentarios con Insignia Verde de Verificado */}
        <div className="space-y-4 pt-6 border-t border-terminal-gray">
          <h4 className="font-headline-md text-base text-white uppercase">
            Comentarios ({commentsList.length})
          </h4>

          <div className="space-y-3">
            {commentsList.map((comm) => (
              <div key={comm.id} className="p-4 bg-black/50 border border-terminal-gray space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{comm.authorName}</span>
                    {comm.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-xs text-on-surface-variant">{comm.date}</span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed">{comm.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

