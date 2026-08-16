'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import AuthModal from '@/components/user/AuthModal';
import { fetchWithCsrfRetry } from './client-security';
import VerifiedBadge from '@/components/user/VerifiedBadge';

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

export default function ArticleEngagement({ article }) {
  const postId = article?.raw?.id;
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
          comments: safeCount(payload.data?.counts?.comments),
        }));
        setEngagementLoaded(true);
      })
      .catch(() => {
        // Counts rendered from the article payload remain available.
        if (!cancelled) {
          setEngagementLoaded(true);
        }
      });

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
    if (!requireAuth('comentar')) return;

    if (!requireAuth('dejar comentarios')) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const commentBody = String(formData.get('body') || '').trim();
    const authorName = String(formData.get('authorName') || '').trim() || 'Lector Registrado';

    const payload = {
      body: String(formData.get('body') || '').trim(),
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
      setCommentStatus(error.status === 401 ? 'Inicia sesion para comentar.' : error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!postId) {
    return null;
  }

  return (
    <section className="border border-terminal-gray bg-surface-container-low/20 p-5 md:p-6">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionName={authAction}
        nextPath={article?.route || '/'}
      />

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

      {status ? <p className="mt-3 text-xs text-on-surface-variant">{status}</p> : null}

      {!engagementLoaded ? (
        <div className="mt-6 border border-terminal-gray bg-black/30 p-4">
          <p className="text-sm text-on-surface-variant">Cargando comentarios...</p>
        </div>
      ) : authenticated ? (
        <form onSubmit={submitComment} className="mt-6 grid gap-3">
          <textarea
            name="body"
            required
            minLength={3}
            maxLength={2000}
            rows={4}
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
        <div className="mt-6 border border-terminal-gray bg-black/30 p-4">
          <p className="text-sm text-on-surface-variant">Inicia sesion para comentar.</p>
          <a
            href={`/iniciar-sesion?next=${encodeURIComponent(article?.route || '/')}`}
            className="mt-3 inline-flex bg-system-red px-4 py-3 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white"
          >
            Iniciar sesion
          </a>
        </div>
      )}
    </section>
  );
}

