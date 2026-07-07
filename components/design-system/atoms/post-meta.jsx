function formatDate(value) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function PostMeta({ post, showAuthor = true }) {
  const date = formatDate(post.publishedAt);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-on-surface-variant">
      {showAuthor && post.author ? <span>{post.author.displayName}</span> : null}
      {showAuthor && post.author && date ? <span className="text-system-red">/</span> : null}
      {date ? <time dateTime={post.publishedAt}>{date}</time> : null}
      {post.readingTimeMinutes ? (
        <>
          <span className="text-system-red">/</span>
          <span>{post.readingTimeMinutes} min</span>
        </>
      ) : null}
      {post.isSponsored ? (
        <>
          <span className="text-system-red">/</span>
          <span>Patrocinado</span>
        </>
      ) : null}
    </div>
  );
}
