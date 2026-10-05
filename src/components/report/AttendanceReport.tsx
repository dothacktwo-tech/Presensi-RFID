import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  Printer,
  Percent,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface AttendanceReportProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  defaultMode?: 'daily' | 'weekly' | 'monthly' | 'rekap' | 'pdf' | 'excel';
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ onNotify, defaultMode = 'daily' }) => {
  const { currentUser, isWaliKelas } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const getInitialStartDate = () => {
    if (defaultMode === 'weekly') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    if (defaultMode === 'monthly') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    }
    return todayStr;
  };

  const [startDate, setStartDate] = useState(getInitialStartDate);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting & Filtering for Rekapitulasi
  const [rekapSortBy, setRekapSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'pct-asc' | 'pct-desc' | 'alpa-desc' | 'nis-asc'>('default');
  const [pctFilter, setPctFilter] = useState<'ALL' | 'warning' | 'medium' | 'good'>('ALL');

  // PDF Configuration State
  const [pdfTitle, setPdfTitle] = useState('LAPORAN REKAPITULASI PRESENSI SISWA');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeKop, setIncludeKop] = useState(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');

  // Excel Configuration State
  const [excelFilename, setExcelFilename] = useState(`Rekap_Absensi_SMAN1_Lumbung_${todayStr}`);
  const [includeTime, setIncludeTime] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  useEffect(() => {
    setClasses(StorageService.getClasses());
    setAttendances(StorageService.getAttendances());

    if (isWaliKelas && currentUser?.assignedClassId) {
      setSelectedClassId(currentUser.assignedClassId);
    }

    const handleDataUpdate = () => {
      setClasses(StorageService.getClasses());
      setAttendances(StorageService.getAttendances());
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, [isWaliKelas, currentUser]);

  const refreshAttendances = () => {
    setAttendances(StorageService.getAttendances());
  };

  const activeClassId = (isWaliKelas && currentUser?.assignedClassId)
    ? currentUser.assignedClassId
    : selectedClassId;

  const filteredRecords = attendances.filter((r) => {
    const matchesDate = r.date >= startDate && r.date <= endDate;
    const matchesClass = activeClassId === 'ALL' || r.classId === activeClassId;
    const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nis.includes(searchQuery) ||
      r.className.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesClass && matchesStatus && matchesSearch;
  });

  // Calculate Aggregations for Rekapitulasi View
  const getStudentRekap = () => {
    const activeStudents = StorageService.getStudents().filter(
      (s) => s.status === 'aktif' && (activeClassId === 'ALL' || s.classId === activeClassId)
    );
    const dateAttendances = attendances.filter(a => a.date >= startDate && a.date <= endDate);

    const rekap = activeStudents
      .map((student) => {
        const studentAtts = dateAttendances.filter(a => a.studentId === student.id);
        const hadir = studentAtts.filter(a => a.status === 'HADIR').length;
        const terlambat = studentAtts.filter(a => a.status === 'TERLAMBAT').length;
        const sakit = studentAtts.filter(a => a.status === 'SAKIT').length;
        const izin = studentAtts.filter(a => a.status === 'IZIN').length;
        const alpa = studentAtts.filter(a => a.status === 'ALPA').length;

        const totalAtts = hadir + terlambat + sakit + izin + alpa;
        const totalPresent = hadir + terlambat;
        const percentage = totalAtts > 0 ? Math.round((totalPresent / totalAtts) * 100) : 100;

        return {
          id: student.id,
          nis: student.nis,
          name: student.name,
          className: student.className,
          hadir,
          terlambat,
          sakit,
          izin,
          alpa,
          percentage
        };
      })
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery);
        if (!matchesSearch) return false;

        if (pctFilter === 'warning') return s.percentage < 75;
        if (pctFilter === 'medium') return s.percentage >= 75 && s.percentage < 90;
        if (pctFilter === 'good') return s.percentage >= 90;
        return true;
      });

    // Apply Sorting
    return rekap.sort((a, b) => {
      if (rekapSortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (rekapSortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (rekapSortBy === 'pct-asc') {
        return a.percentage - b.percentage;
      }
      if (rekapSortBy === 'pct-desc') {
        return b.percentage - a.percentage;
      }
      if (rekapSortBy === 'alpa-desc') {
        return b.alpa - a.alpa;
      }
      if (rekapSortBy === 'nis-asc') {
        return a.nis.localeCompare(b.nis);
      }

      // Default Sort: Kelas -> Nama -> NIS
      const classCompare = a.className.localeCompare(b.className, undefined, { numeric: true });
      if (classCompare !== 0) return classCompare;

      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      return a.nis.localeCompare(b.nis);
    });
  };

  const studentRekapData = getStudentRekap();

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
        : pdfTitle,
      startDate,
      endDate,
      className: isWaliKelas
        ? (currentUser?.assignedClassName || 'Kelas')
        : (selClassObj ? selClassObj.name : 'Semua Kelas'),
      statusFilter: selectedStatus === 'ALL' ? 'Semua Status' : selectedStatus,
      generatedBy: currentUser?.name || 'Sistem Absensi',
      includeKop: includeKop
    });

    onNotify('success', 'PDF Dibuat', 'Laporan PDF resmi berhasil diunduh.');
  };

  // Custom Rekapitulasi Excel Exporter
  const handleExportRekapExcel = () => {
    const formattedRows = studentRekapData.map((s, idx) => ({
      'No': idx + 1,
      'NIS': s.nis,
      'Nama Siswa': s.name,
      'Kelas': s.className,
      'Hadir': s.hadir,
      'Terlambat': s.terlambat,
      'Sakit': s.sakit,
      'Izin': s.izin,
      'Alpa': s.alpa,
      'Persentase Kehadiran': `${s.percentage}%`
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kumulatif');

    worksheet['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 20 }
    ];

    XLSX.writeFile(workbook, `Rekap_Kumulatif_Siswa_SMAN1_Lumbung_${startDate}_sd_${endDate}.xlsx`);
    onNotify('success', 'Excel Rekap Dibuat', 'Laporan Excel Rekapitulasi Kumulatif berhasil diunduh.');
  };

  // Custom Detail Logs Excel Exporter (Submenu: Export Excel/CSV)
  const handleCustomExcelExport = () => {
    const formattedRows = filteredRecords.map((r, i) => {
      const row: any = {
        'No': i + 1,
        'NIS': r.nis,
        'Nama Siswa': r.studentName,
        'Kelas': r.className,
        'Tanggal': r.date,
        'Status': r.status
      };
      if (includeTime) {
        row['Jam Presensi'] = r.time;
        row['Metode Scan'] = r.method;
      }
      if (includeNotes) {
        row['Durasi Keterlambatan'] = r.status === 'TERLAMBAT' && r.lateMinutes ? `${r.lateMinutes} menit` : '-';
        row['Catatan / Alasan'] = r.notes || '-';
      }
      row['Petugas'] = r.scannedBy || 'System';
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');

    worksheet['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];

    XLSX.writeFile(workbook, `${excelFilename || 'Rekap_Absensi_SMAN1_Lumbung'}.xlsx`);
    onNotify('success', 'Excel Dibuat', 'Laporan Excel Detail Logs berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* TAMPILAN 1: REKAPITULASI SUMMARY GRID (MODE: rekap) */}
      {/* ========================================================= */}
      {defaultMode === 'rekap' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Rekapitulasi Persentase Absensi Bulanan</h2>
                <p className="text-xs text-slate-500">
                  Ringkasan kumulatif kehadiran per siswa (Hadir, Terlambat, Sakit, Izin, Alpa) dan persentase kehadiran.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportRekapExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Rekap Excel</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Kelas</label>
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
                  className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="ALL">Semua Kelas</option>
                  {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Nama / NIS</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama siswa..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-900 font-semibold"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* Custom Sort Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sortir Laporan</label>
              <select
                value={rekapSortBy}
                onChange={(e) => setRekapSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 font-semibold focus:border-indigo-650"
              >
                <option value="default">Default (Kelas → Nama)</option>
                <option value="name-asc">Nama Siswa (A - Z)</option>
                <option value="name-desc">Nama Siswa (Z - A)</option>
                <option value="pct-asc">Kehadiran Terendah</option>
                <option value="pct-desc">Kehadiran Tertinggi</option>
                <option value="alpa-desc">Alpa Terbanyak</option>
                <option value="nis-asc">NIS Siswa</option>
              </select>
            </div>

            {/* Custom Filter Percentage Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Kehadiran</label>
              <select
                value={pctFilter}
                onChange={(e) => setPctFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 font-semibold focus:border-indigo-650"
              >
                <option value="ALL">Semua Persentase</option>
                <option value="good">Sangat Baik (≥ 90%)</option>
                <option value="medium">Cukup Baik (75% - 89%)</option>
                <option value="warning">Butuh Perhatian (&lt; 75%)</option>
              </select>
            </div>
          </div>

          {/* Aggregations Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3.5 px-4 w-12">No</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">Kelas</th>
                    <th className="py-3.5 px-4 text-center text-emerald-700 bg-emerald-50/30">Hadir</th>
                    <th className="py-3.5 px-4 text-center text-amber-700 bg-amber-50/30">Terlambat</th>
                    <th className="py-3.5 px-4 text-center text-sky-700 bg-sky-50/30">Sakit</th>
                    <th className="py-3.5 px-4 text-center text-indigo-700 bg-indigo-50/30">Izin</th>
                    <th className="py-3.5 px-4 text-center text-rose-700 bg-rose-50/30">Alpa</th>
                    <th className="py-3.5 px-4 text-center font-bold text-indigo-900 bg-indigo-50">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {studentRekapData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Tidak ada data siswa atau catatan absen ditemukan.
                      </td>
                    </tr>
                  ) : (
                    studentRekapData.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{s.nis}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3.5 px-4 text-slate-700">{s.className}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700 bg-emerald-50/10">{s.hadir}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-700 bg-amber-50/10">{s.terlambat}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-sky-700 bg-sky-50/10">{s.sakit}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-700 bg-indigo-50/10">{s.izin}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-700 bg-rose-50/10">{s.alpa}</td>
                        <td className="py-3.5 px-4 text-center bg-indigo-50/40">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                            s.percentage >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            s.percentage >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            <Percent className="w-3.5 h-3.5" />
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAMPILAN 2: DEDICATED PDF CONFIG & PRINT PREVIEW (MODE: pdf) */}
      {/* ========================================================= */}
      {defaultMode === 'pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <Printer className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfigurasi Cetak PDF</h3>
                <p className="text-xs text-slate-400">Atur dokumen laporan resmi sebelum diunduh</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Judul Laporan</label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Orientasi</label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) => setPdfOrientation(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="portrait">Portrait (Tegak)</option>
                    <option value="landscape">Landscape (Mendatar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ukuran Kertas</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kelas Siswa</label>
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
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Hingga</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tanda Tangan Pengesahan</span>
                  <span className="text-[10px] text-slate-400">Tampilkan tanda tangan Kepala Sekolah & Wali Kelas</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Kop Surat Sekolah (Letterhead)</span>
                  <span className="text-[10px] text-slate-400">Tampilkan Kop resmi instansi sekolah di atas laporan</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeKop}
                  onChange={(e) => setIncludeKop(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleExportPdf}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF Sekarang</span>
            </button>
          </div>

          {/* Virtual Paper Preview Panel */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Preview Fisik Kertas Laporan PDF</span>
            <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 shadow-inner flex justify-center overflow-hidden">
              {/* PDF Virtual Document */}
              <div className={`bg-white shadow-xl border border-slate-300 p-8 space-y-6 text-slate-800 relative select-none w-full max-w-lg ${
                pdfOrientation === 'landscape' ? 'aspect-video' : 'aspect-[1/1.41]'
              }`}>
                {/* School Header */}
                {includeKop && (
                  <div className="flex items-center justify-between border-b-2 border-double border-slate-900 pb-3 animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-center flex-1">
                      <h4 className="text-xs font-black text-slate-900 tracking-tight">PEMERINTAH PROVINSI JAWA BARAT</h4>
                      <h3 className="text-xs font-black text-indigo-900 font-sans">DINAS PENDIDIKAN SMAN 1 LUMBUNG</h3>
                      <p className="text-[8px] text-slate-400 font-mono">Jl. Raya Lumbung No. 45, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258</p>
                    </div>
                  </div>
                )}

                {/* Report Title */}
                <div className="text-center space-y-1 animate-fade-in">
                  <h5 className="text-[10px] font-black underline uppercase text-slate-900 leading-tight">{pdfTitle}</h5>
                  <p className="text-[8px] font-bold text-indigo-700">
                    Kelas: {
                      isWaliKelas
                        ? (currentUser?.assignedClassName || 'Kelas Wali')
                        : (classes.find(c => c.id === selectedClassId)?.name || 'Semua Kelas')
                    }
                  </p>
                  <p className="text-[7px] font-mono text-slate-500 font-semibold">
                    Periode: {formatIndonesianDate(startDate)} s/d {formatIndonesianDate(endDate)}
                  </p>
                </div>

                 {/* Simulated Table */}
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-[8px] text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-1">No</th>
                        <th className="p-1">NIS</th>
                        <th className="p-1">Nama Siswa</th>
                        <th className="p-1">Kelas</th>
                        <th className="p-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 italic font-medium">
                            Tidak ada data presensi yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.slice(0, 10).map((rec, index) => (
                          <tr key={rec.id} className="border-b border-slate-200">
                            <td className="p-1 font-mono">{index + 1}</td>
                            <td className="p-1 font-mono">{rec.nis}</td>
                            <td className="p-1 font-bold truncate max-w-[80px]">{rec.studentName}</td>
                            <td className="p-1">{rec.className}</td>
                            <td className={`p-1 font-bold ${
                              rec.status === 'HADIR' ? 'text-emerald-700' :
                              rec.status === 'TERLAMBAT' ? 'text-amber-700' :
                              rec.status === 'ALPA' ? 'text-rose-700' : 'text-blue-700'
                            }`}>{rec.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="bg-slate-50 p-1 text-right text-[8px] border-t border-slate-300 font-bold text-indigo-700">
                    * Menampilkan {Math.min(10, filteredRecords.length)} dari total {filteredRecords.length} record data presensi terfilter.
                  </div>
                </div>

                {/* Simulated Signatures */}
                {includeSignatures && (
                  <div className="grid grid-cols-2 gap-4 text-center text-[8px] pt-8">
                    <div className="space-y-6">
                      <span>Mengetahui,<br />Kepala Sekolah SMAN 1 Lumbung</span>
                      <div className="font-bold underline">Drs. H. Mulyana, M.Pd.</div>
                    </div>
                    <div className="space-y-6">
                      <span>Ciamis, {todayStr}<br />Wali Kelas</span>
                      <div className="font-bold underline">Wali Kelas Pengampu</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAMPILAN 3: DEDICATED EXCEL EXPORT PANEL (MODE: excel) */}
      {/* ========================================================= */}
      {defaultMode === 'excel' && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Ekspor Spreadsheet Excel (.xlsx) / CSV</h2>
              <p className="text-xs text-slate-500">Formulasi data dan unduh rekapitulasi presensi tabular resmi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nama File Hasil Ekspor</label>
                <div className="relative">
                  <input
                    type="text"
                    value={excelFilename}
                    onChange={(e) => setExcelFilename(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">.xlsx</span>
                </div>
              </div>

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
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mulai Dari</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Opsi Kolom Tambahan</span>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Sertakan Jam Scan</span>
                    <span className="text-[9px] text-slate-400">Format waktu deteksi (HH:MM:SS)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeTime}
                    onChange={(e) => setIncludeTime(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Sertakan Catatan/Alasan</span>
                    <span className="text-[9px] text-slate-400">Catatan dispensasi/surat dokter</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
                <span>Estimasi Record Ter-ekspor:</span>
                <span className="text-emerald-700 font-black">{filteredRecords.length} Record</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCustomExcelExport}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor & Unduh Spreadsheet Excel Sekarang</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAMPILAN 4: GENERAL REPORT LOG / LIST TABLE (DEFAULT VIEWS) */}
      {/* ========================================================= */}
      {['daily', 'weekly', 'monthly'].includes(defaultMode) && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isWaliKelas
                    ? `Rekapitulasi Laporan Presensi ${currentUser?.assignedClassName || 'Kelas'}`
                    : `Laporan Kehadiran (${defaultMode === 'weekly' ? 'Mingguan' : defaultMode === 'monthly' ? 'Bulanan' : 'Harian'})`}
                </h2>
                <p className="text-xs text-slate-500">
                  Laporan log dan rincian transaksi scan absen pada periode tertentu.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-sm"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>PDF Print</span>
              </button>

              <button
                onClick={handleCustomExcelExport}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Cepat Export Excel</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Filter Parameter Laporan</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className="px-3 py-1 rounded-lg font-semibold text-slate-700 hover:bg-white"
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
                  className="px-3 py-1 rounded-lg font-semibold text-slate-700 hover:bg-white"
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
                  className="px-3 py-1 rounded-lg font-semibold text-slate-700 hover:bg-white"
                >
                  1 Bulan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Kelas</label>
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:border-indigo-600"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="HADIR">HADIR</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="SAKIT">SAKIT</option>
                  <option value="IZIN">IZIN</option>
                  <option value="ALPA">ALPA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pencarian Siswa</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama / NIS..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                Hasil Filter: <strong className="text-indigo-600 font-mono">{filteredRecords.length} Record</strong>
              </span>
              <span className="text-slate-500 font-mono font-semibold">
                Periode: {startDate} s/d {endDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
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
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Tidak ada record presensi pada periode dan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono text-indigo-700 font-bold">{r.nis}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.studentName}</td>
                        <td className="py-3 px-4 text-slate-700">{r.className}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{r.date}</td>
                        <td className="py-3 px-4 font-mono text-indigo-700 font-bold">{r.time}</td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                            {r.method}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'HADIR' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              HADIR
                            </span>
                          )}
                          {r.status === 'TERLAMBAT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              TERLAMBAT
                            </span>
                          )}
                          {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              {r.status}
                            </span>
                          )}
                          {r.status === 'ALPA' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ALPA
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-700 font-bold">
                          {r.status === 'TERLAMBAT' && r.lateMinutes ? `${r.lateMinutes} menit` : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[150px]">
                          {r.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value as AttendanceStatus)}
                            className="bg-white border border-slate-300 text-[11px] text-slate-800 rounded-lg px-2 py-1 focus:border-indigo-600 cursor-pointer"
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
      )}
    </div>
  );
};
