import React from 'react';

const colorMap = {
  teal: 'bg-teal/10 text-teal-700 dark:text-teal-300 border-teal/20',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
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
