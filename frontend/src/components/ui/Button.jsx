import React from 'react';

const variants = {
  primary: 'bg-teal hover:bg-teal-500 text-white focus:ring-teal/50',
  secondary: 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red/50',
  ghost: 'bg-transparent hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]',
  outline: 'bg-transparent border border-teal text-teal hover:bg-teal hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-150 focus:outline-none focus:ring-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </button>
  );
}
