import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function Table({ columns, data, onRowClick, emptyMessage = 'No data found', sortable = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-surface-alt)]">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-left font-medium text-[var(--color-text-secondary)] whitespace-nowrap
                  ${col.className || ''}`}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`bg-[var(--color-surface)] transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-[var(--color-surface-alt)]' : ''}`}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-3 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
