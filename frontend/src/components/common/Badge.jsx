import React from 'react';

const COLOR_MAP = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  green: 'bg-green-50 text-green-700 border-green-200/80',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
  teal: 'bg-teal-50 text-teal-700 border-teal-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  orange: 'bg-orange-50 text-orange-700 border-orange-200/80',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  slate: 'bg-slate-50 text-slate-700 border-slate-200/80',
};

export const Badge = ({ children, color = 'slate', size = 'sm', className = '' }) => {
  const colorStyles = COLOR_MAP[color] || COLOR_MAP.slate;
  const sizeStyles = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${colorStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
