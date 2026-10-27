import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
    </div>
    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse shadow-sm overflow-hidden">
    <div className="h-10 bg-slate-100 rounded-lg mb-4"></div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-b border-slate-100 last:border-0">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-4 bg-slate-200 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse shadow-sm h-80 flex flex-col justify-between">
    <div className="h-5 bg-slate-200 rounded w-1/4"></div>
    <div className="h-48 bg-slate-100 rounded-xl flex items-end justify-between p-4 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-200 rounded-t w-full"
          style={{ height: `${30 + (i * 10) % 60}%` }}
        ></div>
      ))}
    </div>
    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
  </div>
);
