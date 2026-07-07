import Link from 'next/link';

export function NavLink({ href, children, active = false }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap text-sm font-black uppercase transition ${
        active ? 'text-system-red' : 'text-white hover:text-system-red'
      }`}
    >
      {children}
    </Link>
  );
}
