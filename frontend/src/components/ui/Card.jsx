import React from 'react';

export default function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div
      className={`
        bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm
        ${hover ? 'hover:shadow-md hover:border-teal/30 transition-all duration-200 cursor-pointer' : ''}
        ${padding ? 'p-5' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-[var(--color-text)] ${className}`}>
      {children}
    </h3>
  );
};

Card.Description = function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-[var(--color-text-secondary)] ${className}`}>
      {children}
    </p>
  );
};
