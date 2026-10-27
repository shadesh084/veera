import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ConfirmModal } from '../components/common/ConfirmModal.jsx';
import { User, Mail, School, Target, Award, LogOut, CheckCircle2 } from 'lucide-react';

export const Profile = () => {
  const { user, profile, updateProfile, logout } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [academicLevel, setAcademicLevel] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [targetPercentage, setTargetPercentage] = useState(85);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAcademicLevel(profile.academic_level || '');
      setInstitutionName(profile.institution_name || '');
      setTargetPercentage(profile.target_percentage || 85);
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile({
        display_name: displayName,
        academic_level: academicLevel || null,
        institution_name: institutionName || null,
        target_percentage: Number(targetPercentage),
      });
      toast.success('Profile preferences updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Profile</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your academic standing, institution details, and preferred target percentages.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity info */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-500/20">
              {displayName ? displayName[0]?.toUpperCase() : 'S'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{displayName || 'Student'}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Overall Academic Goal Target (%)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Target className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={targetPercentage}
                  onChange={(e) => setTargetPercentage(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Academic Level (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Award className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  placeholder="e.g. Undergraduate Junior / Year 11"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Institution Name (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. State University"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-hidden bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to log out of your session?"
        confirmText="Sign Out"
        isDestructive={false}
      />
    </div>
  );
};
