import React from 'react';

const colorMap = {
  teal: 'bg-[#3d3c2a]/15 text-[#3d3c2a] dark:text-[#e0d8cd] border-[#3d3c2a]/30 dark:border-[#e0d8cd]/30',
  blue: 'bg-[#4f665a]/15 text-[#3d5046] dark:text-[#a0b8ac] border-[#4f665a]/30 dark:border-[#a0b8ac]/30',
  green: 'bg-[#57634f]/15 text-[#424c3a] dark:text-[#aab8a0] border-[#57634f]/30 dark:border-[#aab8a0]/30',
  red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  orange: 'bg-[#a67c52]/15 text-[#7a5836] dark:text-[#d4b18f] border-[#a67c52]/30 dark:border-[#d4b18f]/30',
  purple: 'bg-[#6b5b54]/15 text-[#544640] dark:text-[#c4b5ad] border-[#6b5b54]/30 dark:border-[#c4b5ad]/30',
  gray: 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  cyan: 'bg-[#4f665a]/15 text-[#3d5046] dark:text-[#a0b8ac] border-[#4f665a]/30 dark:border-[#a0b8ac]/30',
};

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
};

export default function Badge({ children, color = 'teal', size = 'md', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorMap[color] || colorMap.gray} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}

// Dynamic badge that takes a hex color directly
Badge.Custom = function CustomBadge({ children, bgColor, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${className}`}
      style={{
        backgroundColor: `${bgColor}15`,
        color: bgColor,
        borderColor: `${bgColor}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bgColor }} />
      {children}
    </span>
  );
};
