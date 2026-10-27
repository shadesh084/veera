import React from 'react';
import { Plus, BookOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = BookOpen,
  title = 'No records found',
  description = 'Get started by creating your first record to begin tracking progress.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-xs flex flex-col items-center justify-center max-w-lg mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm shadow-sm hover:bg-brand-700 active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
