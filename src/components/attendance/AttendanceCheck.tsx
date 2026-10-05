import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, StudentClass, AttendanceStatus, Student } from '../../types';
import { formatIndonesianDate } from '../../utils/dateUtils';
import { UsageGuide } from '../common/UsageGuide';
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Calendar,
  HelpCircle,
  Lock,
  Unlock,
  CheckCheck
} from 'lucide-react';

interface AttendanceCheckProps {
  isHistoryMode?: boolean;
  onOpenManualInput: () => void;
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const AttendanceCheck: React.FC<AttendanceCheckProps> = ({ isHistoryMode = false, onOpenManualInput, onNotify }) => {
  const { currentUser, isWaliKelas, isAdmin } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [datePeriod, setDatePeriod] = useState<'today' | 'week' | 'month'>(isHistoryMode ? 'week' : 'today');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  // Individual Row locking/unlocking states (unlocked by default: student hasn't checked in yet)
  const [unlockedRowIds, setUnlockedRowIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sman1_unlocked_attendance_rows');
    return saved ? JSON.parse(saved) : [];
  });

  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('HADIR');

  useEffect(() => {
    setDatePeriod(isHistoryMode ? 'week' : 'today');
    setSelectedStatus('ALL');
  }, [isHistoryMode]);

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

  const getMinDate = () => {
    const d = new Date();
    if (datePeriod === 'today') {
      return selectedDate;
    } else if (datePeriod === 'week') {
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    } else {
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
  };

  const minDateStr = getMinDate();

  // Active class filter ID
  const activeClassId = (isWaliKelas && currentUser?.assignedClassId)
    ? currentUser.assignedClassId
    : selectedClassId;

  // UNIFIED RECORD GENERATION WITH 'BELUM ABSEN' MERGE
  const getMergedRecords = () => {
    if (datePeriod === 'today') {
      // Fetch all active students
      const activeStudents = StorageService.getStudents().filter(s => s.status === 'aktif');
      // Fetch all attendances for the selected single date
      const dateAttendances = attendances.filter(a => a.date === selectedDate);

      const merged: AttendanceRecord[] = [];

      activeStudents.forEach((student) => {
        // Filter by Class
        if (activeClassId !== 'ALL' && student.classId !== activeClassId) return;

        const record = dateAttendances.find(a => a.studentId === student.id);
        if (record) {
          merged.push(record);
        } else {
          // Construct Virtual "BELUM ABSEN" record
          merged.push({
            id: `virtual-${student.id}`,
            studentId: student.id,
            nis: student.nis,
            studentName: student.name,
            classId: student.classId,
            className: student.className,
            date: selectedDate,
            time: '-',
            method: 'MANUAL',
            status: 'BELUM_ABSEN' as any, // virtual status
            lateMinutes: 0,
            notes: 'Belum scan kartu/QR',
            createdAt: `${selectedDate}T00:00:00Z`
          });
        }
      });

      return merged;
    } else {
      // For week or month, return actual records in date range
      return attendances.filter((r) => {
        const matchesDate = r.date >= minDateStr && r.date <= todayStr;
        const matchesClass = activeClassId === 'ALL' || r.classId === activeClassId;
        return matchesDate && matchesClass;
      });
    }
  };

  const mergedRecords = getMergedRecords().sort((a, b) => {
    // 1. Sort by Class
    const classCompare = a.className.localeCompare(b.className, undefined, { numeric: true });
    if (classCompare !== 0) return classCompare;
    // 2. Sort by Name
    const nameCompare = a.studentName.localeCompare(b.studentName);
    if (nameCompare !== 0) return nameCompare;
    // 3. Sort by NIS
    return a.nis.localeCompare(b.nis);
  });

  const filteredRecords = mergedRecords.filter((r) => {
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nis.includes(searchQuery) ||
      r.className.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Calculate count indicators dynamically
  const hadirCount = mergedRecords.filter(r => r.status === 'HADIR').length;
  const terlambatCount = mergedRecords.filter(r => r.status === 'TERLAMBAT').length;
  const sakitCount = mergedRecords.filter(r => r.status === 'SAKIT').length;
  const izinCount = mergedRecords.filter(r => r.status === 'IZIN').length;
  const alpaCount = mergedRecords.filter(r => r.status === 'ALPA').length;
  const belumAbsenCount = mergedRecords.filter(r => r.status === ('BELUM_ABSEN' as any)).length;

  const handleToggleRowLock = (id: string) => {
    setUnlockedRowIds(prev => {
      const updated = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id];
      localStorage.setItem('sman1_unlocked_attendance_rows', JSON.stringify(updated));
      return updated;
    });
  };

  const handleBulkUpdateStatus = async (targetStatus: AttendanceStatus) => {
    const unabsented = mergedRecords.filter(r => r.status === ('BELUM_ABSEN' as any));

    if (unabsented.length === 0) {
      onNotify('success', 'Pemberitahuan', 'Seluruh siswa terfilter sudah memiliki catatan absensi hari ini.');
      return;
    }

    let affectedCount = 0;
    for (const r of unabsented) {
      const studentId = r.id.replace('virtual-', '');
      const student = StorageService.getStudents().find(s => s.id === studentId);
      if (student) {
        await StorageService.createManualAttendance({
          studentId: student.id,
          nis: student.nis,
          studentName: student.name,
          classId: student.classId,
          className: student.className,
          date: selectedDate,
          status: targetStatus,
          notes: 'Diinput melalui absensi massal',
          scannedBy: `${currentUser?.name || 'Petugas'} (Input Presensi Massal)`
        });
        affectedCount++;
      }
    }

    refreshData();
    onNotify('success', 'Status Massal Selesai', `Berhasil menerapkan status ${targetStatus} ke ${affectedCount} siswa.`);
  };

  const handleStatusChange = async (id: string, newStatus: AttendanceStatus | 'BELUM_ABSEN', record?: AttendanceRecord) => {
    if (id.startsWith('virtual-')) {
      // This is a virtual record of a student who hasn't checked in yet
      const studentId = id.replace('virtual-', '');
      const student = StorageService.getStudents().find(s => s.id === studentId);

      if (student && newStatus !== 'BELUM_ABSEN') {
        const res = await StorageService.createManualAttendance({
          studentId: student.id,
          nis: student.nis,
          studentName: student.name,
          classId: student.classId,
          className: student.className,
          date: selectedDate,
          status: newStatus as AttendanceStatus,
          notes: 'Diinput melalui daftar kehadiran',
          scannedBy: `${currentUser?.name || 'Petugas'} (Input Presensi)`
        });
        if (!res.success) {
          onNotify('error', 'Gagal Simpan Database', `Presensi gagal disimpan ke Supabase: ${res.error}`);
        }
      }
    } else {
      // This is an actual attendance record
      if (newStatus === 'BELUM_ABSEN') {
        // Change back to Belum Absen by deleting the attendance record
        const res = await StorageService.deleteAttendance(id);
        if (!res.success) {
          onNotify('error', 'Gagal Hapus Database', `Gagal menghapus dari Supabase: ${res.error}`);
        }
      } else {
        const res = await StorageService.updateAttendanceStatus(id, newStatus as AttendanceStatus);
        if (!res.success) {
          onNotify('error', 'Gagal Update Database', `Gagal update ke Supabase: ${res.error}`);
        }
      }
    }
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            {isHistoryMode ? <Clock className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {isHistoryMode ? 'Riwayat & Log Kehadiran' : 'Absensi Kehadiran'}
              </h2>
              <UsageGuide
                title="Panduan Absensi"
                steps={[
                  "Pilih periode atau tanggal absensi.",
                  "Filter berdasarkan kelas atau status kehadiran.",
                  "Gunakan baris absensi untuk mengubah status siswa secara manual.",
                  "Tombol gembok (admin) digunakan untuk mengunci baris agar tidak bisa diubah."
                ]}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isHistoryMode
                ? 'Peninjauan log presensi jangka panjang.'
                : 'Pengelolaan status kehadiran siswa.'}
            </p>
          </div>
        </div>

        {!isHistoryMode && (
          <button
            onClick={onOpenManualInput}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buka Sub-Menu: Absensi Manual</span>
          </button>
        )}
      </div>

      {/* Summary Chips Bar with "Belum Absen" Chip added */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedStatus('ALL')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider">Semua Siswa</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">ALL</span>
          </div>
          <p className="text-xl font-mono font-bold mt-1">{mergedRecords.length}</p>
        </button>

        {datePeriod === 'today' && (
          <button
            onClick={() => setSelectedStatus('BELUM_ABSEN')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedStatus === 'BELUM_ABSEN'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-white">Belum Absen</span>
              <HelpCircle className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-xl font-mono font-bold mt-1 text-slate-900">{belumAbsenCount}</p>
          </button>
        )}

        <button
          onClick={() => setSelectedStatus('HADIR')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'HADIR'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{hadirCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('TERLAMBAT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'TERLAMBAT'
              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{terlambatCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('SAKIT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'SAKIT' || selectedStatus === 'IZIN'
              ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Sakit / Izin</span>
            <AlertTriangle className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{sakitCount + izinCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatus('ALPA')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'ALPA'
              ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Alpa</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{alpaCount}</p>
        </button>
      </div>

      {/* Filter Options Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter Presensi Siswa</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setDatePeriod('today')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                datePeriod === 'today' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tanggal Spesifik (Harian)
            </button>
            <button
              onClick={() => setDatePeriod('week')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                datePeriod === 'week' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Minggu Terakhir
            </button>
            <button
              onClick={() => setDatePeriod('month')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                datePeriod === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Calendar Date Picker (Visible when Date Period is 'today' / Daily) */}
          {datePeriod === 'today' ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-600" />
                <span>Pilih Tanggal</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-indigo-600"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Periode Aktif</label>
              <input
                type="text"
                disabled
                value={datePeriod === 'week' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-bold"
              />
            </div>
          )}

          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Kelas</label>
            {isWaliKelas && currentUser?.assignedClassId ? (
              <input
                type="text"
                disabled
                value={currentUser.assignedClassName || 'Kelas Wali'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-indigo-700 font-bold"
              />
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:border-indigo-600 font-medium"
              >
                <option value="ALL">Semua Kelas</option>
                {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Status Presensi</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:border-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              {datePeriod === 'today' && <option value="BELUM_ABSEN">BELUM ABSEN</option>}
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="SAKIT">SAKIT</option>
              <option value="IZIN">IZIN</option>
              <option value="ALPA">ALPA</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama Siswa atau NIS..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Pemberian Status Massal (Bulk Status Update) */}
      {datePeriod === 'today' && (
        <div className="bg-indigo-900 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20">
              <CheckCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-tight">Pemberian Status Massal (Bulk Update)</h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Set status sekaligus untuk siswa yang <strong>Belum Absen</strong> hari ini ({belumAbsenCount} siswa). Siswa yang sudah absen dikecualikan secara otomatis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as any)}
              className="bg-white/15 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
            >
              <option value="HADIR" className="text-slate-900 font-bold">HADIR</option>
              <option value="TERLAMBAT" className="text-slate-900 font-bold">TERLAMBAT</option>
              <option value="SAKIT" className="text-slate-900 font-bold">SAKIT</option>
              <option value="IZIN" className="text-slate-900 font-bold">IZIN</option>
              <option value="ALPA" className="text-slate-900 font-bold">ALPA</option>
            </select>

            <button
              onClick={() => handleBulkUpdateStatus(bulkStatus)}
              disabled={belumAbsenCount === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Ke {belumAbsenCount} Siswa Belum Absen</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Attendance List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">
            Daftar Siswa: <strong className="text-indigo-600 font-mono">{filteredRecords.length} Siswa</strong>
          </span>
          <span className="text-slate-500 font-mono font-semibold">
            Tanggal: {datePeriod === 'today' ? formatIndonesianDate(selectedDate) : `${minDateStr} s/d ${todayStr}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jam & Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Durasi Keterlambatan</th>
                <th className="py-3 px-4">Catatan / Alasan</th>
                <th className="py-3 px-4 text-right">Ubah Status Langsung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada data absensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isVirtual = r.id.startsWith('virtual-');
                  const isRowLocked = !isVirtual && !unlockedRowIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-indigo-50/20 transition-all ${
                        isVirtual ? 'bg-slate-50/50 text-slate-600 italic' : 'bg-white'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold">{r.nis}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.studentName}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">{r.className}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{r.date}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold">
                        <div>{r.time}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.method === 'RFID' ? 'bg-sky-100 text-sky-700' : r.method === 'QR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === 'HADIR' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            HADIR
                          </span>
                        )}
                        {r.status === 'TERLAMBAT' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            TERLAMBAT
                          </span>
                        )}
                        {r.status === 'SAKIT' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            SAKIT
                          </span>
                        )}
                        {r.status === 'IZIN' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            IZIN
                          </span>
                        )}
                        {r.status === 'ALPA' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ALPA
                          </span>
                        )}
                        {r.status === ('BELUM_ABSEN' as any) && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            BELUM ABSEN
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-700 font-bold">
                        {r.status === 'TERLAMBAT' && r.lateMinutes ? `${r.lateMinutes} menit` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] truncate max-w-[150px]">
                        {r.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isVirtual && (
                            <div className="flex items-center">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRowLock(r.id)}
                                  className={`p-1 rounded-lg border transition-all ${
                                    isRowLocked
                                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:scale-105'
                                      : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:scale-105'
                                  }`}
                                  title={isRowLocked ? "Buka Kunci Baris Ini (Admin)" : "Kunci Baris Ini (Admin)"}
                                >
                                  {isRowLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              ) : (
                                <span
                                  className={`p-1 rounded-lg border ${
                                    isRowLocked
                                      ? 'bg-rose-50/50 text-rose-500 border-rose-100'
                                      : 'bg-emerald-50/50 text-emerald-500 border-emerald-100'
                                  }`}
                                  title={isRowLocked ? "Status Terkunci" : "Terbuka"}
                                >
                                  {isRowLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </span>
                              )}
                            </div>
                          )}

                          <select
                            value={r.status}
                            disabled={isRowLocked}
                            onChange={(e) => handleStatusChange(r.id, e.target.value as any, r)}
                            className={`bg-white border border-slate-300 text-[11px] text-slate-800 rounded-lg px-2.5 py-1 font-bold focus:border-indigo-600 shadow-2xs ${
                              isRowLocked ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
                            }`}
                          >
                            <option value="BELUM_ABSEN">BELUM ABSEN</option>
                            <option value="HADIR">HADIR</option>
                            <option value="TERLAMBAT">TERLAMBAT</option>
                            <option value="SAKIT">SAKIT</option>
                            <option value="IZIN">IZIN</option>
                            <option value="ALPA">ALPA</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
