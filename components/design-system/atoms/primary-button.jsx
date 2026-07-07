import Link from 'next/link';

export function PrimaryButton({ href, children, className = '' }) {
  const classes = `inline-flex items-center justify-center rounded-md bg-system-red px-5 py-3 text-sm font-black uppercase text-white transition hover:bg-white hover:text-black ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
