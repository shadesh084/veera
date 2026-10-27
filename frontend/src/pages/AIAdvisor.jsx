import React, { useState, useEffect } from 'react';
import { aiAdvisorService } from '../services/aiAdvisorService.js';
import { studyPlanService } from '../services/studyPlanService.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { CardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  Send,
  BookOpen,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';

export const AIAdvisor = () => {
  const toast = useToast();

  const [statusData, setStatusData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [studyPlans, setStudyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // Advisory Request Form
  const [studentQuestion, setStudentQuestion] = useState('');
  const [weakTopics, setWeakTopics] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('all');

  // Generated Plan Review Modal (Requires explicit user confirmation before saving)
  const [pendingPlan, setPendingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, plansRes] = await Promise.all([
        aiAdvisorService.getStatus(),
        studyPlanService.getAll(),
      ]);
      setStatusData(statusRes);
      setStudyPlans(plansRes);

      // Trigger initial analysis
      const analysisRes = await aiAdvisorService.analyze({ reporting_period: 'all' });
      setAnalysis(analysisRes.data);
    } catch (err) {
      toast.error(err.message || 'Failed to initialize AI advisor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunAnalysis = async (e) => {
    if (e) e.preventDefault();
    try {
      setAnalyzing(true);
      const res = await aiAdvisorService.analyze({
        reporting_period: reportingPeriod,
        student_question: studentQuestion || null,
        weak_topics: weakTopics || null,
      });
      setAnalysis(res.data);
      toast.success('Performance analysis generated.');
    } catch (err) {
      toast.error(err.message || 'Unable to analyze performance.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const topicsArray = weakTopics ? weakTopics.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const res = await aiAdvisorService.generateStudyPlan({
        weak_topics: topicsArray,
      });
      setPendingPlan(res.data);
      setIsPlanModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to generate study plan.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleConfirmSavePlan = async () => {
    if (!pendingPlan) return;
    try {
      setSavingPlan(true);
      await studyPlanService.create({
        title: pendingPlan.title,
        description: pendingPlan.rationale,
        start_date: pendingPlan.start_date,
        end_date: pendingPlan.end_date,
        status: 'active',
        tasks: pendingPlan.tasks,
      });
      toast.success('AI-generated study plan confirmed and saved to your schedule!');
      setIsPlanModalOpen(false);
      setPendingPlan(null);
      const updatedPlans = await studyPlanService.getAll();
      setStudyPlans(updatedPlans);
    } catch (err) {
      toast.error(err.message || 'Failed to save study plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleToggleTask = async (planId, taskId) => {
    try {
      await studyPlanService.toggleTask(planId, taskId);
      const updatedPlans = await studyPlanService.getAll();
      setStudyPlans(updatedPlans);
    } catch (err) {
      toast.error('Failed to toggle task completion.');
    }
  };

  const handleDeletePlan = async (id) => {
    try {
      await studyPlanService.delete(id);
      toast.success('Study plan removed.');
      const updatedPlans = await studyPlanService.getAll();
      setStudyPlans(updatedPlans);
    } catch (err) {
      toast.error('Failed to delete study plan.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              AI Academic Advisor
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {statusData?.status === 'available' ? 'Gemini 2.5 Active' : 'Heuristic Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Personalized academic diagnostics, strengths identification, and manageable weekly study plans.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGeneratePlan}
          disabled={generatingPlan}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <Brain className="w-4 h-4" />
          <span>{generatingPlan ? 'Generating Plan...' : 'Generate 7-Day Plan'}</span>
        </button>
      </div>

      {/* Advisory Query Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-brand-600" />
          Ask Advisor or Highlight Weak Topics
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Provide optional questions or specific topics (e.g. "Integration by parts, Photosynthesis") to focus the analysis.
        </p>

        <form onSubmit={handleRunAnalysis} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Specific Question or Goal
              </label>
              <input
                type="text"
                value={studentQuestion}
                onChange={(e) => setStudentQuestion(e.target.value)}
                placeholder="e.g. How can I raise my Calculus score from 80% to 90%?"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Topics Needing Practice (comma-separated)
              </label>
              <input
                type="text"
                value={weakTopics}
                onChange={(e) => setWeakTopics(e.target.value)}
                placeholder="e.g. Boundary conditions, Vector projections"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Reporting Range:</span>
              <select
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white font-medium"
              >
                <option value="all">All Records</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="last_30_days">Last 30 Days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Analyzing...' : 'Update Insights'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Analysis Output Section */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Diagnostic Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Executive Summary Card */}
            <div className="bg-gradient-to-br from-brand-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Brain className="w-4 h-4" />
                Performance Synthesis
              </div>
              <h3 className="text-lg font-bold mb-2 leading-snug">{analysis.summary}</h3>
              <p className="text-xs text-brand-100/90 leading-relaxed">
                {analysis.performance_assessment}
              </p>
              {analysis.encouragement && (
                <div className="mt-4 pt-3 border-t border-brand-800/80 text-[11px] text-brand-200/90 italic">
                  "{analysis.encouragement}"
                </div>
              )}
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Academic Strengths
                </div>
                {analysis.strengths?.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.strengths.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <span className="block text-xs font-bold text-emerald-900">{item.subject}</span>
                        <p className="text-xs text-emerald-800 mt-0.5">{item.observation}</p>
                        <span className="block text-[10px] text-emerald-600 mt-1 font-mono">
                          {item.evidence}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Add more assessments to identify strengths.</p>
                )}
              </div>

              {/* Areas for Improvement */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Prioritized Attention
                </div>
                {analysis.areas_for_improvement?.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.areas_for_improvement.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">{item.subject}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold uppercase bg-amber-200 text-amber-800">
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">{item.gap}</p>
                        <p className="text-[11px] text-amber-900/80 mt-1 font-medium leading-relaxed">
                          → {item.recommended_action}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No critical attention areas identified.</p>
                )}
              </div>
            </div>

            {/* Revision Strategies */}
            {analysis.revision_strategies?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Recommended Revision Protocols
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.revision_strategies.map((strat, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                      <h5 className="text-xs font-bold text-slate-800">{strat.title}</h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{strat.method}</p>
                      <span className="inline-block mt-2 text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                        {strat.frequency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Priority Actions & Saved Study Plans */}
          <div className="space-y-5">
            {/* Priority Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                Immediate Action Items
              </h4>
              <ul className="space-y-2.5">
                {(analysis.priority_actions || []).map((action, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Active Study Plans List */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Study Schedules
                </h4>
                <span className="text-[11px] font-bold text-brand-600">
                  {studyPlans.length} {studyPlans.length === 1 ? 'Plan' : 'Plans'}
                </span>
              </div>

              {studyPlans.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Calendar className="w-6 h-6 mx-auto mb-2 stroke-1" />
                  <span>No study plans saved yet. Click "Generate 7-Day Plan" above.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {studyPlans.map((plan) => (
                    <div key={plan.id} className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{plan.title}</h5>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {plan.start_date} → {plan.end_date}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Task checklist */}
                      <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-2.5">
                        {(plan.tasks || []).map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(plan.id, task.id)}
                            className="flex items-start gap-2 cursor-pointer group"
                          >
                            <button type="button" className="text-brand-600 mt-0.5">
                              {task.completed ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-xs block leading-snug ${
                                  task.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-700 font-medium'
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {task.estimated_minutes} min • {task.priority} priority
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Generated Study Plan Confirmation Modal */}
      {/* Explicit student confirmation required per Section 4.6 */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Review AI-Generated Study Plan"
        subtitle="Review the recommended weekly tasks before confirming and saving to your schedule."
        maxWidth="max-w-xl"
      >
        {pendingPlan && (
          <div className="space-y-4">
            <div className="bg-brand-50/70 p-3.5 rounded-xl border border-brand-100">
              <h4 className="text-sm font-bold text-brand-900">{pendingPlan.title}</h4>
              <p className="text-xs text-brand-800/90 mt-1 leading-relaxed">{pendingPlan.rationale}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-brand-700 font-semibold font-mono">
                <span>Start: {pendingPlan.start_date}</span>
                <span>•</span>
                <span>End: {pendingPlan.end_date}</span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Proposed Tasks ({pendingPlan.tasks?.length})
              </h5>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {pendingPlan.tasks?.map((task, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{task.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-slate-200 text-slate-700">
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <span>{task.subject_name}</span>
                      <span>•</span>
                      <span>{task.estimated_minutes} minutes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmSavePlan}
                disabled={savingPlan}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50"
              >
                {savingPlan ? 'Saving Schedule...' : 'Confirm & Save Schedule'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
