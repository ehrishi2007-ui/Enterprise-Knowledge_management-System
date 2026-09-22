import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  );
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-3 bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded w-full"></div>
        <div className="h-3 bg-slate-700 rounded w-5/6"></div>
        <div className="h-3 bg-slate-700 rounded w-4/6"></div>
      </div>
    </div>
  );
}
