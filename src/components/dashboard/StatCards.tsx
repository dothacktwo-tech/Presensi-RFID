import React, { useState } from 'react';
import { Users, CheckCircle2, Clock, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { AttendanceRecord, Student } from '../../types';

interface StatCardsProps {
  students: Student[];
  attendances: AttendanceRecord[];
}

export const StatCards: React.FC<StatCardsProps> = ({ students, attendances }) => {
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
  const activeStudentsCount = students.filter(s => s.status === 'aktif').length || 1;

  const filteredAttendances = attendances.filter(a => a.date >= minDate && a.date <= todayStr);

  const hadir = filteredAttendances.filter(a => a.status === 'HADIR').length;
  const terlambat = filteredAttendances.filter(a => a.status === 'TERLAMBAT').length;
  const sakit = filteredAttendances.filter(a => a.status === 'SAKIT').length;
  const izin = filteredAttendances.filter(a => a.status === 'IZIN').length;
  const alpa = filteredAttendances.filter(a => a.status === 'ALPA').length;
  const totalLateMinutes = filteredAttendances.reduce((acc, a) => acc + (a.lateMinutes || 0), 0);

  const totalScanned = hadir + terlambat + sakit + izin + alpa;
  const totalPresent = hadir + terlambat;
  const percentageHadir = Math.round((totalPresent / Math.max(totalScanned || activeStudentsCount, 1)) * 100);

  return (
    <div className="space-y-3">
      {/* Period Selector Tabs */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Rekapitulasi Total Periode:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              period === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              period === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Minggu (7 Hari)
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              period === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Bulan (30 Hari)
          </button>
        </div>
      </div>

      {/* Grid Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Total Siswa & Persentase */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Siswa Aktif</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{activeStudentsCount}</p>
          <p className="text-[10px] text-indigo-400 font-medium mt-1">
            Persentase Hadir: <strong className="text-white">{percentageHadir}%</strong>
          </p>
        </div>

        {/* Hadir */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase">Hadir</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{hadir}</p>
          <p className="text-[10px] text-emerald-400 font-medium mt-1">
            Tepat Waktu
          </p>
        </div>

        {/* Terlambat & Total Menit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase">Terlambat</span>
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{terlambat}</p>
          <p className="text-[10px] text-amber-400 font-medium mt-1">
            Total: <strong className="text-white font-mono">{totalLateMinutes} mnt</strong>
          </p>
        </div>

        {/* Sakit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-400 uppercase">Sakit</span>
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{sakit}</p>
          <p className="text-[10px] text-sky-400 font-medium mt-1">
            Surat Keterangan
          </p>
        </div>

        {/* Izin */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-400 uppercase">Izin</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{izin}</p>
          <p className="text-[10px] text-indigo-400 font-medium mt-1">
            Izin Resmi
          </p>
        </div>

        {/* Alpa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-400 uppercase">Alpa</span>
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white font-mono">{alpa}</p>
          <p className="text-[10px] text-rose-400 font-medium mt-1">
            Tanpa Keterangan
          </p>
        </div>
      </div>
    </div>
  );
};
