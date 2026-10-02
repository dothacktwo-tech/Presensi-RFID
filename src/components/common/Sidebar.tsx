import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  QrCode,
  FileSpreadsheet,
  Users,
  Building2,
  UserCog,
  Settings,
  Clock,
  LogOut,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenKiosk: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenKiosk }) => {
  const { currentUser, isAdmin, isGuruPiket, isWaliKelas, logout } = useAuth();

  const menuGroupClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-4";

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <div className="p-4 flex-1 space-y-1">
        {/* User Role Card Banner */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
              <p className="text-[11px] text-indigo-400 font-medium capitalize">
                {currentUser?.role === 'admin' && 'Akses: Admin Full'}
                {currentUser?.role === 'guru_piket' && 'Akses: Guru Piket'}
                {currentUser?.role === 'wali_kelas' && `Wali Kelas ${currentUser?.assignedClassName || ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* MENU 1: UTAMA */}
        <p className={menuGroupClass}>Menu Utama</p>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-indigo-400" />
          <span>Dashboard Analitik</span>
        </button>

        {/* MENU 2: ABSENSI KEHADIRAN & SUB-MENU ABSENSI MANUAL */}
        <p className={menuGroupClass}>Absensi Kehadiran</p>

        <button
          onClick={() => setActiveTab('attendance-check')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'attendance-check'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Absensi Kehadiran</span>
        </button>

        {/* SUB-MENU ABSENSI MANUAL */}
        <button
          onClick={() => setActiveTab('manual-input')}
          className={`w-full flex items-center gap-3 pl-8 pr-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'manual-input'
              ? 'bg-indigo-600/30 text-indigo-200 border-l-2 border-indigo-500 font-semibold'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>└ Absensi Manual</span>
        </button>

        {/* MENU 3: KIOSK SCANNER (Guru Piket & Admin) */}
        {isGuruPiket && (
          <>
            <p className={menuGroupClass}>Kiosk Scanner</p>

            <button
              onClick={onOpenKiosk}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Layar Kiosk Scanner</span>
              </div>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-mono">LIVE</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'scanner'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Input Scan RFID / QR</span>
            </button>
          </>
        )}

        {/* MENU 3: REKAPITULASI & LAPORAN */}
        <p className={menuGroupClass}>Laporan & Rekap</p>

        <button
          onClick={() => setActiveTab('reports')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>
            {isWaliKelas ? `Laporan ${currentUser?.assignedClassName || 'Kelas'}` : 'Rekapitulasi Laporan'}
          </span>
        </button>

        {/* MENU 4: MASTER DATA (ADMIN ONLY) */}
        {isAdmin && (
          <>
            <p className={menuGroupClass}>Master Data</p>

            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Data Siswa & Bulk Upload</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'classes'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Data Kelas & Wali Kelas</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCog className="w-4 h-4 text-indigo-400" />
              <span>Manajemen User (RBAC)</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Pengaturan Jam Sekolah</span>
            </button>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">SMAN 1 Lumbung v2.4</p>
        <p>Integrasi RFID USB & QR Code</p>
      </div>
    </aside>
  );
};
