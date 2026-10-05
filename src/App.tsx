import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSyncData } from './hooks/useSyncData';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { KioskScanner } from './components/scanner/KioskScanner';
import { ManualInputModal } from './components/scanner/ManualInputModal';
import { AttendanceCheck } from './components/attendance/AttendanceCheck';
import { StatCards } from './components/dashboard/StatCards';
import { AttendanceChart } from './components/dashboard/AttendanceChart';
import { RecentScansList } from './components/dashboard/RecentScansList';
import { StudentManagement } from './components/master/StudentManagement';
import { ClassManagement } from './components/master/ClassManagement';
import { UserManagement } from './components/master/UserManagement';
import { AttendanceReport } from './components/report/AttendanceReport';
import { SchoolSettings } from './components/settings/SchoolSettings';
import { SupabaseSettings } from './components/settings/SupabaseSettings';
import { SidebarSettings } from './components/settings/SidebarSettings';
import { LoginPage } from './components/auth/LoginPage';
import { QrCode } from 'lucide-react';

function AppContent() {
  const { currentUser, isAdmin, isGuruPiket, isWaliKelas } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isKioskFullscreen, setIsKioskFullscreen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [sidebarMode, setSidebarMode] = useState<'full' | 'minimalist'>(() => {
    const saved = localStorage.getItem('sman1_sidebar_mode');
    return saved === 'minimalist' || saved === 'full' ? saved : 'full';
  });

  // UNIFIED DATA-FETCHING HOOK WITH SYNCHRONOUS SUPABASE PARITY & REALTIME DIAGNOSTICS
  const {
    students,
    classes,
    attendances,
    isSyncing,
    lastSyncTime,
    diagnosticSummary,
    syncData,
    getDisplayedStudents,
    getDisplayedAttendances,
    getDisplayedClasses
  } = useSyncData({ autoFetchRemoteOnMount: true, enableLogging: true });

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const today = new Date().toISOString().split('T')[0];

  const displayedStudents = getDisplayedStudents(currentUser?.role, currentUser?.assignedClassId);
  const displayedAttendances = getDisplayedAttendances(currentUser?.role, currentUser?.assignedClassId);
  const displayedClasses = getDisplayedClasses(currentUser?.role, currentUser?.assignedClassId);

  const todayAttendances = displayedAttendances.filter(a => a.date === today);

  // If user is not authenticated, render Login Page
  if (!currentUser) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <LoginPage />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* FULLSCREEN KIOSK OVERLAY MODE */}
      {isKioskFullscreen ? (
        <KioskScanner
          isKioskFullscreen={true}
          onCloseKiosk={() => {
            setIsKioskFullscreen(false);
            syncData(true);
          }}
        />
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Top Bar Header */}
          <Navbar
            onOpenKiosk={() => setIsKioskFullscreen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          />

          <div className="flex flex-1 relative">
            {/* Sidebar Navigation */}
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenKiosk={() => setIsKioskFullscreen(true)}
              sidebarMode={sidebarMode}
              setSidebarMode={setSidebarMode}
              isMobileOpen={isMobileSidebarOpen}
              setIsMobileOpen={setIsMobileSidebarOpen}
            />

            {/* Main Application Canvas */}
            <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
              {/* KELOMPOK 1: UTAMA */}
              {/* 1. Dashboard */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Banner Info Clean Light */}
                  <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl p-6 shadow-md text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-widest">
                        Dashboard Realtime Presensi
                      </span>
                      <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight mt-0.5">
                        Ringkasan Monitoring Kehadiran Siswa
                      </h2>
                      <p className="text-xs text-indigo-100 mt-1">
                        {isWaliKelas
                          ? `Menampilkan statistik untuk kelas yang diampu: ${currentUser?.assignedClassName}`
                          : 'Monitoring kehadiran siswa terintegrasi pemindaian RFID & QR Code.'}
                      </p>
                    </div>

                    {isGuruPiket && !isAdmin && (
                      <button
                        onClick={() => setIsKioskFullscreen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        <QrCode className="w-4 h-4 animate-pulse" />
                        <span>Buka Mode Kiosk Scan</span>
                      </button>
                    )}
                  </div>

                  {/* Stat Cards with Period Switcher & Sync Controls */}
                  <StatCards
                    students={displayedStudents}
                    attendances={displayedAttendances}
                    isSyncing={isSyncing}
                    onForceSync={() => syncData(true)}
                    lastSyncTime={lastSyncTime}
                    diagnosticSummary={diagnosticSummary}
                  />

                  {/* Grid Charts & Recent Stream */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AttendanceChart
                      classes={displayedClasses}
                      attendances={displayedAttendances}
                      students={displayedStudents}
                    />
                    <RecentScansList records={todayAttendances.slice(0, 8)} />
                  </div>
                </div>
              )}

              {/* KELOMPOK 2: DATA MASTER */}
              {/* 2. Data Kelas */}
              {activeTab === 'classes' && isAdmin && (
                <div className="animate-fade-in">
                  <ClassManagement
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* 3. Data Siswa & Submenu (Daftar, Tambah, Import/Upload, Cetak) */}
              {['students', 'students-list', 'students-add', 'students-upload', 'students-print'].includes(activeTab) && isAdmin && (
                <div className="animate-fade-in">
                  <StudentManagement
                    key={activeTab}
                    defaultOpenForm={activeTab === 'students-add'}
                    defaultOpenBulk={activeTab === 'students-upload'}
                    defaultOpenPrint={activeTab === 'students-print'}
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* KELOMPOK 3: KEHADIRAN */}
              {/* Absensi Hari Ini / Riwayat Absensi */}
              {['attendance', 'attendance-check', 'attendance-today', 'attendance-history'].includes(activeTab) && (
                <div className="animate-fade-in">
                  <AttendanceCheck
                    isHistoryMode={activeTab === 'attendance-history'}
                    onOpenManualInput={() => setActiveTab('manual-input')}
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* Absensi Manual */}
              {activeTab === 'manual-input' && (
                <div className="animate-fade-in">
                  <ManualInputModal
                    onSuccess={(msg) => {
                      addToast('success', 'Presensi Disimpan', msg);
                      syncData(true);
                    }}
                  />
                </div>
              )}

              {/* Kiosk Scanner */}
              {activeTab === 'scanner' && isGuruPiket && (
                <div className="animate-fade-in">
                  <KioskScanner />
                </div>
              )}

              {/* KELOMPOK 4: LAPORAN */}
              {/* Submenu Laporan (Harian, Mingguan, Bulanan, Rekap, PDF, Excel) */}
              {['reports', 'reports-daily', 'reports-weekly', 'reports-monthly', 'reports-rekap', 'reports-pdf', 'reports-excel'].includes(activeTab) && (
                <div className="animate-fade-in">
                  <AttendanceReport
                    key={activeTab}
                    defaultMode={
                      activeTab === 'reports-weekly' ? 'weekly' :
                      activeTab === 'reports-monthly' ? 'monthly' :
                      activeTab === 'reports-rekap' ? 'rekap' :
                      activeTab === 'reports-pdf' ? 'pdf' :
                      activeTab === 'reports-excel' ? 'excel' : 'daily'
                    }
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* KELOMPOK 5: PENGATURAN */}
              {/* Manajemen User (RBAC) */}
              {activeTab === 'users' && isAdmin && (
                <div className="animate-fade-in">
                  <UserManagement
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* Pengaturan Sidebar */}
              {activeTab === 'sidebar-settings' && (
                <div className="animate-fade-in">
                  <SidebarSettings
                    sidebarMode={sidebarMode}
                    setSidebarMode={setSidebarMode}
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* Jam & Profil Sekolah */}
              {(activeTab === 'school-settings' || activeTab === 'settings') && isAdmin && (
                <div className="animate-fade-in">
                  <SchoolSettings
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* Database Supabase & SQL */}
              {activeTab === 'supabase-settings' && isAdmin && (
                <div className="animate-fade-in">
                  <SupabaseSettings
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
