import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService.js';
import { aiAdvisorService } from '../services/aiAdvisorService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { TableSkeleton, CardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const Reports = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // AI Summary on report
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await reportService.getSummary(params);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handleExportCsv = async () => {
    try {
      setDownloading(true);
      await reportService.downloadCsv({ start_date: startDate, end_date: endDate });
      toast.success('Academic report CSV exported successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to download CSV export.');
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    try {
      setGeneratingAi(true);
      const res = await aiAdvisorService.analyze({
        reporting_period: startDate ? 'custom' : 'all',
      });
      setAiSummary(res.data);
      toast.success('AI Report Summary generated.');
    } catch (err) {
      toast.error('Could not generate AI summary.');
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  const assessments = data?.assessments || [];
  const subjects = data?.subjects || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Reports</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate customized academic performance transcripts and export your verified data as CSV.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateAiSummary}
            disabled={generatingAi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generatingAi ? 'Summarizing...' : 'AI Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={downloading || assessments.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Reporting Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
          >
            Clear Date Range
          </button>
        )}
      </div>

      {/* AI Summary Banner if requested */}
      {aiSummary && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-900 to-indigo-900 text-white shadow-md animate-fade-in">
          <div className="flex items-center gap-2 text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            AI Executive Academic Summary
          </div>
          <h4 className="text-base font-bold mb-1.5">{aiSummary.summary}</h4>
          <p className="text-xs text-brand-100/90 leading-relaxed max-w-4xl">
            {aiSummary.performance_assessment}
          </p>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Overall Weighted Score
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {data?.overall_percentage !== null ? `${data.overall_percentage}%` : '—'}
          </div>
          <span className="text-[11px] text-slate-400">Total marks-weighted ratio</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Subjects Tracked
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{data?.total_subjects}</div>
          <span className="text-[11px] text-slate-400">Active enrollments</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Highest Subject
          </span>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {data?.best_performing_subject?.name || '—'}
          </div>
          <span className="text-xs font-black text-emerald-600">
            {data?.best_performing_subject?.percentage ? `${data.best_performing_subject.percentage}%` : 'N/A'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Attention Subject
          </span>
          <div className="text-base font-bold text-slate-900 mt-1 truncate">
            {data?.lowest_performing_subject?.name || '—'}
          </div>
          <span className="text-xs font-black text-amber-600">
            {data?.lowest_performing_subject?.percentage ? `${data.lowest_performing_subject.percentage}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Subject-Wise Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Subject Breakdown</h3>
          <p className="text-xs text-slate-500">Subject scores and assessment counts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 px-5">Subject Name</th>
                <th className="py-3 px-5">Code</th>
                <th className="py-3 px-5 text-center">Assessments</th>
                <th className="py-3 px-5 text-right">Weighted Percentage</th>
                <th className="py-3 px-5 text-right">Goal Target</th>
                <th className="py-3 px-5 text-center">Band</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-5 font-bold text-slate-900">{s.name}</td>
                  <td className="py-3 px-5 text-slate-500 font-mono text-xs">
                    {s.subject_code || '—'}
                  </td>
                  <td className="py-3 px-5 text-center font-medium text-slate-700">
                    {s.assessments_count}
                  </td>
                  <td className="py-3 px-5 text-right font-black text-slate-900">
                    {s.weighted_percentage !== null ? `${s.weighted_percentage}%` : '—'}
                  </td>
                  <td className="py-3 px-5 text-right text-slate-500">
                    {s.target_percentage ? `${s.target_percentage}%` : '—'}
                  </td>
                  <td className="py-3 px-5 text-center">
                    {s.performance_band ? (
                      <Badge color={s.performance_band.color}>{s.performance_band.label}</Badge>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Assessments History */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assessment History Log</h3>
            <p className="text-xs text-slate-500">
              Showing {assessments.length} assessment records in selected period
            </p>
          </div>
        </div>

        {assessments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No assessments recorded in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Assessment</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5 text-right">Marks</th>
                  <th className="py-3 px-5 text-right">Percentage</th>
                  <th className="py-3 px-5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-5 text-slate-500 font-mono text-xs">{a.assessment_date}</td>
                    <td className="py-3 px-5 font-semibold text-slate-800">
                      {a.subject?.name || 'General'}
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-900">{a.title}</td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700">
                        {a.assessment_type}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-slate-700">
                      {a.marks_obtained} / {a.max_marks}
                    </td>
                    <td className="py-3 px-5 text-right font-black text-slate-900">
                      {a.percentage}%
                    </td>
                    <td className="py-3 px-5 text-slate-500 text-xs truncate max-w-xs">
                      {a.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
