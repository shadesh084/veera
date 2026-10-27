import React, { useState, useEffect } from 'react';
import { assessmentService } from '../services/assessmentService.js';
import { subjectService } from '../services/subjectService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmModal } from '../components/common/ConfirmModal.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { TableSkeleton } from '../components/common/LoadingSkeleton.jsx';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

export const Assessments = () => {
  const toast = useToast();
  const [assessments, setAssessments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('assessment_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('Quiz');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMarks, setFormMarks] = useState('');
  const [formMax, setFormMax] = useState('100');
  const [formRemarks, setFormRemarks] = useState('');

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedType) params.assessment_type = selectedType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.search = search;
      params.sort_by = sortBy;
      params.sort_order = sortOrder;

      const [assessRes, subjRes] = await Promise.all([
        assessmentService.getAll(params),
        subjectService.getAll(),
      ]);

      setAssessments(assessRes);
      setSubjects(subjRes);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch assessments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [selectedSubject, selectedType, startDate, endDate, sortBy, sortOrder]);

  const openCreateModal = () => {
    if (subjects.length === 0) {
      toast.warning('Please add a subject first before recording assessments.');
      return;
    }
    setEditingAssessment(null);
    setFormSubjectId(subjects[0]?.id || '');
    setFormTitle('');
    setFormType('Quiz');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMarks('');
    setFormMax('100');
    setFormRemarks('');
    setIsModalOpen(true);
  };

  const openEditModal = (a) => {
    setEditingAssessment(a);
    setFormSubjectId(a.subject_id);
    setFormTitle(a.title);
    setFormType(a.assessment_type);
    setFormDate(a.assessment_date);
    setFormMarks(a.marks_obtained);
    setFormMax(a.max_marks);
    setFormRemarks(a.remarks || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formSubjectId) {
      toast.error('Please select a subject.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        subject_id: formSubjectId,
        title: formTitle,
        assessment_type: formType,
        assessment_date: formDate,
        marks_obtained: Number(formMarks),
        max_marks: Number(formMax),
        remarks: formRemarks || null,
      };

      if (editingAssessment) {
        await assessmentService.update(editingAssessment.id, payload);
        toast.success(`Assessment "${formTitle}" updated.`);
      } else {
        await assessmentService.create(payload);
        toast.success(`Assessment "${formTitle}" recorded.`);
      }

      setIsModalOpen(false);
      fetchAssessments();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await assessmentService.delete(deleteTarget.id);
      toast.success(`Assessment "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      fetchAssessments();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const resetFilters = () => {
    setSelectedSubject('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSortBy('assessment_date');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assessments & Marks</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Log and review quizzes, assignments, midterms, and project grades.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Marks</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or remarks..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            >
              <option value="">All Assessment Types</option>
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

          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              title="End Date"
            />
          </div>
        </div>

        {(selectedSubject || selectedType || startDate || endDate || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtered Results ({assessments.length})</span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-brand-600 hover:text-brand-700 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Assessment Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search || selectedSubject ? 'No Matching Assessments Found' : 'No Assessments Recorded Yet'}
          description={
            search || selectedSubject
              ? 'Try adjusting your filters or date range.'
              : 'Record your first test, quiz, midterm, or practical marks to track your score.'
          }
          actionLabel={search || selectedSubject ? undefined : 'Record First Assessment'}
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-5">
                    <button
                      type="button"
                      onClick={() => toggleSort('title')}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      <span>Title</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">
                    <button
                      type="button"
                      onClick={() => toggleSort('assessment_date')}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5 text-right">Marks</th>
                  <th className="py-3 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('marks_obtained')}
                      className="inline-flex items-center gap-1 hover:text-slate-700 ml-auto"
                    >
                      <span>Percentage</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {a.title}
                      {a.remarks && (
                        <span className="block text-xs font-normal text-slate-400 mt-0.5 truncate max-w-xs">
                          {a.remarks}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-medium text-slate-800">
                        {a.subject?.name || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
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
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-extrabold text-slate-900">{a.percentage}%</span>
                        {a.performance_band && (
                          <Badge color={a.performance_band.color} size="xs">
                            {a.performance_band.label}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(a)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssessment ? 'Edit Assessment' : 'Record Assessment Marks'}
        subtitle="Marks obtained cannot exceed maximum possible marks."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            >
              <option value="" disabled>
                Select a subject...
              </option>
              {subjects.map((s) => (
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
              maxLength={150}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Unit 2 Linear Algebra Quiz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
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
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
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
                value={formMarks}
                onChange={(e) => setFormMarks(e.target.value)}
                placeholder="e.g. 48"
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
                value={formMax}
                onChange={(e) => setFormMax(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              maxLength={1000}
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Mistakes to review, revision topics..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden resize-none bg-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone and will recalculate your overall weighted score.`}
        confirmText="Delete Assessment"
        isDestructive={true}
        isLoading={submitting}
      />
    </div>
  );
};
