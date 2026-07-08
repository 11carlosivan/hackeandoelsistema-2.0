import Link from 'next/link';

export function NavLink({ href, children, active = false }) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap text-[13px] font-black uppercase transition xl:text-sm ${
        active ? 'text-system-red' : 'text-white hover:text-system-red'
      }`}
    >
      {children}
    </Link>
  );
}
