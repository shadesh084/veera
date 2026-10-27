import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { subjectService } from '../services/subjectService.js';
import { assessmentService } from '../services/assessmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmModal } from '../components/common/ConfirmModal.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { CardSkeleton, TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import {
  ArrowLeft,
  Plus,
  Calendar,
  ClipboardList,
  Target,
  Award,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const SubjectDetail = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Assessment modal
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [deleteAssessmentTarget, setDeleteAssessmentTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Quiz');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [remarks, setRemarks] = useState('');

  const fetchSubject = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getById(subjectId);
      setSubject(data);
    } catch (err) {
      toast.error(err.message || 'Subject not found.');
      navigate('/subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubject();
  }, [subjectId]);

  const openCreateAssessment = () => {
    setEditingAssessment(null);
    setTitle('');
    setType('Quiz');
    setDate(new Date().toISOString().split('T')[0]);
    setMarksObtained('');
    setMaxMarks('100');
    setRemarks('');
    setIsAssessmentModalOpen(true);
  };

  const openEditAssessment = (a) => {
    setEditingAssessment(a);
    setTitle(a.title);
    setType(a.assessment_type);
    setDate(a.assessment_date);
    setMarksObtained(a.marks_obtained);
    setMaxMarks(a.max_marks);
    setRemarks(a.remarks || '');
    setIsAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        subject_id: subjectId,
        title,
        assessment_type: type,
        assessment_date: date,
        marks_obtained: Number(marksObtained),
        max_marks: Number(maxMarks),
        remarks: remarks || null,
      };

      if (editingAssessment) {
        await assessmentService.update(editingAssessment.id, payload);
        toast.success(`Assessment "${title}" updated.`);
      } else {
        await assessmentService.create(payload);
        toast.success(`Assessment "${title}" recorded.`);
      }

      setIsAssessmentModalOpen(false);
      fetchSubject();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!deleteAssessmentTarget) return;
    try {
      setSubmitting(true);
      await assessmentService.delete(deleteAssessmentTarget.id);
      toast.success(`Assessment "${deleteAssessmentTarget.title}" deleted.`);
      setDeleteAssessmentTarget(null);
      fetchSubject();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (!subject) return null;

  const hasMarks = subject.weighted_percentage !== null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top back button */}
      <div>
        <Link
          to="/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Subjects</span>
        </Link>
      </div>

      {/* Subject Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-slate-400">
                {subject.subject_code || 'COURSE'}
              </span>
              {subject.performance_band && (
                <Badge color={subject.performance_band.color}>{subject.performance_band.label}</Badge>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{subject.name}</h2>
            {subject.description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {subject.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateAssessment}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Test Marks</span>
          </button>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Weighted Percentage
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {hasMarks ? `${subject.weighted_percentage}%` : '—'}
              </span>
              <span className="text-xs text-slate-500">marks-ratio</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Target Goal
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {subject.target_percentage ? `${subject.target_percentage}%` : 'Not set'}
              </span>
              {subject.target_achieved !== null && (
                <span
                  className={`text-xs font-bold ${
                    subject.target_achieved ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {subject.target_achieved ? 'Achieved' : `${subject.target_gap}% gap`}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Recorded Assessments
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{subject.assessments_count}</span>
              <span className="text-xs text-slate-500">completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessments List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assessment History</h3>
            <p className="text-xs text-slate-500">Chronological test records for {subject.name}</p>
          </div>
        </div>

        {(subject.assessments || []).length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ClipboardList}
              title="No Assessments Recorded for this Subject"
              description="Record your first test, quiz, midterm, or assignment to calculate your subject average."
              actionLabel="Add Assessment"
              onAction={openCreateAssessment}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5 text-right">Score</th>
                  <th className="py-3 px-5 text-right">Percentage</th>
                  <th className="py-3 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {subject.assessments.map((a) => {
                  const pct = Math.round((a.marks_obtained / a.max_marks) * 10000) / 100;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {a.title}
                        {a.remarks && (
                          <span className="block text-xs font-normal text-slate-400 mt-0.5 truncate max-w-xs">
                            {a.remarks}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-700">
                          {a.assessment_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                        {a.assessment_date}
                      </td>
                      <td className="py-3.5 px-5 text-right font-medium text-slate-700">
                        {a.marks_obtained} / {a.max_marks}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-900">{pct}%</td>
                      <td className="py-3.5 px-5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditAssessment(a)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAssessmentTarget(a)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Assessment Modal */}
      <Modal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        title={editingAssessment ? 'Edit Assessment' : 'Record Assessment Marks'}
        subtitle={`Subject: ${subject.name}`}
      >
        <form onSubmit={handleSaveAssessment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Quiz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marks Obtained <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Mistakes, notes, feedback..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden resize-none bg-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssessmentModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteAssessmentTarget)}
        onClose={() => setDeleteAssessmentTarget(null)}
        onConfirm={handleDeleteAssessment}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteAssessmentTarget?.title}"? This will recalculate your subject weighted percentage.`}
        confirmText="Delete Assessment"
        isDestructive={true}
        isLoading={submitting}
      />
    </div>
  );
};
