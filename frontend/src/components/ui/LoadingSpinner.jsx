import React from 'react';

export default function LoadingSpinner({ size = 'md', message, className = '' }) {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-[var(--color-border)] border-t-teal`} />
      {message && (
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      )}
    </div>
  );
}
