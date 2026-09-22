import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${maxWidths[size]} transform overflow-hidden rounded-xl
                  bg-[var(--color-surface)] border border-[var(--color-border)]
                  shadow-xl transition-all`}
              >
                {/* Header */}
                {title && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                    <Dialog.Title className="text-lg font-semibold text-[var(--color-text)]">
                      {title}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="p-1 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Body */}
                <div className="px-6 py-4">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
