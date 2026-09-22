import React from 'react';

export function TabSwitcher({ tabs = [], activeTab, onChange, onTabChange, className = '' }) {
  const handleChange = onChange || onTabChange;

  return (
    <div className={`inline-flex bg-slate-800 border border-slate-700 rounded-lg p-1 ${className}`}>
      {tabs.map((tab, idx) => {
        const key = typeof tab === 'string' ? tab : (tab.id ?? tab.key ?? tab.value ?? String(idx));
        const label = typeof tab === 'string' ? tab : (tab.label ?? tab.name ?? key);
        const isActive = activeTab === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => handleChange && handleChange(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive 
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
