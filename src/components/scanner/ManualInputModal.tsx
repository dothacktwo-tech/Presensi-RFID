import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { Student, StudentClass, AttendanceRecord, AttendanceStatus } from '../../types';
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
  Edit,
  Save,
  Users,
  Check,
  X
} from 'lucide-react';

interface ManualInputProps {
  onSuccess?: (msg: string) => void;
}

export const ManualInputModal: React.FC<ManualInputProps> = ({ onSuccess }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedClassDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'UNABSENTED' | AttendanceStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // Note editing state for individual student
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const refreshData = () => {
    setStudents(StorageService.getStudents().filter(s => s.status === 'aktif'));
    setClasses(StorageService.getClasses());
    setAttendances(StorageService.getAttendances());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filter students based on Class, Search, and Attendance Status on Selected Date
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClassId === 'ALL' || s.classId === selectedClassId;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());

    const studentRecord = attendances.find(
      a => a.studentId === s.id && a.date === selectedDate
    );

    let matchesStatus = true;
    if (selectedStatusFilter === 'UNABSENTED') {
      matchesStatus = !studentRecord;
    } else if (selectedStatusFilter !== 'ALL') {
      matchesStatus = studentRecord?.status === selectedStatusFilter;
    }

    return matchesClass && matchesSearch && matchesStatus;
  });

  // Calculate status counts for selected date and class filter
  const classStudents = students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);
  const dateRecords = attendances.filter(a => a.date === selectedDate && (selectedClassId === 'ALL' || a.classId === selectedClassId));

  const totalStudentsInFilter = classStudents.length;
  const hadirCount = dateRecords.filter(r => r.status === 'HADIR').length;
  const terlambatCount = dateRecords.filter(r => r.status === 'TERLAMBAT').length;
  const sakitCount = dateRecords.filter(r => r.status === 'SAKIT').length;
  const izinCount = dateRecords.filter(r => r.status === 'IZIN').length;
  const alpaCount = dateRecords.filter(r => r.status === 'ALPA').length;
  const unabsentedCount = Math.max(0, totalStudentsInFilter - dateRecords.length);

  // Direct status update handler
  const handleDirectStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    let lateMin = 0;
    if (newStatus === 'TERLAMBAT') {
      const input = prompt(`Masukkan durasi keterlambatan untuk ${student.name} (menit):`, '10');
      lateMin = input ? parseInt(input, 10) || 10 : 10;
    }

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    StorageService.createManualAttendance({
      studentId: student.id,
      nis: student.nis,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      date: selectedDate,
      time: (newStatus === 'SAKIT' || newStatus === 'IZIN' || newStatus === 'ALPA') ? '-' : currentTimeStr,
      status: newStatus,
      lateMinutes: lateMin,
      scannedBy: 'Guru Piket / Admin (Absensi Manual)'
    });

    refreshData();
    if (onSuccess) {
      onSuccess(`Status ${student.name} berhasil diubah menjadi ${newStatus}.`);
    }
  };

  const handleSaveNote = (student: Student) => {
    const record = attendances.find(a => a.studentId === student.id && a.date === selectedDate);
    if (record) {
      StorageService.updateAttendanceStatus(record.id, record.status, tempNote);
      refreshData();
    } else {
      StorageService.createManualAttendance({
        studentId: student.id,
        nis: student.nis,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        date: selectedDate,
        status: 'HADIR',
        notes: tempNote
      });
      refreshData();
    }
    setEditingNoteId(null);
    setTempNote('');
  };

  // Bulk mark all unabsented as ALPA
  const handleBulkMarkUnabsentedAsAlpa = () => {
    const unabsentedStudents = classStudents.filter(
      s => !attendances.some(a => a.studentId === s.id && a.date === selectedDate)
    );

    if (unabsentedStudents.length === 0) {
      alert('Semua siswa pada filter ini sudah melakukan absensi.');
      return;
    }

    if (confirm(`Tandai ${unabsentedStudents.length} siswa yang belum absen pada ${selectedDate} sebagai ALPA?`)) {
      unabsentedStudents.forEach(s => {
        StorageService.createManualAttendance({
          studentId: s.id,
          nis: s.nis,
          studentName: s.name,
          classId: s.classId,
          className: s.className,
          date: selectedDate,
          time: '-',
          status: 'ALPA',
          notes: 'Penetapan Alpa Otomatis Akhir Hari'
        });
      });
      refreshData();
      alert(`Berhasil menandai ${unabsentedStudents.length} siswa sebagai ALPA.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar SMAN 1 Lumbung & Kalender Akademik */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Absensi Manual Siswa SMAN 1 Lumbung</h2>
            <p className="text-xs text-slate-400">
              Ubah status presensi siswa secara langsung (Hadir, Terlambat, Sakit, Izin, Alpa)
            </p>
          </div>
        </div>

        {/* Academic Calendar Info & Date Selector */}
        <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="text-xs">
            <span className="block text-[10px] text-slate-400 font-medium">
              Kalender Akademik: <strong className="text-indigo-300">2025/2026 (Ganjil)</strong>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedClassDate(e.target.value)}
              className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer text-xs"
            />
          </div>
        </div>
      </div>

      {/* Filter Status Quick Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedStatusFilter('ALL')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold">Semua Siswa</span>
            <Users className="w-4 h-4 text-indigo-300" />
          </div>
          <p className="text-xl font-mono font-bold mt-1">{totalStudentsInFilter}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('UNABSENTED')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'UNABSENTED'
              ? 'bg-rose-950 border-rose-500 text-rose-100 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400">Belum Absen</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-rose-200">{unabsentedCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('HADIR')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'HADIR'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-100 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{hadirCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('TERLAMBAT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'TERLAMBAT'
              ? 'bg-amber-950 border-amber-500 text-amber-100 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{terlambatCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('SAKIT')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'SAKIT'
              ? 'bg-sky-950 border-sky-500 text-sky-100 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-sky-400">Sakit / Izin</span>
            <AlertTriangle className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{sakitCount + izinCount}</p>
        </button>

        <button
          onClick={() => setSelectedStatusFilter('ALPA')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatusFilter === 'ALPA'
              ? 'bg-rose-950 border-rose-500 text-rose-100 shadow-md font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400">Alpa</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-mono font-bold mt-1 text-white">{alpaCount}</p>
        </button>
      </div>

      {/* Filter Options Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Filter Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Filter Kelas Siswa</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Siswa atau NIS..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Bulk Action Button */}
          <div className="flex justify-end pt-5 md:pt-0">
            <button
              onClick={handleBulkMarkUnabsentedAsAlpa}
              disabled={unabsentedCount === 0}
              className="w-full md:w-auto px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 disabled:opacity-40 text-rose-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Set Belum Absen → ALPA ({unabsentedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Student Table with Direct Status Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            Menampilkan <strong className="text-indigo-400 font-mono">{filteredStudents.length} Siswa</strong>
            {selectedStatusFilter === 'UNABSENTED' && <span className="text-rose-400 font-bold ml-1">(Belum Absen Hari Ini)</span>}
          </span>
          <span className="text-slate-400 font-mono">
            Tanggal: {formatIndonesianDate(selectedDate)}
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
                <th className="py-3 px-4">Jam Presensi</th>
                <th className="py-3 px-4">Status Hari Ini</th>
                <th className="py-3 px-4 text-center">Ubah Status Langsung (Admin / Guru Piket)</th>
                <th className="py-3 px-4">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada siswa yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const record = attendances.find(
                    a => a.studentId === student.id && a.date === selectedDate
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300">{student.nis}</td>
                      <td className="py-3 px-4 font-bold text-white">{student.name}</td>
                      <td className="py-3 px-4 text-slate-300">{student.className}</td>

                      {/* Jam Presensi (Omit/dash for Sakit, Izin, Alpa or Unabsented) */}
                      <td className="py-3 px-4 font-mono">
                        {record ? (
                          (record.status === 'SAKIT' || record.status === 'IZIN' || record.status === 'ALPA')
                            ? <span className="text-slate-500 italic">- (Tanpa Jam)</span>
                            : <span className="text-emerald-400 font-bold">{record.time}</span>
                        ) : (
                          <span className="text-slate-600 italic">-</span>
                        )}
                      </td>

                      {/* Current Status Badge */}
                      <td className="py-3 px-4">
                        {record ? (
                          <>
                            {record.status === 'HADIR' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                HADIR
                              </span>
                            )}
                            {record.status === 'TERLAMBAT' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                TERLAMBAT ({record.lateMinutes}m)
                              </span>
                            )}
                            {record.status === 'SAKIT' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                SAKIT
                              </span>
                            )}
                            {record.status === 'IZIN' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                IZIN
                              </span>
                            )}
                            {record.status === 'ALPA' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                ALPA
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            BELUM ABSEN
                          </span>
                        )}
                      </td>

                      {/* Direct Inline Status Modification Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDirectStatusChange(student, 'HADIR')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              record?.status === 'HADIR'
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                : 'bg-slate-800 text-emerald-400 hover:bg-emerald-950 border border-emerald-800/60'
                            }`}
                            title="Tandai Hadir"
                          >
                            HADIR
                          </button>

                          <button
                            onClick={() => handleDirectStatusChange(student, 'TERLAMBAT')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              record?.status === 'TERLAMBAT'
                                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                                : 'bg-slate-800 text-amber-400 hover:bg-amber-950 border border-amber-800/60'
                            }`}
                            title="Tandai Terlambat"
                          >
                            LATE
                          </button>

                          <button
                            onClick={() => handleDirectStatusChange(student, 'SAKIT')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              record?.status === 'SAKIT'
                                ? 'bg-sky-600 text-white ring-2 ring-sky-400'
                                : 'bg-slate-800 text-sky-400 hover:bg-sky-950 border border-sky-800/60'
                            }`}
                            title="Tandai Sakit (Tanpa Jam)"
                          >
                            SAKIT
                          </button>

                          <button
                            onClick={() => handleDirectStatusChange(student, 'IZIN')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              record?.status === 'IZIN'
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                : 'bg-slate-800 text-indigo-400 hover:bg-indigo-950 border border-indigo-800/60'
                            }`}
                            title="Tandai Izin (Tanpa Jam)"
                          >
                            IZIN
                          </button>

                          <button
                            onClick={() => handleDirectStatusChange(student, 'ALPA')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              record?.status === 'ALPA'
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                : 'bg-slate-800 text-rose-400 hover:bg-rose-950 border border-rose-800/60'
                            }`}
                            title="Tandai Alpa (Tanpa Jam)"
                          >
                            ALPA
                          </button>
                        </div>
                      </td>

                      {/* Notes / Alasan Column */}
                      <td className="py-3 px-4">
                        {editingNoteId === student.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempNote}
                              onChange={(e) => setTempNote(e.target.value)}
                              placeholder="Tulis alasan..."
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveNote(student)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="p-1 bg-slate-800 text-slate-400 rounded hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-400 group">
                            <span className="truncate max-w-[120px]">
                              {record?.notes || '-'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingNoteId(student.id);
                                setTempNote(record?.notes || '');
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit Catatan/Alasan"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
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
