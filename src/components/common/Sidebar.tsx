import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Upload,
  Printer,
  Clock,
  Calendar,
  FileSpreadsheet,
  Download,
  UserCog,
  Sliders,
  Database,
  PanelLeftClose,
  PanelLeft,
  X,
  QrCode,
  List
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenKiosk: () => void;
  sidebarMode: 'full' | 'minimalist';
  setSidebarMode: (mode: 'full' | 'minimalist') => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenKiosk,
  sidebarMode,
  setSidebarMode,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const { currentUser, isAdmin, isGuruPiket } = useAuth();

  const isMinimalist = sidebarMode === 'minimalist';

  // Accordion open state map
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    siswa: false,
    absensi: false,
    laporan: false,
    pengaturan: false
  });

  // Auto-expand parent accordion when activeTab belongs to it
  useEffect(() => {
    if (['students-list', 'students-add', 'students-upload', 'students-print', 'students'].includes(activeTab)) {
      setOpenAccordions(prev => ({ ...prev, siswa: true }));
    } else if (['attendance-check', 'attendance-today', 'manual-input', 'attendance-history'].includes(activeTab)) {
      setOpenAccordions(prev => ({ ...prev, absensi: true }));
    } else if (['reports', 'reports-daily', 'reports-weekly', 'reports-monthly', 'reports-rekap', 'reports-pdf', 'reports-excel'].includes(activeTab)) {
      setOpenAccordions(prev => ({ ...prev, laporan: true }));
    } else if (['users', 'sidebar-settings', 'school-settings', 'settings', 'supabase-settings'].includes(activeTab)) {
      setOpenAccordions(prev => ({ ...prev, pengaturan: true }));
    }
  }, [activeTab]);

  const toggleAccordion = (key: string) => {
    if (isMinimalist) {
      setSidebarMode('full');
      localStorage.setItem('sman1_sidebar_mode', 'full');
    }
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const toggleSidebarMode = () => {
    const nextMode = isMinimalist ? 'full' : 'minimalist';
    setSidebarMode(nextMode);
    localStorage.setItem('sman1_sidebar_mode', nextMode);
  };

  const menuGroupClass = isMinimalist
    ? "hidden"
    : "text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 mt-4";

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full min-h-screen bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0 shadow-sm transition-all duration-300 ${
          isMinimalist ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Mobile Close Bar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span className="font-extrabold text-xs text-slate-900">SMAN 1 Lumbung</span>
          </div>

          <button
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Container */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          {/* User Role Banner */}
          {!isMinimalist ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold capitalize truncate">
                    {currentUser?.role === 'admin' ? 'Admin Administrator' : currentUser?.role === 'guru_piket' ? 'Guru Piket' : `Wali ${currentUser?.assignedClassName || ''}`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3 pt-1">
              <div
                className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-extrabold text-xs"
                title={`${currentUser?.name} (${currentUser?.role})`}
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 1: UTAMA */}
          {/* =================================================== */}
          <p className={menuGroupClass}>UTAMA</p>

          <button
            onClick={() => handleTabClick('dashboard')}
            title="Dashboard"
            className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all ${
              isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
            } ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-600'}`} />
            {!isMinimalist && <span>Dashboard</span>}
          </button>

          {/* =================================================== */}
          {/* KELOMPOK 2: DATA MASTER */}
          {/* =================================================== */}
          <p className={menuGroupClass}>DATA MASTER</p>

          {/* 1. Data Kelas */}
          {isAdmin && (
            <button
              onClick={() => handleTabClick('classes')}
              title="Data Kelas"
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all ${
                isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
              } ${
                activeTab === 'classes'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'classes' ? 'text-white' : 'text-indigo-600'}`} />
              {!isMinimalist && <span>Data Kelas</span>}
            </button>
          )}

          {/* 2. Data Siswa (Accordion) */}
          {isAdmin && (
            <div>
              <button
                onClick={() => toggleAccordion('siswa')}
                title="Data Siswa"
                className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all ${
                  isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
                } ${
                  ['students', 'students-list', 'students-add', 'students-upload', 'students-print'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  {!isMinimalist && <span>Data Siswa</span>}
                </div>
                {!isMinimalist && (
                  openAccordions.siswa ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )
                )}
              </button>

              {/* Submenu Accordion Data Siswa */}
              {!isMinimalist && openAccordions.siswa && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                  <button
                    onClick={() => handleTabClick('students')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      activeTab === 'students' || activeTab === 'students-list'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 shrink-0" />
                    <span>Daftar Siswa</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('students-add')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      activeTab === 'students-add'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Tambah Siswa</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('students-upload')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      activeTab === 'students-upload'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Import / Upload Data</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('students-print')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      activeTab === 'students-print'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>Cetak Data Siswa</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 3: KEHADIRAN */}
          {/* =================================================== */}
          <p className={menuGroupClass}>KEHADIRAN</p>

          {/* Absensi Accordion */}
          <div>
            <button
              onClick={() => toggleAccordion('absensi')}
              title="Absensi"
              className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all ${
                isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
              } ${
                ['attendance-check', 'attendance-today', 'manual-input', 'attendance-history', 'scanner'].includes(activeTab)
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                {!isMinimalist && <span>Absensi</span>}
              </div>
              {!isMinimalist && (
                openAccordions.absensi ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )
              )}
            </button>

            {/* Submenu Accordion Absensi */}
            {!isMinimalist && openAccordions.absensi && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                <button
                  onClick={() => handleTabClick('attendance-check')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'attendance-check' || activeTab === 'attendance-today'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Absensi Hari Ini</span>
                </button>

                <button
                  onClick={() => handleTabClick('manual-input')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'manual-input'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Absensi Manual</span>
                </button>

                <button
                  onClick={() => handleTabClick('attendance-history')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'attendance-history'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Riwayat Absensi</span>
                </button>

                {isGuruPiket && (
                  <>
                    <button
                      onClick={() => {
                        onOpenKiosk();
                        if (setIsMobileOpen) setIsMobileOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all mt-1"
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                        <span>Kiosk Scan Mode</span>
                      </div>
                      <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">LIVE</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('scanner')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        activeTab === 'scanner'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Input Scan RFID / QR</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* =================================================== */}
          {/* KELOMPOK 4: LAPORAN */}
          {/* =================================================== */}
          <p className={menuGroupClass}>LAPORAN</p>

          {/* Laporan Accordion */}
          <div>
            <button
              onClick={() => toggleAccordion('laporan')}
              title="Laporan"
              className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all ${
                isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
              } ${
                ['reports', 'reports-daily', 'reports-weekly', 'reports-monthly', 'reports-rekap', 'reports-pdf', 'reports-excel'].includes(activeTab)
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                {!isMinimalist && <span>Laporan</span>}
              </div>
              {!isMinimalist && (
                openAccordions.laporan ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )
              )}
            </button>

            {/* Submenu Accordion Laporan */}
            {!isMinimalist && openAccordions.laporan && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                <button
                  onClick={() => handleTabClick('reports-daily')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-daily' || activeTab === 'reports'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Laporan Harian</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports-weekly')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-weekly'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Laporan Mingguan</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports-monthly')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-monthly'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Laporan Bulanan</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports-rekap')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-rekap'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>Rekapitulasi Absensi</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports-pdf')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-pdf'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>Cetak PDF</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports-excel')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'reports-excel'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Export Excel/CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* =================================================== */}
          {/* KELOMPOK 5: PENGATURAN */}
          {/* =================================================== */}
          <p className={menuGroupClass}>PENGATURAN</p>

          {/* Pengaturan Accordion */}
          <div>
            <button
              onClick={() => toggleAccordion('pengaturan')}
              title="Pengaturan"
              className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all ${
                isMinimalist ? 'justify-center p-3' : 'px-3.5 py-2.5'
              } ${
                ['users', 'sidebar-settings', 'school-settings', 'settings', 'supabase-settings'].includes(activeTab)
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-indigo-600 shrink-0" />
                {!isMinimalist && <span>Pengaturan</span>}
              </div>
              {!isMinimalist && (
                openAccordions.pengaturan ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )
              )}
            </button>

            {/* Submenu Accordion Pengaturan */}
            {!isMinimalist && openAccordions.pengaturan && (
              <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                {isAdmin && (
                  <button
                    onClick={() => handleTabClick('users')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      activeTab === 'users'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <UserCog className="w-3.5 h-3.5 shrink-0" />
                    <span>Manajemen User (RBAC)</span>
                  </button>
                )}

                <button
                  onClick={() => handleTabClick('sidebar-settings')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTab === 'sidebar-settings'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span>Pengaturan Sidebar</span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleTabClick('school-settings')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        activeTab === 'school-settings' || activeTab === 'settings'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5 shrink-0" />
                      <span>Jam & Profil Sekolah</span>
                    </button>

                    <button
                      onClick={() => handleTabClick('supabase-settings')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        activeTab === 'supabase-settings'
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Database Supabase & SQL</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Toggle Button */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={toggleSidebarMode}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 mb-2"
            title={isMinimalist ? "Buka Sidebar Full" : "Ciutkan ke Sidebar Minimalis"}
          >
            {isMinimalist ? (
              <PanelLeft className="w-4 h-4 text-indigo-600" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-indigo-600" />
                <span>Sidebar Minimalis</span>
              </>
            )}
          </button>

          {!isMinimalist && (
            <div className="text-[10px] text-slate-500 text-center font-medium">
              <p className="font-bold text-slate-700">SMAN 1 Lumbung v2.5</p>
              <p>Mode: {isMinimalist ? 'Minimalis' : 'Full'}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
