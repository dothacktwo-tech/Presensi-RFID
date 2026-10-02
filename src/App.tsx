import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storage';
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
import { AttendanceRecord, StudentClass, Student } from './types';
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

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

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

  const loadDashboardData = useCallback(() => {
    setStudents(StorageService.getStudents());
    setClasses(StorageService.getClasses());
    setAttendances(StorageService.getAttendances());
  }, []);

  useEffect(() => {
    StorageService.init();
    loadDashboardData();
  }, [loadDashboardData]);

  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter(a => a.date === today);

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
            loadDashboardData();
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
                        SMAN 1 Lumbung • Presensi Siswa
                      </span>
                      <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight mt-0.5">
                        Sistem Presensi Siswa SMAN 1 Lumbung
                      </h2>
                      <p className="text-xs text-indigo-100 mt-1">
                        {isWaliKelas
                          ? `Menampilkan statistik untuk kelas yang diampu: ${currentUser?.assignedClassName}`
                          : 'Monitoring kehadiran siswa terintegrasi pemindaian RFID & QR Code.'}
                      </p>
                    </div>

                    {isGuruPiket && (
                      <button
                        onClick={() => setIsKioskFullscreen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                      >
                        <QrCode className="w-4 h-4 animate-pulse" />
                        <span>Buka Mode Kiosk Scan</span>
                      </button>
                    )}
                  </div>

                  {/* Stat Cards with Period Switcher */}
                  <StatCards
                    students={students}
                    attendances={attendances}
                  />

                  {/* Grid Charts & Recent Stream */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AttendanceChart
                      classes={classes}
                      attendances={attendances}
                      students={students}
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
                      loadDashboardData();
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
