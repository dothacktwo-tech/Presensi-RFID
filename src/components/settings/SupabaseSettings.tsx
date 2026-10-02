import React, { useState, useEffect } from 'react';
import {
  testSupabaseConnection,
  checkAllTablesStatus,
  autoCreateAndSyncTables,
  SUPABASE_SQL_SCRIPT,
  TableCheckResult
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
  Zap
} from 'lucide-react';

interface SupabaseSettingsProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({ onNotify }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState('Sedang mengecek koneksi ke Supabase...');
  const [tables, setTables] = useState<TableCheckResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    onNotify('success', 'Skrip SQL Disalin', 'Skrip DDL SQL untuk 5 tabel berhasil disalin ke clipboard.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAutoCreateAndSync = async () => {
    setIsProcessing(true);
    onNotify('info', 'Otomatisasi Tabel', 'Proses pembuatan & sinkronisasi data ke Supabase sedang berlangsung...');

    const res = await autoCreateAndSyncTables();
    setIsProcessing(false);

    if (res.success) {
      onNotify('success', 'Tabel & Data Berhasil Disiapkan!', `Berhasil menyinkronkan ${res.syncedCount} record ke seluruh tabel Supabase Cloud.`);
    } else {
      onNotify('error', 'Pemberitahuan Tabel', `Tabel belum ada atau butuh eksekusi SQL. Silakan tempel Skrip SQL di SQL Editor Supabase. Detail: ${res.messages.join('; ')}`);
    }

    handleTestConnection();
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
              Pengelolaan otomatis 5 tabel utama (`settings`, `classes`, `users`, `students`, `attendances`) dan eksekusi SQL SMAN 1 Lumbung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoCreateAndSync}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Zap className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
            <span>{isProcessing ? 'Proses Otomatis...' : 'Buat & Sinkronkan Otomatis Tabel'}</span>
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

        {/* 5 Individual Tables Overview Grid */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Daftar 5 Tabel Otomatis Supabase Cloud:</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { id: 'settings', label: '1. Settings', desc: 'Pengaturan Jam' },
              { id: 'classes', label: '2. Classes', desc: 'Kelas & Wali' },
              { id: 'users', label: '3. Users', desc: 'Akun RBAC' },
              { id: 'students', label: '4. Students', desc: 'Master Siswa' },
              { id: 'attendances', label: '5. Attendances', desc: 'Rekap Presensi' }
            ].map((tblInfo) => {
              const tblStatus = tables.find(t => t.name === tblInfo.id);
              const exists = tblStatus?.exists;

              return (
                <div
                  key={tblInfo.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
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
                        {tblStatus?.count || 0} Record Data
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
                        Belum Terbuat
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
              <h3 className="text-sm font-bold text-slate-900">Skrip DDL SQL Seluruh Tabel & Data Awal</h3>
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
              <li>Seluruh 5 tabel beserta data awal akan otomatis dibuat dan siap digunakan!</li>
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
