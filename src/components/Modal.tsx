'use client';

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Max width utility, defaults to max-w-3xl */
  maxWidth?: string;
}

/** Base modal shell — violet-reskinned, blurred backdrop, scroll lock. */
export default function Modal({ isOpen, onClose, children, title, maxWidth = 'max-w-3xl' }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-2xl ${maxWidth} w-full border border-violet-200 dark:border-violet-900/60 shadow-2xl shadow-violet-500/20 dark:shadow-violet-500/30 relative max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
