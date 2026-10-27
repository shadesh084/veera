import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService.js';
import { subjectService } from '../services/subjectService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { ChartSkeleton, CardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import {
  TrendingUp,
  Award,
  Target,
  BarChart2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';

export const Progress = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSubjectId) params.subject_id = selectedSubjectId;

      if (period === 'last_30_days') {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        params.start_date = past.toISOString().split('T')[0];
      } else if (period === 'last_90_days') {
        const past = new Date();
        past.setDate(past.getDate() - 90);
        params.start_date = past.toISOString().split('T')[0];
      }

      const [progData, subjList] = await Promise.all([
        analyticsService.getProgress(params),
        subjectService.getAll(),
      ]);

      setData(progData);
      setSubjects(subjList);
    } catch (err) {
      toast.error(err.message || 'Failed to load progress analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [period, selectedSubjectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const subjectMetrics = data?.subjects || [];
  const typeBreakdown = data?.type_breakdown || [];

  const COLOR_PALETTE = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Academic Progress & Trends
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Historical trajectory, subject comparison, and goal attainment diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Time range pill buttons */}
          <div className="bg-slate-200/60 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_90_days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'last_90_days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90 Days
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last_30_days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === 'last_30_days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Overall Weighted Performance
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900">
              {data?.overall_percentage !== null ? `${data.overall_percentage}%` : '—'}
            </span>
            {data?.performance_band && (
              <Badge color={data.performance_band.color}>{data.performance_band.label}</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Based on {data?.total_assessments || 0} recorded assessments
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Target Achievement Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {data?.profile_target ? `${data.profile_target}% Target` : 'Target Unset'}
            </span>
          </div>
          {data?.profile_target && data?.overall_percentage !== null && (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
              {data.target_achieved ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Target Achieved (+{data.target_gap}%)
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Gap to Target ({data.target_gap}%)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Performance Trajectory
          </span>
          <div className="text-base font-bold text-slate-900 mt-1 capitalize">
            {data?.trend?.status ? data.trend.status.replace('_', ' ') : 'Steady'}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {data?.trend?.message || 'Sufficient assessments needed to calculate trajectory.'}
          </p>
        </div>
      </div>

      {/* Chronological Progress Line Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Chronological Performance Timeline</h3>
            <p className="text-xs text-slate-500">
              Blue line: individual test score % • Purple line: cumulative running weighted %
            </p>
          </div>
        </div>

        {timeline.length >= 2 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  formatter={(val, name) => [
                    `${val}%`,
                    name === 'score_pct' ? 'Test Score' : 'Cumulative Ratio',
                  ]}
                  labelFormatter={(date, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.date} — ${item.subject}: ${item.title}` : date;
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(val) => (val === 'score_pct' ? 'Assessment Score' : 'Running Cumulative %')}
                />
                <Line
                  type="monotone"
                  dataKey="score_pct"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative_pct"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <TrendingUp className="w-8 h-8 mb-2 stroke-1" />
            <span>Record at least two assessments to establish a historical trend line.</span>
          </div>
        )}
      </div>

      {/* Subject-Wise Comparison Table and Target Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Subject Performance Gaps</h3>
          <p className="text-xs text-slate-500 mb-5">
            Comparison of current weighted scores against subject target percentages
          </p>

          <div className="space-y-4">
            {subjectMetrics.map((s) => {
              const score = s.weighted_percentage || 0;
              const target = s.target_percentage || 85;
              const gap = Math.round((score - target) * 100) / 100;
              const achieved = score >= target;

              return (
                <div key={s.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-800">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">
                        {s.weighted_percentage !== null ? `${s.weighted_percentage}%` : 'No tests'}
                      </span>
                      <span className="text-slate-400">/ Goal: {target}%</span>
                    </div>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        achieved ? 'bg-emerald-500' : score < 60 ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{s.assessments_count} assessments</span>
                    {s.weighted_percentage !== null && (
                      <span className={`font-semibold ${achieved ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {achieved ? `Goal achieved (+${gap}%)` : `Needs +${Math.abs(gap)}% to reach goal`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assessment Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Assessment Categories</h3>
          <p className="text-xs text-slate-500 mb-5">Average performance by assessment type</p>

          {typeBreakdown.length > 0 ? (
            <div className="space-y-3">
              {typeBreakdown.map((item, idx) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{item.type}</span>
                    <span className="text-[11px] text-slate-400">{item.count} recorded</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-extrabold text-slate-900">
                      {item.percentage !== null ? `${item.percentage}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Layers className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <span>No categories recorded yet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
