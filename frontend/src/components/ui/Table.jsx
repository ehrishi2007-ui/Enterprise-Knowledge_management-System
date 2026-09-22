import React from 'react';
import { EmptyState } from './EmptyState';

export function Table({ columns, data, onRowClick, emptyMessage = "No data available", className = '' }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No results found" message={emptyMessage} />;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-700 ${className}`}>
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 uppercase text-xs font-medium">
          <tr>
            {columns.map((col, index) => (
              <th key={col.key || index} className="px-4 py-3">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {data.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`bg-slate-900 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-800' : ''}`}
            >
              {columns.map((col, colIndex) => (
                <td key={col.key || colIndex} className="px-4 py-3 text-slate-300">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
