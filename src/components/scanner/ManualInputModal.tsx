import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { Student, StudentClass, AttendanceRecord, AttendanceStatus } from '../../types';
import { formatIndonesianDate } from '../../utils/dateUtils';
import {
  UserCheck,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  Lock,
  Unlock,
  Save,
  ShieldAlert,
  Edit3,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Sparkles,
  SlidersHorizontal,
  ListChecks,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';

interface ManualInputProps {
  onSuccess?: (msg: string) => void;
}

interface DraftRecord {
  status: AttendanceStatus | 'UNABSENTED';
  lateMinutes: number;
  notes: string;
}

export const ManualInputModal: React.FC<ManualInputProps> = ({ onSuccess }) => {
  const { currentUser, isAdmin } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'UNABSENTED' | AttendanceStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Display count state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Multi-Selection State for "Pilih Data Dahulu, Baru Pilih Status"
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCustomSelectedModalOpen, setIsCustomSelectedModalOpen] = useState(false);
  const [customSelectedStatus, setCustomSelectedStatus] = useState<AttendanceStatus | 'UNABSENTED'>('HADIR');
  const [customSelectedLateMinutes, setCustomSelectedLateMinutes] = useState(10);
  const [customSelectedNotes, setCustomSelectedNotes] = useState('');

  // Bulk Status Modal & Configuration State
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<AttendanceStatus>('HADIR');
  const [bulkOnlyUnabsented, setBulkOnlyUnabsented] = useState(true);
  const [bulkLateMinutes, setBulkLateMinutes] = useState(10);
  const [bulkNotes, setBulkNotes] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // Local draft changes for batch save & lock
  const [drafts, setDrafts] = useState<Record<string, DraftRecord>>({});
  const [isLocked, setIsLocked] = useState(false);

  // Popup Modal State for Single Student Attendance Input
  const [selectedStudentForPopup, setSelectedStudentForPopup] = useState<Student | null>(null);
  const [popupStatus, setPopupStatus] = useState<AttendanceStatus | 'UNABSENTED'>('UNABSENTED');
  const [popupLateMinutes, setPopupLateMinutes] = useState<number>(0);
  const [popupNotes, setPopupNotes] = useState<string>('');

  const isPastDate = selectedDate < todayStr;
  const canEdit = isAdmin || (!isLocked && !isPastDate);

  const refreshData = () => {
    const activeStudents = StorageService.getStudents().filter(s => s.status === 'aktif');
    const allClasses = StorageService.getClasses();
    const allAttendances = StorageService.getAttendances();

    setStudents(activeStudents);
    setClasses(allClasses);
    setAttendances(allAttendances);

    const lockedState = StorageService.isDateLocked(selectedDate);
    setIsLocked(lockedState);

    // Initialize drafts from existing attendance records for the selected date
    const dateAttendances = allAttendances.filter(a => a.date === selectedDate);
    const initialDrafts: Record<string, DraftRecord> = {};

    activeStudents.forEach(s => {
      const rec = dateAttendances.find(a => a.studentId === s.id);
      if (rec) {
        initialDrafts[s.id] = {
          status: rec.status,
          lateMinutes: rec.lateMinutes || 0,
          notes: rec.notes || ''
        };
      } else {
        initialDrafts[s.id] = {
          status: 'UNABSENTED',
          lateMinutes: 0,
          notes: ''
        };
      }
    });

    setDrafts(initialDrafts);
  };

  useEffect(() => {
    refreshData();

    const handleDataUpdate = () => {
      refreshData();
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, [selectedDate]);

  // Open Popup Modal for Student
  const handleOpenPopup = (student: Student) => {
    if (!canEdit) return;
    const currentDraft = drafts[student.id] || { status: 'UNABSENTED', lateMinutes: 0, notes: '' };
    setSelectedStudentForPopup(student);
    setPopupStatus(currentDraft.status);
    setPopupLateMinutes(currentDraft.lateMinutes || (currentDraft.status === 'TERLAMBAT' ? 10 : 0));
    setPopupNotes(currentDraft.notes || '');
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPopup) return;

    const student = selectedStudentForPopup;
    const finalLate = popupStatus === 'TERLAMBAT' ? Math.max(1, popupLateMinutes) : 0;

    const isWithoutTime = popupStatus === 'SAKIT' || popupStatus === 'IZIN' || popupStatus === 'ALPA';
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const existingRecord = attendances.find(a => a.studentId === student.id && a.date === selectedDate);

    let res: { success: boolean; error?: string } = { success: true };

    if (popupStatus === 'UNABSENTED') {
      if (existingRecord) {
        res = await StorageService.deleteAttendance(existingRecord.id);
      }
    } else {
      res = await StorageService.createManualAttendance({
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        date: selectedDate,
        time: isWithoutTime ? '-' : (existingRecord?.time && existingRecord.time !== '-' ? existingRecord.time : currentTimeStr),
        status: popupStatus as AttendanceStatus,
        lateMinutes: finalLate,
        notes: popupNotes,
        scannedBy: `${currentUser?.name || 'Petugas'} (Absensi Manual)`
      });
    }

    setSelectedStudentForPopup(null);
    refreshData();

    if (res.success) {
      if (onSuccess) {
        onSuccess(`Presensi siswa ${student.name} berhasil disimpan.`);
      }
    } else {
      alert(`Gagal menyimpan data ke database Supabase: ${res.error || 'Unknown error'}`);
    }
  };

  const handleSaveAndLock = () => {
    // Lock the date batch
    StorageService.lockDate(selectedDate);
    refreshData();

    if (onSuccess) {
      onSuccess(`Presensi tanggal ${selectedDate} berhasil dikunci!`);
    }
  };

  const handleUnlockDate = () => {
    if (confirm(`Buka kunci presensi untuk tanggal ${selectedDate}?`)) {
      StorageService.unlockDate(selectedDate);
      refreshData();
      if (onSuccess) {
        onSuccess(`Kunci presensi tanggal ${selectedDate} telah dibuka.`);
      }
    }
  };

  const handleBulkApplyStatus = async (
    targetStatus: AttendanceStatus,
    lateMinutes: number = 0,
    notes: string = '',
    onlyUnabsented: boolean = true
  ) => {
    let affectedCount = 0;
    let skippedCount = 0;
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isWithoutTime = targetStatus === 'SAKIT' || targetStatus === 'IZIN' || targetStatus === 'ALPA';

    for (const s of filteredStudents) {
      const existing = attendances.find(a => a.studentId === s.id && a.date === selectedDate);
      if (onlyUnabsented && existing) {
        skippedCount++;
        continue; // Kecualikan siswa yang sudah terisi statusnya
      }

      await StorageService.createManualAttendance({
        studentId: s.id,
        nis: s.nis,
        studentName: s.name,
        classId: s.classId,
        className: s.className,
        date: selectedDate,
        time: isWithoutTime ? '-' : (existing?.time && existing.time !== '-' ? existing.time : currentTimeStr),
        status: targetStatus,
        lateMinutes: targetStatus === 'TERLAMBAT' ? Math.max(1, lateMinutes) : 0,
        notes: notes || (targetStatus === 'ALPA' ? 'Penetapan Alpa Massal' : ''),
        scannedBy: `${currentUser?.name || 'Petugas'} (Absensi Manual)`
      });
      affectedCount++;
    }

    setIsBulkStatusModalOpen(false);
    refreshData();

    if (onSuccess) {
      onSuccess(
        `Berhasil menerapkan status ${targetStatus} ke ${affectedCount} siswa di database.${
          skippedCount > 0 ? ` (${skippedCount} siswa yang sudah terisi statusnya dikecualikan).` : ''
        }`
      );
    }
  };

  const handleBulkSetUnabsentedAsAlpa = () => {
    handleBulkApplyStatus('ALPA', 0, 'Penetapan Alpa Otomatis', true);
  };

  const handleBulkSetUnabsentedAsHadir = () => {
    handleBulkApplyStatus('HADIR', 0, '', true);
  };

  // --- METHODS UNTUK FITUR: PILIH DATA TERLEBIH DAHULU, BARU PILIH STATUS ---
  const toggleSelectStudent = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedStudents.map(s => s.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedStudentIds.includes(id));
    if (allPageSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(allFilteredIds);
  };

  const handleSelectAllUnabsented = () => {
    const unabsentedIds = filteredStudents
      .filter(s => !drafts[s.id] || drafts[s.id]?.status === 'UNABSENTED')
      .map(s => s.id);
    setSelectedStudentIds(unabsentedIds);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleApplyStatusToSelected = async (
    targetStatus: AttendanceStatus | 'UNABSENTED',
    lateMinutes: number = 0,
    notes: string = ''
  ) => {
    if (selectedStudentIds.length === 0) return;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isWithoutTime = targetStatus === 'SAKIT' || targetStatus === 'IZIN' || targetStatus === 'ALPA';

    for (const id of selectedStudentIds) {
      const s = students.find(std => std.id === id);
      if (!s) continue;

      const existing = attendances.find(a => a.studentId === s.id && a.date === selectedDate);

      if (targetStatus === 'UNABSENTED') {
        if (existing) {
          await StorageService.deleteAttendance(existing.id);
        }
      } else {
        await StorageService.createManualAttendance({
          studentId: s.id,
          nis: s.nis,
          studentName: s.name,
          classId: s.classId,
          className: s.className,
          date: selectedDate,
          time: isWithoutTime ? '-' : (existing?.time && existing.time !== '-' ? existing.time : currentTimeStr),
          status: targetStatus,
          lateMinutes: targetStatus === 'TERLAMBAT' ? Math.max(1, lateMinutes) : 0,
          notes: notes || (targetStatus === 'ALPA' ? 'Penetapan Alpa Massal' : ''),
          scannedBy: `${currentUser?.name || 'Petugas'} (Absensi Manual)`
        });
      }
    }

    const count = selectedStudentIds.length;
    setSelectedStudentIds([]);
    setIsCustomSelectedModalOpen(false);
    refreshData();

    if (onSuccess) {
      onSuccess(`Berhasil menerapkan status ${targetStatus} ke ${count} siswa terpilih di database!`);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClassId === 'ALL' || s.classId === selectedClassId;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());

    const draftStatus = drafts[s.id]?.status || 'UNABSENTED';

    let matchesStatus = true;
    if (selectedStatusFilter === 'UNABSENTED') {
      matchesStatus = draftStatus === 'UNABSENTED';
    } else if (selectedStatusFilter !== 'ALL') {
      matchesStatus = draftStatus === selectedStatusFilter;
    }

    return matchesClass && matchesSearch && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, selectedStatusFilter, searchQuery, itemsPerPage]);

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = itemsPerPage === 999
    ? filteredStudents
    : filteredStudents.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  const startRecordIdx = totalFiltered === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endRecordIdx = itemsPerPage === 999 ? totalFiltered : Math.min(safeCurrentPage * itemsPerPage, totalFiltered);

  const classStudents = students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);

  const totalStudentsInFilter = classStudents.length;
  const hadirCount = classStudents.filter(s => drafts[s.id]?.status === 'HADIR').length;
  const terlambatCount = classStudents.filter(s => drafts[s.id]?.status === 'TERLAMBAT').length;
  const sakitCount = classStudents.filter(s => drafts[s.id]?.status === 'SAKIT').length;
  const izinCount = classStudents.filter(s => drafts[s.id]?.status === 'IZIN').length;
  const alpaCount = classStudents.filter(s => drafts[s.id]?.status === 'ALPA').length;
  const unabsentedCount = classStudents.filter(s => !drafts[s.id] || drafts[s.id]?.status === 'UNABSENTED').length;

  return (
    <div className="space-y-6 relative">
      {/* ========================================================= */}
      {/* POPUP MODAL UNTUK ISI ABSENSI SISWA */}
      {/* ========================================================= */}
      {selectedStudentForPopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">
                  Popup Input Presensi Siswa
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedStudentForPopup.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  NIS: {selectedStudentForPopup.nis} • Kelas: {selectedStudentForPopup.className}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForPopup(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePopup} className="space-y-4">
              {/* Date Info */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-center gap-2 text-xs text-indigo-900 font-medium">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Tanggal Presensi: <strong>{formatIndonesianDate(selectedDate)}</strong></span>
              </div>

              {/* Status Selection Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Status Kehadiran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPopupStatus('HADIR')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'HADIR'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HADIR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPopupStatus('TERLAMBAT');
                      if (popupLateMinutes === 0) setPopupLateMinutes(10);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'TERLAMBAT'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>TERLAMBAT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupStatus('SAKIT')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'SAKIT'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>SAKIT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupStatus('IZIN')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'IZIN'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>IZIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupStatus('ALPA')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'ALPA'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>ALPA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPopupStatus('UNABSENTED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      popupStatus === 'UNABSENTED'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>BELUM ABSEN</span>
                  </button>
                </div>
              </div>

              {/* Conditional Late Duration Field */}
              {popupStatus === 'TERLAMBAT' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 animate-fade-in">
                  <label className="block text-xs font-bold text-amber-900">
                    Durasi Keterlambatan (Menit)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={240}
                      required
                      value={popupLateMinutes}
                      onChange={(e) => setPopupLateMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-24 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-amber-900 focus:border-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-800">Menit Keterlambatan</span>
                  </div>
                </div>
              )}

              {/* Catatan / Alasan Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Alasan (Opsional)</label>
                <input
                  type="text"
                  value={popupNotes}
                  onChange={(e) => setPopupNotes(e.target.value)}
                  placeholder="Contoh: Surat sakit dokter, Motor mogok..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-600"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForPopup(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Bar SMAN 1 Lumbung & Date Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Absensi Manual Siswa SMAN 1 Lumbung</h2>
            <p className="text-xs text-slate-500">
              Klik tombol <strong>Isi Presensi</strong> pada baris siswa untuk membuka <strong>Popup Modal Input Absensi</strong>
            </p>
          </div>
        </div>

        {/* Calendar Picker & Save / Lock Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="block text-[10px] text-slate-500 font-semibold">Pilih Tanggal Presensi:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-900 font-mono font-bold focus:outline-none cursor-pointer text-xs"
              />
            </div>
          </div>

          {/* Action Buttons: Simpan & Kunci / Buka Kunci */}
          {canEdit ? (
            <button
              onClick={handleSaveAndLock}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <Lock className="w-3.5 h-3.5" />
              <span>Simpan Data & Kunci Presensi</span>
            </button>
          ) : (
            isAdmin && (
              <button
                onClick={handleUnlockDate}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Kunci Presensi</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Lock Warning Banner */}
      {!canEdit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="leading-relaxed font-medium">
            {isPastDate ? (
              <span>
                <strong>Tanggal Lampau Terkunci:</strong> Hari telah berganti ({formatIndonesianDate(selectedDate)}). Status presensi siswa tanggal ini telah dikunci dan hanya dapat diubah oleh <strong>Admin</strong>.
              </span>
            ) : (
              <span>
                <strong>Presensi Dikunci:</strong> Data presensi untuk tanggal {formatIndonesianDate(selectedDate)} telah dikunci. Untuk melakukan perubahan, silakan minta Admin untuk membuka kunci presensi melalui Pengaturan.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Status Quick Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedStatusFilter('ALL')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold">Semua Siswa</span>
            <Users className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-xl font-mono font-bold mt-1">{totalStudentsInFilter}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('UNABSENTED')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'UNABSENTED'
              ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-700">Belum Absen</span>
            {unabsentedCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{unabsentedCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('HADIR')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'HADIR'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{hadirCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('TERLAMBAT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'TERLAMBAT'
              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-700">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{terlambatCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('SAKIT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'SAKIT'
              ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-sky-700">Sakit / Izin</span>
            <AlertTriangle className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{sakitCount + izinCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('ALPA')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'ALPA'
              ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm font-bold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-700">Alpa</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-slate-900">{alpaCount}</p>
        </button>
      </div>

      {/* Filter Controls & Selection Helper Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Filter Kelas (Sorted Alphabetically) */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Filter Kelas Siswa</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 focus:border-indigo-600 font-medium"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Siswa atau NIS..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Bulk Action Buttons */}
          <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2 pt-1 md:pt-5">
            <button
              type="button"
              onClick={() => setIsBulkStatusModalOpen(true)}
              disabled={!canEdit || totalFiltered === 0}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-40 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              title="Tandai status seluruh siswa terfilter dengan opsi pengecualian"
            >
              <CheckCheck className="w-4 h-4 text-indigo-600" />
              <span>Tandai Status Massal Filter...</span>
            </button>

            <button
              type="button"
              onClick={handleBulkSetUnabsentedAsHadir}
              disabled={!canEdit || unabsentedCount === 0}
              className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-40 text-emerald-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-2xs"
              title="Tandai seluruh siswa yang belum absen menjadi HADIR"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Belum Absen → HADIR ({unabsentedCount})</span>
            </button>
          </div>
        </div>

        {/* Quick Selection Helper Bar */}
        {canEdit && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1 mr-1">
                <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih Siswa:</span>
              </span>

              <button
                type="button"
                onClick={handleSelectAllOnPage}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-[11px] transition-all border border-slate-200"
              >
                Halaman Ini ({paginatedStudents.length})
              </button>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-[11px] transition-all border border-slate-200"
              >
                Semua Terfilter ({totalFiltered})
              </button>

              <button
                type="button"
                onClick={handleSelectAllUnabsented}
                disabled={unabsentedCount === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 text-slate-700 font-semibold text-[11px] transition-all border border-slate-200"
              >
                Hanya Belum Absen ({unabsentedCount})
              </button>

              {selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-all border border-rose-200 ml-1 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Batalkan Pilihan ({selectedStudentIds.length})</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              💡 Centang kotak pada tabel atau gunakan tombol di atas untuk memilih siswa, lalu tetapkan statusnya.
            </span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* PROMINENT / STICKY SELECTION ACTION BAR */}
      {/* Muncul ketika ada siswa yang dipilih (Pilih Data Dahulu, Baru Pilih Status) */}
      {/* ========================================================= */}
      {selectedStudentIds.length > 0 && canEdit && (
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl shadow-xl border border-indigo-700/80 flex flex-wrap items-center justify-between gap-4 animate-scale-up sticky top-4 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black border border-white/20 shadow-inner">
              <CheckCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-tight">
                  {selectedStudentIds.length} Siswa Terpilih
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full shadow-xs">
                  Siap Diberi Status
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Pilih status di bawah ini untuk diterapkan langsung ke {selectedStudentIds.length} siswa terpilih:
              </p>
            </div>
          </div>

          {/* PALET TOMBOL STATUS PILIHAN */}
          <div className="flex flex-wrap items-center gap-2">
            {/* HADIR */}
            <button
              type="button"
              onClick={() => handleApplyStatusToSelected('HADIR')}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>HADIR</span>
            </button>

            {/* TERLAMBAT */}
            <button
              type="button"
              onClick={() => {
                setCustomSelectedStatus('TERLAMBAT');
                setCustomSelectedLateMinutes(10);
                setIsCustomSelectedModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Clock className="w-4 h-4" />
              <span>TERLAMBAT...</span>
            </button>

            {/* SAKIT */}
            <button
              type="button"
              onClick={() => handleApplyStatusToSelected('SAKIT')}
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>SAKIT</span>
            </button>

            {/* IZIN */}
            <button
              type="button"
              onClick={() => handleApplyStatusToSelected('IZIN')}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>IZIN</span>
            </button>

            {/* ALPA */}
            <button
              type="button"
              onClick={() => handleApplyStatusToSelected('ALPA')}
              className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>ALPA</span>
            </button>

            {/* RESET / BELUM ABSEN */}
            <button
              type="button"
              onClick={() => handleApplyStatusToSelected('UNABSENTED')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95"
              title="Kembalikan status siswa terpilih ke Belum Absen"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
              <span>Reset</span>
            </button>

            {/* ATUR KUSTOM */}
            <button
              type="button"
              onClick={() => setIsCustomSelectedModalOpen(true)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              title="Atur status, catatan, atau durasi keterlambatan secara kustom"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Atur Kustom...</span>
            </button>

            {/* BATAL */}
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Student Table - Clean Table with Checkbox Multi-Select and Popup Action */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">
              Menampilkan <strong className="text-indigo-600 font-mono">{startRecordIdx}-{endRecordIdx}</strong> dari <strong className="text-slate-900 font-mono">{totalFiltered}</strong> Siswa
            </span>
            {selectedStudentIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                {selectedStudentIds.length} Siswa Tercentang
              </span>
            )}
            {isLocked && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                <Lock className="w-3 h-3" />
                <span>Status Terkunci</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Tampilkan per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-600"
              >
                <option value={10}>10 Data</option>
                <option value={25}>25 Data</option>
                <option value={50}>50 Data</option>
                <option value={100}>100 Data</option>
                <option value={999}>Semua ({totalFiltered})</option>
              </select>
            </div>

            <span className="text-slate-500 font-mono font-semibold hidden sm:inline">
              Tanggal: {formatIndonesianDate(selectedDate)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                {/* Checkbox Header */}
                <th className="py-3 px-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id))}
                    onChange={handleSelectAllOnPage}
                    disabled={!canEdit || paginatedStudents.length === 0}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer disabled:opacity-40"
                    title="Pilih / Batalkan semua siswa pada halaman ini"
                  />
                </th>
                <th className="py-3 px-3 w-10 text-slate-400">No</th>
                <th className="py-3 px-4 whitespace-nowrap">NIS</th>
                {/* Kolom Nama Siswa: Boleh Wrap jika panjang */}
                <th className="py-3 px-4 min-w-[170px] max-w-[260px]">Nama Siswa</th>
                <th className="py-3 px-4 whitespace-nowrap">Kelas</th>
                <th className="py-3 px-4 whitespace-nowrap">Jam Presensi</th>
                {/* Kolom Status: Jangan Wrap */}
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Durasi Keterlambatan</th>
                <th className="py-3 px-4 min-w-[140px]">Catatan / Alasan</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Aksi Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada siswa yang sesuai dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const actualIndex = itemsPerPage === 999 ? idx + 1 : (safeCurrentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedStudentIds.includes(student.id);
                  const record = attendances.find(
                    a => a.studentId === student.id && a.date === selectedDate
                  );
                  const draft = drafts[student.id] || { status: 'UNABSENTED', lateMinutes: 0, notes: '' };

                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleSelectStudent(student.id)}
                      className={`transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 hover:bg-indigo-100/70 font-semibold'
                          : draft.status !== 'UNABSENTED'
                          ? 'bg-slate-50/40 hover:bg-indigo-50/30'
                          : 'hover:bg-indigo-50/30'
                      }`}
                    >
                      {/* Checkbox Cell */}
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectStudent(student.id, e)}
                          disabled={!canEdit}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer disabled:opacity-40"
                        />
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 font-mono">{actualIndex}</td>
                      <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold whitespace-nowrap">{student.nis}</td>
                      
                      {/* Nama Siswa: wrap jika panjang */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 min-w-[170px] max-w-[260px] whitespace-normal break-words leading-snug">
                        {student.name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">{student.className}</td>

                      {/* Jam Presensi */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {record && record.time !== '-' ? (
                          <span className="text-emerald-700 font-bold">{record.time}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Status Column: JANGAN WRAP (whitespace-nowrap) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {draft.status === 'HADIR' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            HADIR
                          </span>
                        )}
                        {draft.status === 'TERLAMBAT' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            TERLAMBAT
                          </span>
                        )}
                        {draft.status === 'SAKIT' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            SAKIT
                          </span>
                        )}
                        {draft.status === 'IZIN' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            IZIN
                          </span>
                        )}
                        {draft.status === 'ALPA' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ALPA
                          </span>
                        )}
                        {draft.status === 'UNABSENTED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            BELUM ABSEN
                          </span>
                        )}
                      </td>

                      {/* Durasi Keterlambatan Column */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {draft.status === 'TERLAMBAT' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] inline-block">
                            {draft.lateMinutes || 0} menit
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Catatan / Alasan Column */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {draft.notes ? (
                          <span className="line-clamp-2 max-w-[180px] block leading-snug">{draft.notes}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Popup Trigger Action Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleOpenPopup(student)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{draft.status === 'UNABSENTED' ? 'Isi' : 'Ubah'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS FOOTER */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Halaman <strong className="text-slate-900">{safeCurrentPage}</strong> dari <strong className="text-slate-900">{totalPages}</strong> (Total {totalFiltered} Siswa Terfilter)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                    safeCurrentPage === page
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Save & Lock Footer */}
        {canEdit && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Pastikan seluruh status dan durasi keterlambatan siswa sudah benar sebelum disimpan & dikunci.
            </span>

            <button
              onClick={handleSaveAndLock}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all ml-auto"
            >
              <Save className="w-4 h-4" />
              <Lock className="w-3.5 h-3.5" />
              <span>Simpan Data & Kunci Presensi Tanggal Ini</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TANDAI STATUS MASSAL / BULK STATUS SELURUH FILTER */}
      {/* ========================================================= */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tandai Status Presensi Seluruh Filter
                  </h3>
                  <p className="text-xs text-slate-500">
                    Terapkan status kehadiran untuk seluruh siswa terfilter ({totalFiltered} siswa)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Selector Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Status Target:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus('HADIR')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      bulkTargetStatus === 'HADIR'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HADIR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus('TERLAMBAT')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      bulkTargetStatus === 'TERLAMBAT'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>TERLAMBAT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus('ALPA')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      bulkTargetStatus === 'ALPA'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>ALPA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus('SAKIT')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      bulkTargetStatus === 'SAKIT'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>SAKIT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus('IZIN')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      bulkTargetStatus === 'IZIN'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>IZIN</span>
                  </button>
                </div>
              </div>

              {/* Exclusion Checkbox - Crucial User Requirement */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkOnlyUnabsented}
                    onChange={(e) => setBulkOnlyUnabsented(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Kecualikan siswa yang sudah terisi statusnya
                    </span>
                    <span className="text-[11px] text-indigo-800 leading-tight block mt-0.5">
                      {bulkOnlyUnabsented
                        ? `Hanya akan diterapkan pada ${unabsentedCount} siswa yang masih berstatus 'BELUM ABSEN'. Siswa yang sudah berstatus Hadir/Terlambat/Sakit/Izin/Alpa tidak akan tertimpa.`
                        : 'Perhatian: Seluruh siswa terfilter akan ditimpa dengan status ini.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Late minutes if TERLAMBAT */}
              {bulkTargetStatus === 'TERLAMBAT' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-amber-900">
                    Durasi Keterlambatan Massal (Menit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={bulkLateMinutes}
                      onChange={(e) => setBulkLateMinutes(parseInt(e.target.value, 10) || 10)}
                      className="w-24 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-amber-900"
                    />
                    <span className="text-xs font-bold text-amber-800">Menit Keterlambatan</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Massal (Opsional):
                </label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Contoh: Penetapan Massal Kegiatan Sekolah..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleBulkApplyStatus(bulkTargetStatus, bulkLateMinutes, bulkNotes, bulkOnlyUnabsented)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Terapkan Status Massal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ATUR STATUS SISWA TERPILIH (KUSTOM) */}
      {/* ========================================================= */}
      {isCustomSelectedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Atur Status untuk {selectedStudentIds.length} Siswa Terpilih
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tentukan status, durasi terlambat, dan catatan untuk siswa yang sudah Anda centang
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomSelectedModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Selector Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Status Target:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('HADIR')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'HADIR'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HADIR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('TERLAMBAT')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'TERLAMBAT'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>TERLAMBAT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('ALPA')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'ALPA'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>ALPA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('SAKIT')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'SAKIT'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>SAKIT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('IZIN')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'IZIN'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>IZIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomSelectedStatus('UNABSENTED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      customSelectedStatus === 'UNABSENTED'
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>BELUM ABSEN</span>
                  </button>
                </div>
              </div>

              {/* Late minutes if TERLAMBAT */}
              {customSelectedStatus === 'TERLAMBAT' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 animate-fade-in">
                  <label className="block text-xs font-bold text-amber-900">
                    Durasi Keterlambatan Siswa Terpilih (Menit):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={customSelectedLateMinutes}
                      onChange={(e) => setCustomSelectedLateMinutes(parseInt(e.target.value, 10) || 10)}
                      className="w-24 bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-amber-900"
                    />
                    <span className="text-xs font-bold text-amber-800">Menit Keterlambatan</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  value={customSelectedNotes}
                  onChange={(e) => setCustomSelectedNotes(e.target.value)}
                  placeholder="Contoh: Dispensasi kegiatan OSIS, Tugas lomba..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomSelectedModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleApplyStatusToSelected(customSelectedStatus, customSelectedLateMinutes, customSelectedNotes)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Terapkan ke {selectedStudentIds.length} Siswa Terpilih</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
