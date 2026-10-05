import React, { useState } from 'react';
import { Users, CheckCircle2, Clock, AlertTriangle, XCircle, Calendar, RefreshCw, Database } from 'lucide-react';
import { AttendanceRecord, Student } from '../../types';
import { DiagnosticSummary } from '../../hooks/useSyncData';

interface StatCardsProps {
  students: Student[];
  attendances: AttendanceRecord[];
  isSyncing?: boolean;
  onForceSync?: () => void;
  lastSyncTime?: Date | null;
  diagnosticSummary?: DiagnosticSummary | null;
}

export const StatCards: React.FC<StatCardsProps> = ({
  students,
  attendances,
  isSyncing = false,
  onForceSync,
  lastSyncTime,
  diagnosticSummary
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  const getMinDate = () => {
    const d = new Date();
    if (period === 'today') return todayStr;
    if (period === 'week') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };

  const minDate = getMinDate();
  const activeStudentsCount = students.filter(s => s.status === 'aktif').length;

  const filteredAttendances = attendances.filter(a => a.date >= minDate && a.date <= todayStr);

  const hadir = filteredAttendances.filter(a => a.status === 'HADIR').length;
  const terlambat = filteredAttendances.filter(a => a.status === 'TERLAMBAT').length;
  const sakit = filteredAttendances.filter(a => a.status === 'SAKIT').length;
  const izin = filteredAttendances.filter(a => a.status === 'IZIN').length;
  const alpa = filteredAttendances.filter(a => a.status === 'ALPA').length;
  const totalLateMinutes = filteredAttendances.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);

  const totalScanned = hadir + terlambat + sakit + izin + alpa;
  const totalPresent = hadir + terlambat;
  const denominator = activeStudentsCount > 0 ? activeStudentsCount : (totalScanned > 0 ? totalScanned : 1);
  const percentageHadir = activeStudentsCount > 0 || totalScanned > 0
    ? Math.round((totalPresent / denominator) * 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* Period Selector Tabs & Sync Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Rekapitulasi Total Periode:</span>
          </div>

          {diagnosticSummary && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                diagnosticSummary.isConsistent
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={diagnosticSummary.message}
            >
              <Database className="w-3 h-3" />
              <span>{diagnosticSummary.isConsistent ? 'Database Selaras' : 'Pemeriksaan DB'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onForceSync && (
            <button
              onClick={onForceSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
              title="Sinkronkan Ulang dengan Supabase Cloud Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sync DB'}</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                period === 'today' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                period === 'week' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Minggu (7 Hari)
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                period === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Bulan (30 Hari)
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Total Siswa & Persentase */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Siswa Aktif</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{activeStudentsCount}</p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            Persentase Hadir: <strong className="text-slate-900">{percentageHadir}%</strong>
          </p>
        </div>

        {/* Hadir */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Hadir</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{hadir}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">
            Tepat Waktu
          </p>
        </div>

        {/* Terlambat & Total Menit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Terlambat</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{terlambat}</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">
            Total: <strong className="text-slate-900 font-mono">{totalLateMinutes} mnt</strong>
          </p>
        </div>

        {/* Sakit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Sakit</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{sakit}</p>
          <p className="text-[10px] text-sky-600 font-semibold mt-1">
            Surat Keterangan
          </p>
        </div>

        {/* Izin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Izin</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{izin}</p>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            Izin Resmi
          </p>
        </div>

        {/* Alpa */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Alpa</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{alpa}</p>
          <p className="text-[10px] text-rose-600 font-semibold mt-1">
            Tanpa Keterangan
          </p>
        </div>
      </div>
    </div>
  );
};
