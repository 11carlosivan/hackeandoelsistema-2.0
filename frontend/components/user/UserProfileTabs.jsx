'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArticleListItem, EmptyState } from '@/components/main-design/content-primitives';

function buildCommentPlaceholder(author) {
  return {
    commentsMade: author?.stats?.comments || 0,
    commentsReceived: author?.stats?.commentReplies || 0,
  };
}

export default function UserProfileTabs({ author }) {
  const [activeTab, setActiveTab] = useState('posts');
  const posts = author?.posts || [];
  const commentStats = buildCommentPlaceholder(author);

  const tabs = [
    {
      id: 'posts',
      icon: 'article',
      label: 'Publicaciones',
      count: posts.length,
    },
    {
      id: 'comments',
      icon: 'comment',
      label: 'Comentarios',
      count: commentStats.commentsMade,
    },
    {
      id: 'responses',
      icon: 'forum',
      label: 'Respuestas',
      count: commentStats.commentsReceived,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex overflow-x-auto border-b border-terminal-gray">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 font-label-caps text-xs font-bold transition-colors ${
              activeTab === tab.id
                ? 'border-system-red bg-surface-container-low/40 text-system-red'
                : 'border-transparent text-on-surface-variant hover:border-terminal-gray hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'posts' ? (
        <div className="space-y-5">
          {posts.length > 0 ? (
            posts.map((article) => <ArticleListItem key={article.id} article={article} />)
          ) : (
            <EmptyState title="SIN PUBLICACIONES" description="Este perfil no tiene publicaciones visibles por ahora." />
          )}
        </div>
      ) : null}

      {activeTab === 'comments' ? (
        <div className="border border-terminal-gray bg-surface-container-low/20 p-8 text-center">
          <div className="mb-2 font-headline-md text-xl uppercase text-white">Actividad de comentarios</div>
          <p className="mx-auto max-w-2xl text-sm text-on-surface-variant">
            La actividad publica de comentarios quedara disponible cuando el backend exponga el historial del usuario.
          </p>
        </div>
      ) : null}

      {activeTab === 'responses' ? (
        <div className="border border-terminal-gray bg-surface-container-low/20 p-8 text-center">
          <div className="mb-2 font-headline-md text-xl uppercase text-white">Respuestas recibidas</div>
          <p className="mx-auto max-w-2xl text-sm text-on-surface-variant">
            Esta vista esta preparada para conectar respuestas y menciones reales del perfil.
          </p>
          {author?.canonicalPath ? (
            <Link
              href={author.canonicalPath}
              className="mt-4 inline-flex border border-system-red px-4 py-2 font-label-caps text-[11px] font-bold text-system-red hover:bg-system-red hover:text-black"
            >
              VER ARCHIVO PUBLICO
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
