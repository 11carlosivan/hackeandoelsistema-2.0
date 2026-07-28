'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';

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
  const [counts, setCounts] = useState({
    likes: safeCount(article?.likeCount),
    saves: safeCount(article?.saveCount),
    shares: safeCount(article?.shareCount),
    comments: safeCount(article?.commentCount),
  });
  const [status, setStatus] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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

  const toggleLike = async () => {
    if (!postId) return;

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
      setLiked(!nextLiked);
      setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
      setStatus(error.message);
    }
  };

  const toggleSave = async () => {
    if (!postId) return;

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
      setStatus(error.status === 401 ? 'Inicia sesion para guardar articulos.' : error.message);
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      authorName: String(formData.get('authorName') || '').trim() || undefined,
      authorEmail: String(formData.get('authorEmail') || '').trim() || undefined,
      body: String(formData.get('body') || '').trim(),
    };

    setSubmittingComment(true);
    setCommentStatus('');

    try {
      const response = await requestJson(`/api/v1/public/posts/id/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      form.reset();
      setCommentStatus(response.data?.moderation?.message || 'Comentario pendiente de moderacion.');
    } catch (error) {
      setCommentStatus(error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!postId) {
    return null;
  }

  return (
    <section className="border border-terminal-gray bg-surface-container-low/20 p-5 md:p-6">
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

      <form onSubmit={submitComment} className="mt-6 grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="authorName"
            maxLength={160}
            placeholder="Nombre"
            className="border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
          />
          <input
            name="authorEmail"
            type="email"
            maxLength={255}
            placeholder="Email opcional"
            className="border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
          />
        </div>
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
    </section>
  );
}
