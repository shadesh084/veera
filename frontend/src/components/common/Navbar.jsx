import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Menu, LogOut, User, Bell } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal.jsx';

export const Navbar = ({ onToggleMobile }) => {
  const { user, profile, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student';
  const academicLevel = profile?.academic_level;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs text-slate-400 font-medium">Student Portal</span>
            <h1 className="text-sm font-semibold text-slate-800">
              Welcome back, <span className="text-brand-600">{displayName}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {academicLevel && (
            <span className="hidden md:inline-flex text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/60">
              {academicLevel}
            </span>
          )}

          {/* Profile pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-semibold text-slate-800 leading-tight">
                {displayName}
              </span>
              <span className="block text-[11px] text-slate-400 leading-tight truncate max-w-[120px]">
                {user?.email}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout confirmation dialog */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out of AcademiTrack"
        message="Are you sure you want to end your current session? You will need to log in again to access your academic dashboard."
        confirmText="Sign Out"
        isDestructive={false}
      />
    </>
  );
};
