import React from 'react';

export default function TabSwitcher({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-[var(--color-surface-alt)] rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150
            ${activeTab === tab.value
              ? 'bg-[var(--color-surface)] text-teal shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }
          `}
        >
          {tab.icon && <tab.icon className="h-4 w-4" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.value
                ? 'bg-teal/10 text-teal'
                : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
