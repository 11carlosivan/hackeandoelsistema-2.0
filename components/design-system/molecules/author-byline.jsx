import Link from 'next/link';

export function AuthorByline({ author }) {
  if (!author) {
    return null;
  }

  return (
    <Link href={author.url} className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-system-red bg-surface-container text-sm font-black text-system-red">
        {author.avatarUrl ? (
          <img src={author.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          author.displayName.slice(0, 1)
        )}
      </div>
      <div>
        <p className="text-sm font-black text-white">{author.displayName}</p>
        {author.bio ? <p className="text-xs text-on-surface-variant line-clamp-1">{author.bio}</p> : null}
      </div>
    </Link>
  );
}
