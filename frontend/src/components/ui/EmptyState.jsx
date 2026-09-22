import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data found',
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-[var(--color-text-secondary)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-4">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
