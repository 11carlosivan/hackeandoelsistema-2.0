export function TrendingPanel({ posts }) {
  return (
    <section className="rounded-md border border-terminal-gray bg-surface-container p-5">
      <h2 className="text-lg font-black uppercase text-white">Tendencias</h2>
      <ol className="mt-4 divide-y divide-terminal-gray">
        {posts.slice(0, 5).map((post, index) => (
          <li key={post.id} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
            <span className="text-2xl font-black text-system-red/80">{String(index + 1).padStart(2, '0')}</span>
            <a href={post.url} className="group">
              <h3 className="text-sm font-black leading-snug text-white group-hover:text-system-red">{post.title}</h3>
              <p className="mt-1 text-xs text-on-surface-variant">{(12.5 - index * 1.3).toFixed(1)}K vistas</p>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
