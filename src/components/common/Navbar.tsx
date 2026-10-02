import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { QrCode, Shield, School, Database, Menu } from 'lucide-react';

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
  const { currentUser, switchRole, isAdmin, isGuruPiket } = useAuth();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchRole(e.target.value as UserRole);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 backdrop-blur-md px-4 lg:px-8 py-3 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Zone 1: Mobile Hamburger + Brand Wordmark */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden border border-slate-200"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
              SMAN 1 Lumbung
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Sistem Presensi RFID & QR Code
            </p>
          </div>
        </div>

        {/* Zone 2: Quick Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('attendance-check')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'attendance-check' || activeTab === 'attendance-today'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Absensi
          </button>

          {isGuruPiket && (
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Scan RFID/QR
            </button>
          )}

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab.startsWith('reports')
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Laporan
          </button>
        </nav>

        {/* Zone 3: Actions & RBAC Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Indicator Button for Admin */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('supabase-settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeTab === 'supabase-settings'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Pengaturan Supabase & Skrip SQL Database"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase DB</span>
            </button>
          )}

          {/* Dedicated Kiosk Mode Button for Guru Piket / Admin */}
          {isGuruPiket && (
            <button
              onClick={onOpenKiosk}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all rounded-xl shadow-md shrink-0"
              title="Buka Layar Kiosk Scan Khusus Guru Piket"
            >
              <QrCode className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Kiosk Scan</span>
            </button>
          )}

          {/* Quick Role Switcher Control */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={currentUser?.role || 'admin'}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-semibold text-slate-800 border-none focus:ring-0 focus:outline-none cursor-pointer pr-1"
              title="Ganti Role Akun untuk Pengujian RBAC"
            >
              <option value="admin">Role: Admin</option>
              <option value="guru_piket">Role: Guru Piket</option>
              <option value="wali_kelas">Role: Wali Kelas (XI IPA 1)</option>
            </select>
          </div>

          {/* User Profile Tag */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-indigo-600 capitalize font-medium">
                {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'guru_piket' ? 'Guru Piket' : `Wali Kelas ${currentUser?.assignedClassName || ''}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
