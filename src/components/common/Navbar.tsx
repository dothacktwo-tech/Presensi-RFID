import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { QrCode, Shield, UserCheck, School } from 'lucide-react';

interface NavbarProps {
  onOpenKiosk: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenKiosk, activeTab, setActiveTab }) => {
  const { currentUser, switchRole, isAdmin, isGuruPiket, isWaliKelas } = useAuth();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchRole(e.target.value as UserRole);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 text-white">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-mx">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-bold tracking-tight text-white leading-tight">
              SMAN 1 Lumbung
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Sistem Presensi RFID & QR Code
            </p>
          </div>
        </div>

        {/* Zone 2: Quick Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('attendance-check')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'attendance-check'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Absensi Kehadiran
          </button>

          {isGuruPiket && (
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Scan Absensi
            </button>
          )}

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Rekap Laporan
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Master Siswa
            </button>
          )}
        </nav>

        {/* Zone 3: Actions & RBAC Switcher */}
        <div className="flex items-center gap-3">
          {/* Dedicated Kiosk Mode Button for Guru Piket / Admin */}
          {isGuruPiket && (
            <button
              onClick={onOpenKiosk}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all rounded-lg shadow-md shadow-emerald-900/30 shrink-0"
              title="Buka Layar Kiosk Scan Khusus Guru Piket"
            >
              <QrCode className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Mode Kiosk Scan</span>
            </button>
          )}

          {/* Quick Role Switcher Control */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={currentUser?.role || 'admin'}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-medium text-slate-200 border-none focus:ring-0 focus:outline-none cursor-pointer pr-1"
              title="Ganti Role Akun untuk Pengujian RBAC"
            >
              <option value="admin" className="bg-slate-900 text-white">Role: Admin</option>
              <option value="guru_piket" className="bg-slate-900 text-white">Role: Guru Piket</option>
              <option value="wali_kelas" className="bg-slate-900 text-white">Role: Wali Kelas (XI IPA 1)</option>
            </select>
          </div>

          {/* User Profile Tag */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-indigo-400 capitalize">
                {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'guru_piket' ? 'Guru Piket' : `Wali Kelas ${currentUser?.assignedClassName || ''}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
