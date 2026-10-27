import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Settings as SettingsIcon, Database, Shield, Sliders, CheckCircle2 } from 'lucide-react';

export const Settings = () => {
  const { isConfigured } = useAuth();
  const toast = useToast();

  const [defaultPeriod, setDefaultPeriod] = useState('all');
  const [enableTips, setEnableTips] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('academitrack_pref_period', defaultPeriod);
    localStorage.setItem('academitrack_pref_tips', JSON.stringify(enableTips));
    toast.success('Application preferences saved.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="pb-2 border-b border-slate-200/80">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings & Preferences</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure application defaults, calculation parameters, and view system status.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              General Preferences
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Customize default views when navigating the academic progress dashboard.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Reporting Period
                </label>
                <select
                  value={defaultPeriod}
                  onChange={(e) => setDefaultPeriod(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
                >
                  <option value="all">All Time (Full History)</option>
                  <option value="last_90_days">Past 90 Days</option>
                  <option value="last_30_days">Past 30 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableTips"
                  checked={enableTips}
                  onChange={(e) => setEnableTips(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <label htmlFor="enableTips" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Display helpful academic study recommendations and study plan reminders
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              Academic Calculation Engine Rules
            </h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              AcademiTrack calculates overall and subject-level scores using strict marks-weighted ratios:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-mono text-xs text-slate-700 space-y-1.5">
              <div>• Assessment Percentage = (marks_obtained / max_marks) * 100</div>
              <div>• Subject Weighted % = (sum of marks obtained / sum of max marks) * 100</div>
              <div>• Overall Percentage = (total marks scored across all tests / total possible max) * 100</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              This guarantees that high-stakes exams (e.g. 100-mark midterms) carry proportional academic weight over 10-mark quizzes.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-600" />
              Database & Security Architecture
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-700">
                {isConfigured
                  ? 'Supabase PostgreSQL RLS Enabled & Connected'
                  : 'Local Workspace Mode (Pre-configured Supabase migrations ready in /supabase)'}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
