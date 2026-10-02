import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, StudentClass, AttendanceStatus } from '../../types';
import { formatIndonesianDate } from '../../utils/dateUtils';
import {
  UserCheck,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AttendanceCheckProps {
  onOpenManualInput: () => void;
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const AttendanceCheck: React.FC<AttendanceCheckProps> = ({ onOpenManualInput, onNotify }) => {
  const { currentUser, isWaliKelas } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [datePeriod, setDatePeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  useEffect(() => {
    setClasses(StorageService.getClasses());
    setAttendances(StorageService.getAttendances());

    if (isWaliKelas && currentUser?.assignedClassId) {
      setSelectedClassId(currentUser.assignedClassId);
    }
  }, [isWaliKelas, currentUser]);

  const refreshData = () => {
    setAttendances(StorageService.getAttendances());
  };

  // Date range calculation
  const getMinDate = () => {
    const d = new Date();
    if (datePeriod === 'today') {
      return todayStr;
    } else if (datePeriod === 'week') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    } else {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
  };

  const minDateStr = getMinDate();

  const filteredRecords = attendances.filter((r) => {
    const matchesDate = r.date >= minDateStr && r.date <= todayStr;

    const activeClassId = (isWaliKelas && currentUser?.assignedClassId)
      ? currentUser.assignedClassId
      : selectedClassId;

    const matchesClass = activeClassId === 'ALL' || r.classId === activeClassId;
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nis.includes(searchQuery) ||
      r.className.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesClass && matchesStatus && matchesSearch;
  });

  const hadirCount = filteredRecords.filter(r => r.status === 'HADIR').length;
  const terlambatCount = filteredRecords.filter(r => r.status === 'TERLAMBAT').length;
  const sakitCount = filteredRecords.filter(r => r.status === 'SAKIT').length;
  const izinCount = filteredRecords.filter(r => r.status === 'IZIN').length;
  const alpaCount = filteredRecords.filter(r => r.status === 'ALPA').length;

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    StorageService.updateAttendanceStatus(id, newStatus);
    refreshData();
    onNotify('success', 'Status Diperbarui', `Status presensi diubah menjadi ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Absensi Kehadiran Siswa</h2>
            <p className="text-xs text-slate-400">
              Pengecekan daftar dan status kehadiran siswa (Hadir, Terlambat, Sakit, Izin, Alpa)
            </p>
          </div>
        </div>

        <button
          onClick={onOpenManualInput}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-900/30 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Sub-Menu: Absensi Manual</span>
        </button>
      </div>

      {/* Summary Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedStatus('HADIR')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'HADIR'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{hadirCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('TERLAMBAT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'TERLAMBAT'
              ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{terlambatCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('SAKIT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'SAKIT'
              ? 'bg-sky-950/80 border-sky-500 text-sky-100 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Sakit</span>
            <AlertTriangle className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{sakitCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('IZIN')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'IZIN'
              ? 'bg-indigo-950/80 border-indigo-500 text-indigo-100 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Izin</span>
            <AlertTriangle className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{izinCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('ALPA')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'ALPA'
              ? 'bg-rose-950/80 border-rose-500 text-rose-100 shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Alpa</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{alpaCount}</p>
        </button>
      </div>

      {/* Filter Options Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Filter className="w-4 h-4" />
            <span>Filter Presensi</span>
          </div>

          {/* Quick Period Toggles (Hari Ini, 1 Minggu, 1 Bulan) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDatePeriod('today')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                datePeriod === 'today' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDatePeriod('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                datePeriod === 'week' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1 Minggu Terakhir
            </button>
            <button
              onClick={() => setDatePeriod('month')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                datePeriod === 'month' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1 Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Kelas</label>
            {isWaliKelas && currentUser?.assignedClassId ? (
              <input
                type="text"
                disabled
                value={currentUser.assignedClassName || 'Kelas Wali'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-bold"
              />
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Status Presensi</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
            >
              <option value="ALL">Semua Status (Hadir/Terlambat/Sakit/Izin/Alpa)</option>
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="SAKIT">SAKIT</option>
              <option value="IZIN">IZIN</option>
              <option value="ALPA">ALPA</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cari Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama Siswa atau NIS..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Attendance List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Data Ditemukan: <strong className="text-indigo-400 font-mono">{filteredRecords.length} Siswa</strong>
          </span>
          {selectedStatus !== 'ALL' && (
            <button
              onClick={() => setSelectedStatus('ALL')}
              className="text-xs text-indigo-400 hover:underline"
            >
              Tampilkan Semua Status
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jam</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Keterlambatan (Menit)</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-right">Aksi Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Tidak ada data absensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">{r.nis}</td>
                    <td className="py-3 px-4 font-bold text-white">{r.studentName}</td>
                    <td className="py-3 px-4 text-slate-300">{r.className}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{r.date}</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">{r.time}</td>
                    <td className="py-3 px-4">
                      {r.status === 'HADIR' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          HADIR
                        </span>
                      )}
                      {r.status === 'TERLAMBAT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          TERLAMBAT
                        </span>
                      )}
                      {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {r.status}
                        </span>
                      )}
                      {r.status === 'ALPA' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          ALPA
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300 font-bold">
                      {r.status === 'TERLAMBAT' && r.lateMinutes ? `${r.lateMinutes} menit` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {r.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value as AttendanceStatus)}
                        className="bg-slate-950 border border-slate-700 text-[11px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="HADIR">HADIR</option>
                        <option value="TERLAMBAT">TERLAMBAT</option>
                        <option value="SAKIT">SAKIT</option>
                        <option value="IZIN">IZIN</option>
                        <option value="ALPA">ALPA</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
