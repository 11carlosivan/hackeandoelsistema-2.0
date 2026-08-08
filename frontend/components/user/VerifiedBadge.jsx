'use client';

export default function VerifiedBadge({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 text-[10px]',
    md: 'h-5 w-5 text-[12px]',
    lg: 'h-6 w-6 text-[14px]',
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-data-green font-bold text-black shadow-[0_0_16px_rgba(0,255,106,0.18)] ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title="Perfil verificado"
      aria-label="Perfil verificado"
    >
      <span className="material-symbols-outlined text-[inherit] font-black">check</span>
    </span>
  );
}
