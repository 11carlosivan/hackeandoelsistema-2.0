export function IconButton({ label, children, className = '' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-full border border-terminal-gray bg-black text-white transition hover:border-system-red hover:text-system-red ${className}`}
    >
      {children}
    </button>
  );
}
