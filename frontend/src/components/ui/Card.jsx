import React from 'react';

export function Card({ title, subtitle, icon: Icon, headerAction, children, className = '' }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl transition-colors duration-200 hover:border-slate-600 ${className}`}>
      {(title || Icon || headerAction) && (
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            {Icon && <Icon className="w-5 h-5 text-slate-400" />}
            <div>
              {title && <h3 className="text-lg font-medium text-slate-50">{title}</h3>}
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
