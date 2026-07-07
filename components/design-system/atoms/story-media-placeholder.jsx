export function StoryMediaPlaceholder({ label = 'HES', className = '', showLabel = true }) {
  return (
    <div
      className={`relative flex h-full w-full items-end overflow-hidden bg-[linear-gradient(135deg,#070707_0%,#171717_42%,#3a1015_100%)] ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute left-6 top-6 h-16 w-16 border border-system-red/40" />
      <div className="absolute right-0 top-0 h-28 w-28 border-l border-b border-white/10" />
      <span className="sr-only">Sin imagen</span>
      {showLabel ? (
        <span className="relative z-10 p-5 text-sm font-black uppercase tracking-normal text-system-red">
          {label}
        </span>
      ) : null}
    </div>
  );
}
