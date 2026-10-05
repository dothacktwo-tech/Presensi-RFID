import React, { useState, useEffect } from 'react';
import {
  testSupabaseConnection,
  checkAllTablesStatus,
  autoCreateAndSyncTables,
  pullFromSupabase,
  SUPABASE_SQL_SCRIPT,
  TableCheckResult,
  runStateAndDatabaseDiagnostic,
  purgeGhostRecords,
  DiagnosticReport
} from '../../services/supabase';
import {
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Zap,
  DownloadCloud,
  UploadCloud,
  Loader2,
  Search,
  Trash2,
  AlertTriangle,
  FileSearch
} from 'lucide-react';

interface SupabaseSettingsProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({ onNotify }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState('Sedang mengecek koneksi ke Supabase...');
  const [tables, setTables] = useState<TableCheckResult[]>([]);
  const [copied, setCopied] = useState(false);

  // Sync Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  // Diagnostic Utility State
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvhejxzczpbzmpkrbkkn.supabase.co';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_z9QI0j-xF_SQCt0W5EIHWA_AWrWlCoi';

  const handleTestConnection = async () => {
    setStatus('checking');
    setStatusMessage('Menghubungi server Supabase...');

    const result = await testSupabaseConnection();
    if (result.success) {
      setStatus('connected');
      setStatusMessage(result.message);
    } else {
      setStatus('error');
      setStatusMessage(result.message);
    }

    const tableStatuses = await checkAllTablesStatus();
    setTables(tableStatuses);
  };

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    onNotify('success', 'Skrip SQL Disalin', 'Skrip DDL SQL untuk 8 tabel berhasil disalin ke clipboard.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAutoCreateAndSync = async () => {
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressMsg('Mempersiapkan transaksi sinkronisasi...');
    onNotify('info', 'Otomatisasi Tabel', 'Proses pembuatan & sinkronisasi data ke Supabase sedang berlangsung...');

    await new Promise(r => setTimeout(r, 400));
    setProgressPercent(35);
    setProgressMsg('Memformat 8 tabel utama & transaksi lokal...');

    await new Promise(r => setTimeout(r, 500));
    setProgressPercent(70);
    setProgressMsg('Mengirimkan payload ke Supabase Cloud REST API...');

    const res = await autoCreateAndSyncTables();

    setProgressPercent(100);
    setProgressMsg('Sinkronisasi selesai!');
    await new Promise(r => setTimeout(r, 400));

    setIsProcessing(false);
    setProgressPercent(0);

    if (res.success) {
      onNotify('success', 'Tabel & Data Berhasil Disiapkan!', `Berhasil menyinkronkan ${res.syncedCount} record ke seluruh tabel Supabase Cloud.`);
    } else {
      onNotify('error', 'Pemberitahuan Tabel', `Tabel belum ada atau butuh eksekusi SQL. Silakan tempel Skrip SQL di SQL Editor Supabase. Detail: ${res.messages.join('; ')}`);
    }

    handleTestConnection();
  };

  const handlePullDataFromCloud = async () => {
    setIsPulling(true);
    setProgressPercent(20);
    setProgressMsg('Mengecek perubahan di Supabase Cloud...');
    onNotify('info', 'Sinkronisasi Cloud', 'Menarik data terbaru dari Database Supabase Cloud...');

    await new Promise(r => setTimeout(r, 400));
    setProgressPercent(60);
    setProgressMsg('Menarik record dari 8 tabel cloud ke LocalStorage...');

    const res = await pullFromSupabase();

    setProgressPercent(100);
    setProgressMsg('Tarik data selesai!');
    await new Promise(r => setTimeout(r, 400));

    setIsPulling(false);
    setProgressPercent(0);

    if (res.success) {
      onNotify('success', 'Sinkronisasi Data Berhasil!', res.message);
    } else {
      onNotify('error', 'Gagal Pull Sync', res.message);
    }

    handleTestConnection();
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    onNotify('info', 'Menjalankan Audit Diagnostik', 'Memeriksa dan membandingkan record LocalStorage vs Supabase Cloud...');
    const report = await runStateAndDatabaseDiagnostic();
    setDiagnosticReport(report);
    setIsDiagnosing(false);
    onNotify('success', 'Hasil Audit Diagnostik Siap', report.crossReference.analysisMessage);
  };

  const handlePurgeGhostRecords = async () => {
    const res = await purgeGhostRecords();
    if (res.success) {
      onNotify('success', 'Pembersihan Ghost Records', res.message);
      handleRunDiagnostic();
    } else {
      onNotify('error', 'Gagal Purge Records', res.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Database Supabase & SQL Automatic Generator</h2>
            <p className="text-xs text-slate-500">
              Pengelolaan otomatis 8 tabel utama (`settings`, `classes`, `users`, `students`, `attendances`, `role_permissions`, `locked_dates`, `audit_logs`)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunDiagnostic}
            disabled={isDiagnosing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            title="Audit Diagnostik Cross-Reference Record Siswa & Presensi"
          >
            <FileSearch className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
            <span>{isDiagnosing ? 'Mengaudit...' : 'Audit Diagnostik Data'}</span>
          </button>

          <button
            onClick={handlePullDataFromCloud}
            disabled={isPulling || isProcessing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            title="Sikronkan & Tarik Data dari Database Supabase Cloud ke Aplikasi"
          >
            <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>{isPulling ? 'Menarik Data Cloud...' : 'Tarik Data dari Cloud (Pull Sync)'}</span>
          </button>

          <button
            onClick={handleAutoCreateAndSync}
            disabled={isProcessing || isPulling}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <UploadCloud className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
            <span>{isProcessing ? 'Proses Sync...' : 'Kirim / Sinkron Data ke Cloud'}</span>
          </button>

          <button
            onClick={handleTestConnection}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
            title="Cek Ulang Status Tabel Database"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SYNC PROGRESS UPDATE INDICATOR BAR */}
      {(isProcessing || isPulling) && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>{progressMsg}</span>
            </span>
            <span className="font-mono font-bold text-indigo-700">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC AUDIT REPORT PANEL */}
      {diagnosticReport && (
        <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <FileSearch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Laporan Audit Diagnostik System & Ghost Records</h3>
                <p className="text-[11px] text-slate-500 font-mono">Diperbarui: {new Date(diagnosticReport.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>

            <button
              onClick={handlePurgeGhostRecords}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan Ghost Records (Purge)</span>
            </button>
          </div>

          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium leading-relaxed">
            <strong>Status Cross-Reference:</strong> {diagnosticReport.crossReference.analysisMessage}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Local Storage Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                <span>1. LocalStorage State (Runtime)</span>
                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {diagnosticReport.localState.studentsCount} Siswa
                </span>
              </h4>
              <ul className="space-y-1 text-slate-600 font-mono text-[11px]">
                <li>• Presensi Local: <strong>{diagnosticReport.localState.attendancesCount}</strong> record</li>
                <li>• Rombel Local: <strong>{diagnosticReport.localState.classesCount}</strong> record</li>
                <li>• User Local: <strong>{diagnosticReport.localState.usersCount}</strong> record</li>
              </ul>
            </div>

            {/* Supabase Cloud Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center justify-between">
                <span>2. Supabase Cloud DB</span>
                <span className={`font-mono px-2 py-0.5 rounded border ${
                  diagnosticReport.remoteDatabase.connected
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : 'text-rose-600 bg-rose-50 border-rose-100'
                }`}>
                  {diagnosticReport.remoteDatabase.connected ? `${diagnosticReport.remoteDatabase.studentsCount} Siswa` : 'Terputus'}
                </span>
              </h4>
              <ul className="space-y-1 text-slate-600 font-mono text-[11px]">
                <li>• Presensi Cloud: <strong>{diagnosticReport.remoteDatabase.attendancesCount}</strong> record</li>
                <li>• Rombel Cloud: <strong>{diagnosticReport.remoteDatabase.classesCount}</strong> record</li>
                <li>• User Cloud: <strong>{diagnosticReport.remoteDatabase.usersCount}</strong> record</li>
              </ul>
            </div>
          </div>

          {/* Ghost Records Detail list */}
          {(diagnosticReport.crossReference.ghostStudentsInLocal.length > 0 || diagnosticReport.crossReference.ghostAttendancesInLocal.length > 0 || diagnosticReport.crossReference.orphanAttendancesInLocal.length > 0) && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-2">
              <h4 className="font-bold flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Rincian Ghost / Mismatch Records Ditemukan:</span>
              </h4>

              {diagnosticReport.crossReference.ghostStudentsInLocal.length > 0 && (
                <div>
                  <span className="font-bold text-[11px] block text-rose-900">Ghost Siswa di LocalStorage:</span>
                  <ul className="list-disc list-inside font-mono text-[11px] text-rose-800">
                    {diagnosticReport.crossReference.ghostStudentsInLocal.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnosticReport.crossReference.ghostAttendancesInLocal.length > 0 && (
                <div>
                  <span className="font-bold text-[11px] block text-rose-900">Ghost Presensi di LocalStorage:</span>
                  <ul className="list-disc list-inside font-mono text-[11px] text-rose-800">
                    {diagnosticReport.crossReference.ghostAttendancesInLocal.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnosticReport.crossReference.orphanAttendancesInLocal.length > 0 && (
                <div>
                  <span className="font-bold text-[11px] block text-rose-900">Absensi Yatim (Orphan ID):</span>
                  <ul className="list-disc list-inside font-mono text-[11px] text-rose-800">
                    {diagnosticReport.crossReference.orphanAttendancesInLocal.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Database Connection & Table Status Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Status Seluruh Tabel Database Supabase</h3>
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Seluruh Tabel Siap & Terhubung</span>
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
              <XCircle className="w-4 h-4 text-amber-600" />
              <span>Gunakan Tombol 'Salin Skrip SQL'</span>
            </span>
          )}
          {status === 'checking' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-full">
              <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
              <span>Memeriksa Status Tabel...</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">{statusMessage}</p>

        {/* 8 Individual Tables Overview Grid */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Daftar 8 Tabel Otomatis Supabase Cloud:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'settings', label: '1. Settings', desc: 'Pengaturan Sekolah' },
              { id: 'classes', label: '2. Classes', desc: 'Rombel & Wali' },
              { id: 'users', label: '3. Users', desc: 'Akun & Peran' },
              { id: 'students', label: '4. Students', desc: 'Master Siswa' },
              { id: 'attendances', label: '5. Attendances', desc: 'Presensi Harian' },
              { id: 'role_permissions', label: '6. Permissions', desc: 'Matriks RBAC' },
              { id: 'locked_dates', label: '7. Locked Dates', desc: 'Kunci Presensi' },
              { id: 'audit_logs', label: '8. Audit Logs', desc: 'Jejak Aktivitas' }
            ].map((tblInfo) => {
              const tblStatus = tables.find(t => t.name === tblInfo.id);
              const exists = tblStatus?.exists;

              return (
                <div
                  key={tblInfo.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    exists
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs">{tblInfo.label}</span>
                      {exists ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">{tblInfo.desc}</p>
                  </div>

                  <div className="text-[11px] font-bold">
                    {exists ? (
                      <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block">
                        {tblStatus?.count || 0} Record
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
                        Belum Ada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credentials Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">URL Supabase Target</span>
            <span className="text-xs font-mono font-bold text-indigo-700 break-all">{supabaseUrl}</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Publishable Key</span>
            <span className="text-xs font-mono font-bold text-slate-800 break-all">{supabaseKey}</span>
          </div>
        </div>
      </div>

      {/* SQL Script Generator Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Skrip DDL SQL Seluruh 8 Tabel & Data Awal</h3>
              <p className="text-[11px] text-slate-500">
                Lengkap dengan aturan RLS, indeks performa, dan data seed awal SMAN 1 Lumbung
              </p>
            </div>
          </div>

          <button
            onClick={handleCopySql}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Berhasil Disalin!' : 'Salin Skrip SQL'}</span>
          </button>
        </div>

        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-indigo-950">Langkah Pembuatan Seluruh Tabel Otomatis di Supabase Dashboard:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1.5 text-[11px]">
              <li>Klik tombol <strong>"Salin Skrip SQL"</strong> di bagian kanan atas box ini.</li>
              <li>Buka dashboard Supabase Anda: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700 inline-flex items-center gap-1">supabase.com/dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Pilih proyek Supabase Anda, lalu masuk ke menu <strong>SQL Editor</strong> pada bilah navigasi kiri.</li>
              <li>Klik <strong>"New Query"</strong>, tempelkan (Paste) skrip SQL yang disalin, lalu klik tombol <strong>"Run"</strong>.</li>
              <li>Seluruh 8 tabel beserta data awal akan otomatis dibuat dan siap digunakan!</li>
            </ol>
          </div>
        </div>

        {/* Clean Light Code Viewer */}
        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-indigo-600 selection:text-white">
            {SUPABASE_SQL_SCRIPT}
          </pre>
        </div>
      </div>
    </div>
  );
};
