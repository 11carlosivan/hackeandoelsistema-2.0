'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  deleteCmsCommunityPost,
  getCmsCommunityComments,
  deleteCmsCommunityComment,
} from '@/lib/main-design/api';

export default function CmsCommunityModerationPanel({ initialPosts = [], totalPosts = 0, accessToken }) {
  const [posts, setPosts] = useState(initialPosts);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Comments modal
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const handleDeletePost = async (id, userName) => {
    if (!confirm(`¿Estás seguro de eliminar esta publicación de "${userName}"? Se borrarán también sus comentarios y likes.`)) {
      return;
    }

    try {
      await deleteCmsCommunityPost(accessToken, id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setFeedback({ type: 'success', message: 'Publicación comunitaria eliminada correctamente.' });
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleOpenComments = async (post) => {
    setActivePostForComments(post);
    setLoadingComments(true);
    try {
      const res = await getCmsCommunityComments(accessToken, post.id);
      setComments(res);
    } catch (err) {
      alert('Error al cargar comentarios: ' + err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('¿Eliminar este comentario de la comunidad?')) return;
    try {
      await deleteCmsCommunityComment(accessToken, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      // update count in post list
      if (activePostForComments) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === activePostForComments.id
              ? { ...p, _count: { ...p._count, comments: Math.max(0, (p._count?.comments || 1) - 1) } }
              : p
          )
        );
      }
    } catch (err) {
      alert('Error al eliminar comentario: ' + err.message);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchContent = p.content?.toLowerCase().includes(q);
    const matchUser = p.user?.displayName?.toLowerCase().includes(q) || p.user?.username?.toLowerCase().includes(q);
    return matchContent || matchUser;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-terminal-gray/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/cms" className="text-terminal-gray hover:text-white text-xs font-mono">
              CMS
            </Link>
            <span className="text-terminal-gray text-xs">/</span>
            <span className="text-system-red text-xs font-mono uppercase font-bold">Comunidad</span>
          </div>
          <h1 className="text-2xl font-black text-white font-mono uppercase tracking-wider flex items-center gap-3">
            <span className="material-symbols-outlined text-system-red text-3xl">forum</span>
            Moderación del Feed Comunitario (App & Web)
          </h1>
          <p className="text-terminal-gray text-xs mt-1">
            Revisa, modera y elimina publicaciones, encuestas o comentarios inapropiados reportados por los usuarios.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/cms"
            className="border border-terminal-gray px-4 py-2.5 text-xs font-mono font-bold text-white hover:border-white transition-colors"
          >
            ← Volver al CMS
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 mb-6 border text-xs font-mono ${
            feedback.type === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-400'
              : 'border-system-red/40 bg-system-red/10 text-system-red'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-terminal-dark p-3 border border-terminal-gray/40 font-mono text-xs">
        <div className="text-white font-bold uppercase">
          Total de Publicaciones en Feed: <span className="text-system-red">{posts.length}</span>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por usuario o texto de publicación..."
          className="bg-black border border-terminal-gray px-3 py-1.5 text-white placeholder-terminal-gray outline-none focus:border-system-red w-72 text-xs"
        />
      </div>

      {/* Posts List */}
      <div className="space-y-4 font-mono text-xs">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-terminal-gray bg-black/40 border border-terminal-gray/40">
            No hay publicaciones en el feed comunitario que coincidan con la búsqueda.
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="p-5 bg-black/40 border border-terminal-gray/40 hover:border-terminal-gray/80 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* User info & content */}
                <div className="flex items-start gap-3 flex-1">
                  {post.user?.avatarUrl ? (
                    <img
                      src={post.user.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-terminal-gray/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-terminal-dark border border-terminal-gray/40 flex items-center justify-center text-system-red shrink-0 font-bold">
                      {(post.user?.displayName || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {post.user?.displayName || 'Usuario HES'}
                      </span>
                      {post.user?.username && (
                        <span className="text-terminal-gray text-xs">@{post.user.username}</span>
                      )}
                      <span className="text-terminal-gray text-[10px]">
                        • {new Date(post.createdAt).toLocaleString('es-DO')}
                      </span>
                    </div>

                    <div className="text-white text-sm mt-2 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </div>

                    {/* Attached Media */}
                    {post.mediaUrl && (
                      <div className="mt-3 max-w-sm">
                        <img
                          src={post.mediaUrl}
                          alt="Contenido multimedia"
                          className="max-h-48 rounded border border-terminal-gray/40 object-cover"
                        />
                      </div>
                    )}

                    {/* Attached Poll */}
                    {post.poll && (
                      <div className="mt-3 p-3 bg-terminal-dark border border-terminal-gray/30 max-w-md">
                        <div className="text-xs font-bold text-system-red uppercase mb-1.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">poll</span>
                          Encuesta: {post.poll.question}
                        </div>
                        <div className="space-y-1">
                          {post.poll.options?.map((opt) => (
                            <div
                              key={opt.id}
                              className="px-2.5 py-1 bg-black/60 border border-terminal-gray/30 text-[11px] text-terminal-gray flex justify-between"
                            >
                              <span>{opt.text}</span>
                              <span className="font-bold text-white">{opt.votesCount || 0} votos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metrics bar */}
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-terminal-gray pt-2 border-t border-terminal-gray/20">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-red-500">favorite</span>
                        {post._count?.likes ?? post.likesCount ?? 0} Likes
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-blue-400">comment</span>
                        {post._count?.comments ?? post.commentsCount ?? 0} Comentarios
                      </span>
                    </div>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenComments(post)}
                    className="px-3 py-1.5 bg-terminal-dark hover:bg-white hover:text-black border border-terminal-gray text-white transition-colors font-bold uppercase text-[10px] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">forum</span>
                    Moderar Comentarios
                  </button>

                  <button
                    onClick={() => handleDeletePost(post.id, post.user?.displayName || 'Usuario')}
                    className="px-3 py-1.5 bg-system-red/10 hover:bg-system-red hover:text-black border border-system-red/50 text-system-red transition-colors font-bold uppercase text-[10px] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Eliminar Post
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Moderar Comentarios */}
      {activePostForComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-terminal-dark border border-terminal-gray max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-terminal-gray/40 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white font-mono uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-system-red">chat</span>
                  Comentarios del Post ({comments.length})
                </h2>
                <div className="text-terminal-gray text-xs font-mono mt-0.5 line-clamp-1">
                  Post: "{activePostForComments.content}"
                </div>
              </div>
              <button
                onClick={() => setActivePostForComments(null)}
                className="text-terminal-gray hover:text-white font-mono text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            {loadingComments ? (
              <div className="p-8 text-center text-terminal-gray font-mono text-xs">
                Cargando comentarios...
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-terminal-gray font-mono text-xs">
                No hay comentarios en esta publicación comunitaria.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 bg-black border border-terminal-gray/30 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {comment.user?.displayName || 'Usuario'}
                        </span>
                        {comment.user?.username && (
                          <span className="text-terminal-gray text-[10px]">@{comment.user.username}</span>
                        )}
                        <span className="text-terminal-gray text-[10px]">
                          • {new Date(comment.createdAt).toLocaleString('es-DO')}
                        </span>
                      </div>
                      <div className="text-white text-xs mt-1.5 leading-relaxed">
                        {comment.content}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="px-2.5 py-1 bg-system-red/10 hover:bg-system-red hover:text-black border border-system-red/40 text-system-red text-[10px] font-bold uppercase transition-colors shrink-0"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
