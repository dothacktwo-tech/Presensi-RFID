import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  QrCode,
  Shield,
  School,
  Database,
  Menu,
  ChevronDown,
  LogOut,
  UserCheck,
  Monitor,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onOpenKiosk: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenKiosk,
  activeTab,
  setActiveTab,
  onToggleMobileSidebar
}) => {
  const { currentUser, switchRole, logout, isAdmin, isGuruPiket } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchRole(e.target.value as UserRole);
  };

  const handleKioskRedirect = () => {
    setIsProfileDropdownOpen(false);
    onOpenKiosk();
  };

  const handleLogout = () => {
    setIsProfileDropdownOpen(false);
    logout();
    onOpenKiosk(); // Redirect to KIOSK mode upon logout
  };

  const roleTitle = currentUser?.role === 'admin'
    ? 'Administrator'
    : currentUser?.role === 'guru_piket'
    ? 'Guru Piket'
    : `Wali Kelas ${currentUser?.assignedClassName || ''}`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 backdrop-blur-md px-4 lg:px-8 py-3 text-slate-900 shadow-xs">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Zone 1: Brand Wordmark (SATU-SATUNYA TEMPAT LOGO SMAN 1 LUMBUNG) */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden border border-slate-200 transition-colors"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-black tracking-tight text-slate-900 leading-tight">
              SMAN 1 LUMBUNG
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold hidden sm:block">
              Sistem Absensi Digital
            </p>
          </div>
        </div>

        {/* Zone 2: Quick Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('attendance-check')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'attendance-check' || activeTab === 'attendance-today'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Absensi
          </button>

          {isGuruPiket && (
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Scan RFID/QR
            </button>
          )}

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab.startsWith('reports')
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Laporan
          </button>
        </nav>

        {/* Zone 3: Right Actions & Single Top Profile Dropdown Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Indicator Button for Admin */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('supabase-settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                activeTab === 'supabase-settings'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Pengaturan Supabase & Skrip SQL Database"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase DB</span>
            </button>
          )}

          {/* Quick Kiosk Direct Button */}
          {isGuruPiket && (
            <button
              onClick={onOpenKiosk}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all rounded-xl shadow-xs shrink-0"
              title="Buka Layar Kiosk Scan Khusus"
            >
              <QrCode className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Kiosk Scan</span>
            </button>
          )}

          {/* SINGLE PROFILE DROPDOWN MENU (Top Right) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border transition-all ${
                isProfileDropdownOpen
                  ? 'bg-indigo-50/80 border-indigo-200 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
              }`}
              title="Menu Profil & Keluar"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>

              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {currentUser?.name || 'Drs. H. Mulyana, M.Pd.'}
                </p>
                <p className="text-[10px] text-indigo-600 capitalize font-bold leading-none mt-0.5">
                  {roleTitle}
                </p>
              </div>

              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Interactive Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-fade-in space-y-1">
                {/* User Info Header Card */}
                <div className="p-3 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/50 border border-indigo-100/80 rounded-xl mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {currentUser?.name || 'Drs. H. Mulyana, M.Pd.'}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 truncate">
                        NIP: {currentUser?.nip || '19680512 199403 1 004'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="inline-block px-2 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-extrabold rounded-md">
                          {roleTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropdown Action Items */}
                <button
                  onClick={handleKioskRedirect}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors text-left"
                >
                  <Monitor className="w-4 h-4 text-emerald-600" />
                  <span>Redirect ke Mode Kiosk Scan</span>
                </button>

                {/* Role Switcher in Dropdown */}
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 my-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-600" />
                    <span>Ganti Peran Akun (RBAC)</span>
                  </span>
                  <select
                    value={currentUser?.role || 'admin'}
                    onChange={handleRoleChange}
                    className="w-full bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="admin">Administrator (Akses Penuh)</option>
                    <option value="guru_piket">Guru Piket (Operator Kiosk)</option>
                    <option value="wali_kelas">Wali Kelas (XI IPA 1)</option>
                  </select>
                </div>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Keluar (Logout & Redirect Kiosk)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
