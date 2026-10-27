import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService.js';
import { subjectService } from '../services/subjectService.js';
import { assessmentService } from '../services/assessmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { CardSkeleton, ChartSkeleton } from '../components/common/LoadingSkeleton.jsx';
import { Modal } from '../components/common/Modal.jsx';
import {
  BookOpen,
  ClipboardList,
  Award,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export const Dashboard = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick Action Modals
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);

  // Quick Add Subject Form
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectTarget, setSubjectTarget] = useState(85);
  const [subjectColor, setSubjectColor] = useState('indigo');
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);

  // Quick Add Assessment Form
  const [assessmentSubjectId, setAssessmentSubjectId] = useState('');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState('Quiz');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [assessmentRemarks, setAssessmentRemarks] = useState('');
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await analyticsService.getDashboard();
      setData(res);
      if (res.subjects?.length > 0 && !assessmentSubjectId) {
        setAssessmentSubjectId(res.subjects[0].id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      setSubjectSubmitting(true);
      await subjectService.create({
        name: subjectName,
        subject_code: subjectCode || null,
        target_percentage: Number(subjectTarget),
        color: subjectColor,
      });
      toast.success(`Subject "${subjectName}" created.`);
      setShowAddSubject(false);
      setSubjectName('');
      setSubjectCode('');
      fetchDashboard();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubjectSubmitting(false);
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!assessmentSubjectId) {
      toast.error('Please select a subject.');
      return;
    }
    try {
      setAssessmentSubmitting(true);
      await assessmentService.create({
        subject_id: assessmentSubjectId,
        title: assessmentTitle,
        assessment_type: assessmentType,
        assessment_date: assessmentDate,
        marks_obtained: Number(marksObtained),
        max_marks: Number(maxMarks),
        remarks: assessmentRemarks || null,
      });
      toast.success(`Assessment "${assessmentTitle}" recorded.`);
      setShowAddAssessment(false);
      setAssessmentTitle('');
      setMarksObtained('');
      fetchDashboard();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const hasSubjects = (data?.total_subjects || 0) > 0;
  const hasAssessments = (data?.total_assessments || 0) > 0;

  // Prepare chart data
  const subjectChartData = (data?.subjects || [])
    .filter((s) => s.weighted_percentage !== null)
    .map((s) => ({
      name: s.name.length > 14 ? `${s.name.substring(0, 12)}…` : s.name,
      fullName: s.name,
      score: s.weighted_percentage,
      target: s.target_percentage || 85,
    }));

  const COLOR_PALETTE = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time performance metrics computed from verified assessment records.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddSubject(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Subject</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddAssessment(true)}
            disabled={!hasSubjects}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Marks</span>
          </button>
        </div>
      </div>

      {/* When empty */}
      {!hasSubjects ? (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Enrolled Yet"
          description="Create your first subject (e.g. Mathematics, Physics, Computer Science) to begin recording marks and calculating weighted analytics."
          actionLabel="Create First Subject"
          onAction={() => setShowAddSubject(true)}
        />
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Weighted Percentage */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Overall Score
                </span>
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data?.overall_percentage !== null ? `${data.overall_percentage}%` : '—'}
                </span>
                {data?.performance_band && (
                  <Badge color={data.performance_band.color}>{data.performance_band.label}</Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Marks-weighted ratio: total scored / total max
              </p>
            </div>

            {/* Subjects & Assessments Count */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tracked Records
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-2xl font-bold text-slate-900">{data?.total_subjects}</span>
                  <span className="text-xs text-slate-500 ml-1">Subjects</span>
                </div>
                <div className="text-slate-300">/</div>
                <div>
                  <span className="text-2xl font-bold text-slate-900">{data?.total_assessments}</span>
                  <span className="text-xs text-slate-500 ml-1">Tests</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Average per subject: {data?.average_subject_percentage !== null ? `${data.average_subject_percentage}%` : 'N/A'}
              </p>
            </div>

            {/* Best Performing Subject */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Top Subject
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              {data?.best_performing_subject ? (
                <>
                  <div className="text-base font-bold text-slate-900 truncate">
                    {data.best_performing_subject.name}
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                    {data.best_performing_subject.percentage}%
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400 italic">No marks recorded yet</div>
              )}
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Highest marks-weighted percentage</p>
            </div>

            {/* Needs Attention Subject */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Needs Attention
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              {data?.lowest_performing_subject ? (
                <>
                  <div className="text-base font-bold text-slate-900 truncate">
                    {data.lowest_performing_subject.name}
                  </div>
                  <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
                    {data.lowest_performing_subject.percentage}%
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400 italic">All subjects on track</div>
              )}
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Target for upcoming study revisions</p>
            </div>
          </div>

          {/* Historical Trend Banner */}
          {data?.trend && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    data.trend.status === 'improving'
                      ? 'bg-emerald-50 text-emerald-600'
                      : data.trend.status === 'declining'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Trend Status:{' '}
                    <span className="capitalize text-brand-600">{data.trend.status.replace('_', ' ')}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{data.trend.message}</p>
                </div>
              </div>
              <Link
                to="/ai-advisor"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Get AI Study Plan</span>
              </Link>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject-Wise Performance Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Subject Performance</h3>
                  <p className="text-xs text-slate-500">Marks-weighted percentage per subject</p>
                </div>
                <Link
                  to="/progress"
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                >
                  <span>Detailed View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {subjectChartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
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
                        formatter={(val) => [`${val}%`, 'Score']}
                        labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          borderRadius: '0.75rem',
                          border: 'none',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {subjectChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <BookOpen className="w-8 h-8 mb-2 stroke-1" />
                  <span>No subject assessment scores recorded yet.</span>
                </div>
              )}
            </div>

            {/* Recent Assessments List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Assessments</h3>
                    <p className="text-xs text-slate-500">Latest recorded academic marks</p>
                  </div>
                  <Link
                    to="/assessments"
                    className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {(data?.recent_assessments || []).length > 0 ? (
                    data.recent_assessments.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
                      >
                        <div className="min-w-0 pr-3">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="font-medium text-slate-600">{item.subject?.name || 'General'}</span>
                            <span>•</span>
                            <span>{item.assessment_type}</span>
                            <span>•</span>
                            <span>{item.assessment_date}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-sm font-extrabold text-slate-900">
                            {item.percentage}%
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {item.marks_obtained}/{item.max_marks}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 stroke-1" />
                      No assessments recorded yet. Record marks using the button above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Add Subject Modal */}
      <Modal
        isOpen={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        title="Add Academic Subject"
        subtitle="Create a subject to begin organizing tests and grades."
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Advanced Calculus"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. MATH-201"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={subjectTarget}
                onChange={(e) => setSubjectTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color Tag</label>
            <div className="flex flex-wrap gap-2">
              {['indigo', 'blue', 'cyan', 'teal', 'emerald', 'amber', 'orange', 'rose', 'purple'].map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSubjectColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      subjectColor === color ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color === 'rose' ? '#f43f5e' : color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : color === 'cyan' ? '#06b6d4' : color === 'indigo' ? '#6366f1' : color === 'purple' ? '#8b5cf6' : color === 'teal' ? '#14b8a6' : color === 'orange' ? '#f97316' : '#3b82f6' }}
                  />
                )
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddSubject(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={subjectSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
            >
              {subjectSubmitting ? 'Saving...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Assessment Modal */}
      <Modal
        isOpen={showAddAssessment}
        onClose={() => setShowAddAssessment(false)}
        title="Record Assessment Marks"
        subtitle="Enter test marks obtained to update your percentage and trend analytics."
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={assessmentSubjectId}
              onChange={(e) => setAssessmentSubjectId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            >
              <option value="" disabled>
                Select a subject...
              </option>
              {(data?.subjects || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.subject_code ? `(${s.subject_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. Unit 3 Trigonometry Test"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              >
                <option value="Quiz">Quiz</option>
                <option value="Assignment">Assignment</option>
                <option value="Unit Test">Unit Test</option>
                <option value="Midterm Examination">Midterm Examination</option>
                <option value="Final Examination">Final Examination</option>
                <option value="Practical">Practical</option>
                <option value="Project">Project</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marks Scored <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="e.g. 42"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Possible <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
            <textarea
              rows={2}
              value={assessmentRemarks}
              onChange={(e) => setAssessmentRemarks(e.target.value)}
              placeholder="Notes, concepts requiring review, feedback..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddAssessment(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assessmentSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
            >
              {assessmentSubmitting ? 'Recording...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
