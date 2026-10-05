import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { MenuKey, RolePermissionsMap, UserRole } from '../../types';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
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
  List,
  Sparkles,
  ShieldCheck,
  School
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

  // Role Permissions state for RBAC Menu Visibility
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() =>
    StorageService.getRolePermissions()
  );

  useEffect(() => {
    const handleDataUpdate = () => {
      setRolePermissions(StorageService.getRolePermissions());
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, []);

  const userRole: UserRole = currentUser?.role || 'guru_piket';

  const isAllowed = (menuKey: MenuKey): boolean => {
    if (isAdmin) {
      if (rolePermissions?.admin && rolePermissions.admin[menuKey] === false) {
        return false;
      }
      return true;
    }

    if (!rolePermissions || !rolePermissions[userRole]) return true;
    return rolePermissions[userRole][menuKey] !== false;
  };

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
    : "text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5 mt-5 first:mt-2 select-none";

  // Check group visibility
  const showDataMasterGroup = isAllowed('classes') || isAllowed('students') || isAllowed('students-print');
  const showKehadiranGroup = isAllowed('attendance-check') || isAllowed('manual-input') || isAllowed('attendance-history') || isAllowed('scanner');
  const showLaporanGroup = isAllowed('reports') || isAllowed('reports-rekap') || isAllowed('reports-pdf') || isAllowed('reports-excel');
  const showPengaturanGroup = isAllowed('users') || isAllowed('sidebar-settings') || isAllowed('school-settings') || isAllowed('supabase-settings');

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Main Clean White Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full min-h-screen bg-white border-r border-slate-200/80 text-slate-700 flex flex-col shrink-0 shadow-xs transition-all duration-300 ease-in-out ${
          isMinimalist ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Clean Sidebar Top Header */}
        <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <List className="w-4 h-4" />
            </div>
            {!isMinimalist && (
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Menu Utama
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Sidebar Minimalist / Full Collapse Toggle */}
            <button
              onClick={toggleSidebarMode}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title={isMinimalist ? "Perbesar Sidebar" : "Minimaliskan Sidebar"}
            >
              {isMinimalist ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1 custom-scrollbar">

          {/* =================================================== */}
          {/* KELOMPOK 1: UTAMA */}
          {/* =================================================== */}
          {isAllowed('dashboard') && (
            <>
              <p className={menuGroupClass}>UTAMA</p>

              <button
                onClick={() => handleTabClick('dashboard')}
                title="Dashboard Utama"
                className={`group w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                } ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700 font-bold border-l-3 border-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'dashboard'
                      ? 'text-indigo-600'
                      : 'text-slate-400 group-hover:text-indigo-600'
                  }`}
                />
                {!isMinimalist && <span>Dashboard</span>}
              </button>
            </>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 2: DATA MASTER */}
          {/* =================================================== */}
          {showDataMasterGroup && (
            <>
              <p className={menuGroupClass}>DATA MASTER</p>

              {/* 1. Data Kelas */}
              {isAllowed('classes') && (
                <button
                  onClick={() => handleTabClick('classes')}
                  title="Data Kelas"
                  className={`group w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    activeTab === 'classes'
                      ? 'bg-indigo-50 text-indigo-700 font-bold border-l-3 border-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      activeTab === 'classes'
                        ? 'text-indigo-600'
                        : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  {!isMinimalist && <span>Data Kelas</span>}
                </button>
              )}

              {/* 2. Data Siswa (Accordion) */}
              {(isAllowed('students') || isAllowed('students-print')) && (
                <div>
                  <button
                    onClick={() => toggleAccordion('siswa')}
                    title="Data Siswa"
                    className={`group w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                    } ${
                      ['students', 'students-list', 'students-print'].includes(activeTab)
                        ? 'bg-slate-50 text-indigo-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          ['students', 'students-list', 'students-print'].includes(activeTab)
                            ? 'text-indigo-600'
                            : 'text-slate-400 group-hover:text-indigo-600'
                        }`}
                      />
                      {!isMinimalist && <span>Data Siswa</span>}
                    </div>
                    {!isMinimalist && (
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          openAccordions.siswa ? 'rotate-90 text-indigo-600' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Submenu Accordion Data Siswa */}
                  {!isMinimalist && openAccordions.siswa && (
                    <div className="mt-1 ml-4 pl-3 border-l border-slate-200/70 space-y-0.5 py-0.5">
                      {isAllowed('students') && (
                        <button
                          onClick={() => handleTabClick('students')}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            activeTab === 'students' || activeTab === 'students-list'
                              ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`}
                        >
                          <List className="w-3.5 h-3.5 shrink-0" />
                          <span>Daftar Siswa</span>
                        </button>
                      )}

                      {isAllowed('students-print') && (
                        <button
                          onClick={() => handleTabClick('students-print')}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                            activeTab === 'students-print'
                              ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                          }`}
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          <span>Cetak Data Siswa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 3: KEHADIRAN */}
          {/* =================================================== */}
          {showKehadiranGroup && (
            <>
              <p className={menuGroupClass}>KEHADIRAN</p>

              {/* standalone: Menu Absensi */}
              {isAllowed('attendance-check') && (
                <button
                  onClick={() => handleTabClick('attendance-check')}
                  title="Menu Absensi"
                  className={`group w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    ['attendance-check', 'attendance-today', 'manual-input'].includes(activeTab)
                      ? 'bg-indigo-50 text-indigo-700 font-bold border-l-3 border-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <UserCheck
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      ['attendance-check', 'attendance-today', 'manual-input'].includes(activeTab)
                        ? 'text-indigo-600'
                        : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  {!isMinimalist && <span>Menu Absensi</span>}
                </button>
              )}

              {/* standalone: Menu Riwayat Absensi */}
              {isAllowed('attendance-history') && (
                <button
                  onClick={() => handleTabClick('attendance-history')}
                  title="Menu Riwayat Absensi"
                  className={`group w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    activeTab === 'attendance-history'
                      ? 'bg-indigo-50 text-indigo-700 font-bold border-l-3 border-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      activeTab === 'attendance-history'
                        ? 'text-indigo-600'
                        : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  {!isMinimalist && <span>Menu Riwayat Absensi</span>}
                </button>
              )}

              {/* Only show Kiosk Mode & RFID Input to Guru Piket who are NOT Admin */}
              {isAllowed('scanner') && isGuruPiket && !isAdmin && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => {
                      onOpenKiosk();
                      if (setIsMobileOpen) setIsMobileOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all duration-150 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                      <span>Kiosk Scan Mode</span>
                    </div>
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-tight">LIVE</span>
                  </button>

                  <button
                    onClick={() => handleTabClick('scanner')}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                      activeTab === 'scanner'
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Input Scan RFID / QR</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 4: LAPORAN */}
          {/* =================================================== */}
          {showLaporanGroup && (
            <>
              <p className={menuGroupClass}>LAPORAN</p>

              {/* Laporan Accordion */}
              <div>
                <button
                  onClick={() => toggleAccordion('laporan')}
                  title="Laporan"
                  className={`group w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    ['reports', 'reports-daily', 'reports-weekly', 'reports-monthly', 'reports-rekap', 'reports-pdf', 'reports-excel'].includes(activeTab)
                      ? 'bg-slate-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        ['reports', 'reports-daily', 'reports-weekly', 'reports-monthly', 'reports-rekap', 'reports-pdf', 'reports-excel'].includes(activeTab)
                          ? 'text-indigo-600'
                          : 'text-slate-400 group-hover:text-indigo-600'
                      }`}
                    />
                    {!isMinimalist && <span>Laporan</span>}
                  </div>
                  {!isMinimalist && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        openAccordions.laporan ? 'rotate-90 text-indigo-600' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu Accordion Laporan */}
                {!isMinimalist && openAccordions.laporan && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200/70 space-y-0.5 py-0.5">
                    {isAllowed('reports') && (
                      <button
                        onClick={() => handleTabClick('reports')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'reports' || activeTab === 'reports-daily' || activeTab === 'reports-weekly' || activeTab === 'reports-monthly'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>Laporan Absensi</span>
                      </button>
                    )}

                    {isAllowed('reports-rekap') && (
                      <button
                        onClick={() => handleTabClick('reports-rekap')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'reports-rekap'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        <span>Rekapitulasi Absensi</span>
                      </button>
                    )}

                    {isAllowed('reports-pdf') && (
                      <button
                        onClick={() => handleTabClick('reports-pdf')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'reports-pdf'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span>Cetak PDF</span>
                      </button>
                    )}

                    {isAllowed('reports-excel') && (
                      <button
                        onClick={() => handleTabClick('reports-excel')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'reports-excel'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Export Excel/CSV</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* =================================================== */}
          {/* KELOMPOK 5: PENGATURAN */}
          {/* =================================================== */}
          {showPengaturanGroup && (
            <>
              <p className={menuGroupClass}>PENGATURAN</p>

              {/* Pengaturan Accordion */}
              <div>
                <button
                  onClick={() => toggleAccordion('pengaturan')}
                  title="Pengaturan"
                  className={`group w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isMinimalist ? 'justify-center p-2.5' : 'px-3 py-2.5'
                  } ${
                    ['users', 'sidebar-settings', 'school-settings', 'settings', 'supabase-settings'].includes(activeTab)
                      ? 'bg-slate-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        ['users', 'sidebar-settings', 'school-settings', 'settings', 'supabase-settings'].includes(activeTab)
                          ? 'text-indigo-600'
                          : 'text-slate-400 group-hover:text-indigo-600'
                      }`}
                    />
                    {!isMinimalist && <span>Pengaturan</span>}
                  </div>
                  {!isMinimalist && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        openAccordions.pengaturan ? 'rotate-90 text-indigo-600' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu Accordion Pengaturan */}
                {!isMinimalist && openAccordions.pengaturan && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200/70 space-y-0.5 py-0.5">
                    {isAllowed('users') && (
                      <button
                        onClick={() => handleTabClick('users')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'users'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <UserCog className="w-3.5 h-3.5 shrink-0" />
                        <span>Manajemen User (RBAC)</span>
                      </button>
                    )}

                    {isAllowed('sidebar-settings') && (
                      <button
                        onClick={() => handleTabClick('sidebar-settings')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'sidebar-settings'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 shrink-0" />
                        <span>Pengaturan Sidebar</span>
                      </button>
                    )}

                    {isAllowed('school-settings') && (
                      <button
                        onClick={() => handleTabClick('school-settings')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'school-settings' || activeTab === 'settings'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Settings className="w-3.5 h-3.5 shrink-0" />
                        <span>Jam & Profil Sekolah</span>
                      </button>
                    )}

                    {isAllowed('supabase-settings') && (
                      <button
                        onClick={() => handleTabClick('supabase-settings')}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                          activeTab === 'supabase-settings'
                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Database Supabase & SQL</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Toggle Button & App Meta */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            onClick={toggleSidebarMode}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all duration-150 border border-slate-200/80 shadow-2xs"
            title={isMinimalist ? "Buka Sidebar Full" : "Ciutkan ke Sidebar Minimalis"}
          >
            {isMinimalist ? (
              <PanelLeft className="w-4 h-4 text-indigo-600" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-indigo-600" />
                <span>Ciutkan Sidebar</span>
              </>
            )}
          </button>

          {!isMinimalist && (
            <div className="text-[10px] text-slate-400 text-center font-medium mt-2">
              <p className="font-bold text-slate-600">SMAN 1 Lumbung v2.5</p>
              <p className="text-[9px] text-slate-400">Presensi & Realtime Sync Active</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
