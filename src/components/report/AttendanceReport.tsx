import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { generateAttendancePdf } from '../../services/exportPdf';
import { exportAttendanceToExcel } from '../../services/exportExcel';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, StudentClass, AttendanceStatus } from '../../types';
import { formatIndonesianDate } from '../../utils/dateUtils';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit2
} from 'lucide-react';

interface AttendanceReportProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ onNotify }) => {
  const { currentUser, isWaliKelas, isAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  useEffect(() => {
    setClasses(StorageService.getClasses());
    setAttendances(StorageService.getAttendances());

    // If user is Wali Kelas, default to their assigned class
    if (isWaliKelas && currentUser?.assignedClassId) {
      setSelectedClassId(currentUser.assignedClassId);
    }
  }, [isWaliKelas, currentUser]);

  const refreshAttendances = () => {
    setAttendances(StorageService.getAttendances());
  };

  // Filter Attendance Records
  const filteredRecords = attendances.filter((r) => {
    // Date filter
    const matchesDate = r.date >= startDate && r.date <= endDate;

    // Class filter (If Wali Kelas, lock to assigned class)
    const activeClassId = (isWaliKelas && currentUser?.assignedClassId)
      ? currentUser.assignedClassId
      : selectedClassId;

    const matchesClass = activeClassId === 'ALL' || r.classId === activeClassId;

    // Status filter
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;

    // Search query
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nis.includes(searchQuery) ||
      r.className.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesClass && matchesStatus && matchesSearch;
  });

  const handleStatusChange = (id: string, newStatus: AttendanceStatus) => {
    StorageService.updateAttendanceStatus(id, newStatus);
    refreshAttendances();
    onNotify('success', 'Status Diperbarui', `Status presensi berhasil diubah ke ${newStatus}.`);
  };

  const handleExportPdf = () => {
    const settings = StorageService.getSettings();
    const selClassObj = classes.find(c => c.id === selectedClassId);

    generateAttendancePdf({
      records: filteredRecords,
      settings,
      title: isWaliKelas
        ? `LAPORAN PRESENSI KELAS ${currentUser?.assignedClassName || ''}`
        : 'LAPORAN REKAPITULASI PRESENSI SISWA',
      startDate,
      endDate,
      className: isWaliKelas
        ? (currentUser?.assignedClassName || 'Kelas')
        : (selClassObj ? selClassObj.name : 'Semua Kelas'),
      statusFilter: selectedStatus === 'ALL' ? 'Semua Status' : selectedStatus,
      generatedBy: currentUser?.name || 'Sistem Absensi'
    });

    onNotify('success', 'PDF Dibuat', 'Laporan PDF resmi berhasil diunduh.');
  };

  const handleExportExcel = () => {
    const selClassObj = classes.find(c => c.id === selectedClassId);
    const classNameStr = selClassObj ? selClassObj.name.replace(/\s+/g, '_') : 'Semua_Kelas';

    exportAttendanceToExcel(
      filteredRecords,
      `Rekap_Absensi_SMAN1_Lumbung_${classNameStr}`
    );

    onNotify('success', 'Excel Dibuat', 'File spreadsheet Excel berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {isWaliKelas
                ? `Rekapitulasi Laporan Presensi ${currentUser?.assignedClassName || 'Kelas'}`
                : 'Laporan Rekapitulasi Presensi SMAN 1 Lumbung'}
            </h2>
            <p className="text-xs text-slate-400">
              Filter data, cetak laporan resmi PDF, atau ekspor ke Excel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded-xl transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-900/30"
          >
            <FileText className="w-4 h-4" />
            <span>Cetak PDF Resmi</span>
          </button>
        </div>
      </div>

      {/* Filter Options Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Filter className="w-4 h-4" />
            <span>Filter Parameter Laporan</span>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className="px-3 py-1 rounded-lg font-medium text-slate-300 hover:bg-slate-800"
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(todayStr);
              }}
              className="px-3 py-1 rounded-lg font-medium text-slate-300 hover:bg-slate-800"
            >
              1 Minggu
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(todayStr);
              }}
              className="px-3 py-1 rounded-lg font-medium text-slate-300 hover:bg-slate-800"
            >
              1 Bulan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pilih Kelas</label>
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

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="SAKIT">SAKIT</option>
              <option value="IZIN">IZIN</option>
              <option value="ALPA">ALPA</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama / NIS..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Hasil Filter: <strong className="text-indigo-400 font-mono">{filteredRecords.length} Record</strong>
          </span>
          <span className="text-slate-400 font-mono">
            Periode: {startDate} s/d {endDate}
          </span>
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
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Durasi Keterlambatan</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-right">Ubah Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    Tidak ada record presensi pada periode dan filter yang dipilih.
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
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {r.method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.status === 'HADIR' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          HADIR
                        </span>
                      )}
                      {r.status === 'TERLAMBAT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          TERLAMBAT
                        </span>
                      )}
                      {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {r.status}
                        </span>
                      )}
                      {r.status === 'ALPA' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
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
