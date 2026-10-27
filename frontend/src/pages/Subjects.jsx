import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectService } from '../services/subjectService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmModal } from '../components/common/ConfirmModal.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { CardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Target,
  Award,
  ClipboardList,
} from 'lucide-react';

const ALLOWED_COLORS = [
  'indigo', 'blue', 'cyan', 'teal', 'emerald', 'green', 'amber', 'orange', 'rose', 'purple', 'slate'
];

export const Subjects = () => {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [targetPercentage, setTargetPercentage] = useState(85);
  const [color, setColor] = useState('indigo');

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await subjectService.getAll();
      setSubjects(res);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setSubjectCode('');
    setDescription('');
    setTargetPercentage(85);
    setColor('indigo');
    setIsModalOpen(true);
  };

  const openEditModal = (s, e) => {
    e.stopPropagation();
    setEditingSubject(s);
    setName(s.name);
    setSubjectCode(s.subject_code || '');
    setDescription(s.description || '');
    setTargetPercentage(s.target_percentage || 85);
    setColor(s.color || 'blue');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name,
        subject_code: subjectCode || null,
        description: description || null,
        target_percentage: Number(targetPercentage),
        color,
      };

      if (editingSubject) {
        await subjectService.update(editingSubject.id, payload);
        toast.success(`Subject "${name}" updated.`);
      } else {
        await subjectService.create(payload);
        toast.success(`Subject "${name}" added.`);
      }

      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSubjectTarget) return;
    try {
      setSubmitting(true);
      const res = await subjectService.delete(deleteSubjectTarget.id);
      toast.success(res.message || 'Subject deleted.');
      setDeleteSubjectTarget(null);
      fetchSubjects();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.subject_code && s.subject_code.toLowerCase().includes(term)) ||
      (s.description && s.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Subjects</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your courses, target scores, and view subject-specific performance.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects by name or code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? 'No Matching Subjects' : 'No Subjects Added Yet'}
          description={
            search
              ? 'Try modifying your search query to find your subject.'
              : 'Add your first subject to start tracking assessments, weighted percentages, and study plans.'
          }
          actionLabel={search ? undefined : 'Add First Subject'}
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((s) => {
            const hasMarks = s.weighted_percentage !== null;
            const targetMet = hasMarks && s.target_percentage !== null && s.weighted_percentage >= s.target_percentage;

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{
                          backgroundColor:
                            s.color === 'rose'
                              ? '#f43f5e'
                              : s.color === 'emerald'
                              ? '#10b981'
                              : s.color === 'amber'
                              ? '#f59e0b'
                              : s.color === 'cyan'
                              ? '#06b6d4'
                              : s.color === 'purple'
                              ? '#8b5cf6'
                              : '#6366f1',
                        }}
                      />
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {s.subject_code || 'COURSE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(s, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSubjectTarget(s);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Link to={`/subjects/${s.id}`} className="block group-hover:text-brand-600 transition-colors">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{s.name}</h3>
                  </Link>

                  {s.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>
                  )}
                </div>

                {/* Metrics footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Weighted Score
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xl font-extrabold text-slate-900">
                        {hasMarks ? `${s.weighted_percentage}%` : '—'}
                      </span>
                      {s.performance_band && (
                        <span className="text-[10px] font-bold text-slate-500">
                          ({s.performance_band.grade})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Target / Tests
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600 font-medium">
                      <span>{s.target_percentage ? `${s.target_percentage}%` : 'No goal'}</span>
                      <span className="text-slate-300">•</span>
                      <span>{s.assessments_count} tests</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subject Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        subtitle={
          editingSubject
            ? 'Update subject name, code, description, and target performance.'
            : 'Enter course details to start recording assessment scores.'
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Chemistry"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
              <input
                type="text"
                maxLength={30}
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. CHEM-301"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Course description, professor, semester notes..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden resize-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color Tag</label>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor:
                      c === 'rose'
                        ? '#f43f5e'
                        : c === 'emerald'
                        ? '#10b981'
                        : c === 'amber'
                        ? '#f59e0b'
                        : c === 'cyan'
                        ? '#06b6d4'
                        : c === 'purple'
                        ? '#8b5cf6'
                        : c === 'teal'
                        ? '#14b8a6'
                        : c === 'orange'
                        ? '#f97316'
                        : '#6366f1',
                  }}
                />
              ))}
            </div>
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
              {submitting ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteSubjectTarget)}
        onClose={() => setDeleteSubjectTarget(null)}
        onConfirm={handleDelete}
        title={`Delete Subject: ${deleteSubjectTarget?.name}`}
        message={`Are you sure you want to delete "${deleteSubjectTarget?.name}"? WARNING: All assessments and records associated with this subject will be permanently deleted.`}
        confirmText="Permanently Delete Subject"
        isDestructive={true}
        isLoading={submitting}
      />
    </div>
  );
};
