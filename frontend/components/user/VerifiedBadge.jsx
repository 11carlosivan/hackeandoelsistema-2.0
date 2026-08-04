import React from 'react';

export default function VerifiedBadge({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-[12px]',
    lg: 'w-6 h-6 text-[14px]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20 shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title="Perfil Verificado - Datos completos"
    >
      <span className="material-symbols-outlined text-[inherit] font-black">check</span>
    </span>
  );
}
