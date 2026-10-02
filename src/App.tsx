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
import { AttendanceRecord, StudentClass, Student } from './types';
import { formatIndonesianDate } from './utils/dateUtils';
import { QrCode, Sparkles, AlertCircle, School, Clock } from 'lucide-react';

function AppContent() {
  const { currentUser, isAdmin, isGuruPiket, isWaliKelas } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isKioskFullscreen, setIsKioskFullscreen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dashboard Data State
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-600 selection:text-white">
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
          />

          <div className="flex flex-1">
            {/* Sidebar Navigation */}
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenKiosk={() => setIsKioskFullscreen(true)}
            />

            {/* Main Application Canvas */}
            <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
              {/* TAB 1: DASHBOARD ANALITIK */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Banner Info */}
                  <div className="bg-gradient-to-r from-indigo-900/80 via-slate-900 to-slate-900 border border-indigo-800/50 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                        SMAN 1 Lumbung • Presensi Siswa
                      </span>
                      <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight mt-0.5">
                        Sistem Presensi Siswa SMAN 1 Lumbung
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        {isWaliKelas
                          ? `Menampilkan statistik untuk kelas yang diampu: ${currentUser?.assignedClassName}`
                          : 'Monitoring kehadiran siswa terintegrasi pemindaian RFID & QR Code.'}
                      </p>
                    </div>

                    {isGuruPiket && (
                      <button
                        onClick={() => setIsKioskFullscreen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
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

              {/* TAB 2: ABSENSI KEHADIRAN (CHECK DAFTAR HADIR/SAKIT/IZIN/ALPA) */}
              {activeTab === 'attendance-check' && (
                <div className="animate-fade-in">
                  <AttendanceCheck
                    onOpenManualInput={() => setActiveTab('manual-input')}
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* TAB 3: KIOSK SCANNER PAGE */}
              {activeTab === 'scanner' && isGuruPiket && (
                <div className="animate-fade-in">
                  <KioskScanner />
                </div>
              )}

              {/* TAB 4: MANUAL INPUT (SUB-MENU) */}
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

              {/* TAB 4: REPORTS */}
              {activeTab === 'reports' && (
                <div className="animate-fade-in">
                  <AttendanceReport
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* TAB 5: MASTER STUDENTS */}
              {activeTab === 'students' && isAdmin && (
                <div className="animate-fade-in">
                  <StudentManagement
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* TAB 6: MASTER CLASSES */}
              {activeTab === 'classes' && isAdmin && (
                <div className="animate-fade-in">
                  <ClassManagement
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* TAB 7: MASTER USERS (RBAC) */}
              {activeTab === 'users' && isAdmin && (
                <div className="animate-fade-in">
                  <UserManagement
                    onNotify={(type, title, message) => addToast(type, title, message)}
                  />
                </div>
              )}

              {/* TAB 8: SCHOOL SETTINGS */}
              {activeTab === 'settings' && isAdmin && (
                <div className="animate-fade-in">
                  <SchoolSettings
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
