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
  Check,
  X,
  Info
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

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // Local draft changes for batch save & lock
  const [drafts, setDrafts] = useState<Record<string, DraftRecord>>({});
  const [isLocked, setIsLocked] = useState(false);

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
  }, [selectedDate]);

  const handleStatusDraftChange = (studentId: string, newStatus: AttendanceStatus | 'UNABSENTED') => {
    setDrafts(prev => {
      const current = prev[studentId] || { status: 'UNABSENTED', lateMinutes: 0, notes: '' };
      let defaultLate = current.lateMinutes;
      if (newStatus === 'TERLAMBAT' && defaultLate === 0) {
        defaultLate = 10;
      }
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: newStatus,
          lateMinutes: newStatus === 'TERLAMBAT' ? defaultLate : 0
        }
      };
    });
  };

  const handleLateMinutesDraftChange = (studentId: string, minutes: number) => {
    setDrafts(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        lateMinutes: Math.max(0, minutes)
      }
    }));
  };

  const handleNoteDraftChange = (studentId: string, note: string) => {
    setDrafts(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes: note
      }
    }));
  };

  const handleSaveAndLock = () => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let savedCount = 0;

    students.forEach(student => {
      const draft = drafts[student.id];
      if (!draft || draft.status === 'UNABSENTED') return;

      const existingRecord = attendances.find(a => a.studentId === student.id && a.date === selectedDate);
      const isWithoutTime = draft.status === 'SAKIT' || draft.status === 'IZIN' || draft.status === 'ALPA';

      StorageService.createManualAttendance({
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        date: selectedDate,
        time: isWithoutTime ? '-' : (existingRecord?.time && existingRecord.time !== '-' ? existingRecord.time : currentTimeStr),
        status: draft.status,
        lateMinutes: draft.status === 'TERLAMBAT' ? draft.lateMinutes : 0,
        notes: draft.notes,
        scannedBy: `${currentUser?.name || 'Petugas'} (Absensi Manual)`
      });

      savedCount++;
    });

    // Lock the date batch
    StorageService.lockDate(selectedDate);
    refreshData();

    if (onSuccess) {
      onSuccess(`Presensi tanggal ${selectedDate} (${savedCount} siswa) berhasil disimpan & dikunci!`);
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

  const handleBulkSetUnabsentedAsAlpa = () => {
    setDrafts(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        if (!updated[s.id] || updated[s.id].status === 'UNABSENTED') {
          updated[s.id] = {
            status: 'ALPA',
            lateMinutes: 0,
            notes: 'Penetapan Alpa Otomatis'
          };
        }
      });
      return updated;
    });
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

  const classStudents = students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);

  const totalStudentsInFilter = classStudents.length;
  const hadirCount = classStudents.filter(s => drafts[s.id]?.status === 'HADIR').length;
  const terlambatCount = classStudents.filter(s => drafts[s.id]?.status === 'TERLAMBAT').length;
  const sakitCount = classStudents.filter(s => drafts[s.id]?.status === 'SAKIT').length;
  const izinCount = classStudents.filter(s => drafts[s.id]?.status === 'IZIN').length;
  const alpaCount = classStudents.filter(s => drafts[s.id]?.status === 'ALPA').length;
  const unabsentedCount = classStudents.filter(s => !drafts[s.id] || drafts[s.id]?.status === 'UNABSENTED').length;

  return (
    <div className="space-y-6">
      {/* Header Bar SMAN 1 Lumbung & Date Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Absensi Manual Siswa SMAN 1 Lumbung</h2>
            <p className="text-xs text-slate-500">
              Input dan perbarui status presensi siswa menggunakan menu Dropdown Drop-in
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

      {/* Filter Controls & Bulk Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Filter Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Filter Kelas Siswa</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 focus:border-indigo-600"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Siswa atau NIS..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Bulk Action Button */}
          <div className="flex justify-end pt-5 md:pt-0">
            <button
              onClick={handleBulkSetUnabsentedAsAlpa}
              disabled={!canEdit || unabsentedCount === 0}
              className="w-full md:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Set Belum Absen → ALPA ({unabsentedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Student Table with Dropdown Status & Separate Durasi Keterlambatan */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 flex items-center gap-2">
            <span>
              Menampilkan <strong className="text-indigo-600 font-mono">{filteredStudents.length} Siswa</strong>
            </span>
            {isLocked && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                <Lock className="w-3 h-3" />
                <span>Status Terkunci</span>
              </span>
            )}
          </span>
          <span className="text-slate-500 font-mono font-semibold">
            Tanggal Presensi: {formatIndonesianDate(selectedDate)}
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
                <th className="py-3 px-4">Jam Presensi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Durasi Keterlambatan</th>
                <th className="py-3 px-4">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada siswa yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const record = attendances.find(
                    a => a.studentId === student.id && a.date === selectedDate
                  );
                  const draft = drafts[student.id] || { status: 'UNABSENTED', lateMinutes: 0, notes: '' };

                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700 font-bold">{student.nis}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{student.name}</td>
                      <td className="py-3 px-4 text-slate-700">{student.className}</td>

                      {/* Jam Presensi */}
                      <td className="py-3 px-4 font-mono">
                        {record && record.time !== '-' ? (
                          <span className="text-emerald-700 font-bold">{record.time}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Status Column (Dropdown Select Menu) */}
                      <td className="py-3 px-4">
                        <select
                          disabled={!canEdit}
                          value={draft.status}
                          onChange={(e) => handleStatusDraftChange(student.id, e.target.value as AttendanceStatus | 'UNABSENTED')}
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            draft.status === 'HADIR'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : draft.status === 'TERLAMBAT'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : draft.status === 'SAKIT'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : draft.status === 'IZIN'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : draft.status === 'ALPA'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <option value="UNABSENTED">BELUM ABSEN</option>
                          <option value="HADIR">HADIR</option>
                          <option value="TERLAMBAT">TERLAMBAT</option>
                          <option value="SAKIT">SAKIT</option>
                          <option value="IZIN">IZIN</option>
                          <option value="ALPA">ALPA</option>
                        </select>
                      </td>

                      {/* Durasi Keterlambatan Column (Separated Column) */}
                      <td className="py-3 px-4 font-mono">
                        {draft.status === 'TERLAMBAT' ? (
                          canEdit ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={240}
                                value={draft.lateMinutes}
                                onChange={(e) => handleLateMinutesDraftChange(student.id, parseInt(e.target.value, 10) || 0)}
                                className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold font-mono text-amber-900 focus:border-amber-600 focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-amber-700">menit</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              {draft.lateMinutes || 0} menit
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Catatan / Alasan Column */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={draft.notes}
                          onChange={(e) => handleNoteDraftChange(student.id, e.target.value)}
                          placeholder="Keterangan..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save & Lock Footer */}
        {canEdit && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Pastikan seluruh status dan durasi keterlambatan siswa sudah benar sebelum dikunci.
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
    </div>
  );
};
