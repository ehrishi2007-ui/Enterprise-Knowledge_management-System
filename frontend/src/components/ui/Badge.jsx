import React from 'react';

export function Badge({ variant = 'default', children, className = '' }) {
  const variantClasses = {
    accent: 'bg-orange-500/15 text-orange-400',
    info: 'bg-blue-500/15 text-blue-400',
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
    default: 'bg-slate-700 text-slate-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
