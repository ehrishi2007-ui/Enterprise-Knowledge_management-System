import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title, message, description, action }) {
  const desc = description || message;
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-4 border border-slate-700">
        {React.isValidElement(Icon) ? Icon : <Icon className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-base font-medium text-slate-50 mb-1">{title}</h3>
      {desc && <p className="text-sm text-slate-400 max-w-sm mb-4">{desc}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
