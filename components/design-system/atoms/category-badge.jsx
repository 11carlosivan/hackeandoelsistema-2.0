import Link from 'next/link';

export function CategoryBadge({ category, label, href, tone = 'solid' }) {
  const text = label ?? category?.name;
  const url = href ?? category?.url;
  const className =
    tone === 'outline'
      ? 'inline-flex border border-system-red px-2.5 py-1 text-[11px] font-black uppercase text-system-red'
      : 'inline-flex bg-system-red px-2.5 py-1 text-[11px] font-black uppercase text-black';

  if (!text) {
    return null;
  }

  if (url) {
    return (
      <Link href={url} className={className}>
        {text}
      </Link>
    );
  }

  return <span className={className}>{text}</span>;
}
