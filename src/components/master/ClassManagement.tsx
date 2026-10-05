import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { StudentClass, User, Student } from '../../types';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  UserCheck,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserCheck2
} from 'lucide-react';
import { getAcademicYearFromDate, getSemesterFromDate } from '../../utils/dateUtils';

interface ClassManagementProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ onNotify }) => {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Search, Filter, Sorting, & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [majorFilter, setMajorFilter] = useState<'ALL' | 'IPA' | 'IPS' | 'UMUM'>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'grade-asc' | 'grade-desc' | 'students-desc'>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Modals & Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<StudentClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<StudentClass | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const currentAcademicYearAuto = getAcademicYearFromDate();

  const [formData, setFormData] = useState<Partial<StudentClass>>({
    name: '',
    grade: 'X',
    major: 'IPA',
    waliKelasId: '',
    academicYear: currentAcademicYearAuto
  });

  const refreshData = () => {
    setClasses(StorageService.getClasses());
    setUsers(StorageService.getUsers().filter(u => u.role === 'wali_kelas' || u.role === 'admin'));
    setStudents(StorageService.getStudents());
  };

  useEffect(() => {
    refreshData();

    const handleDataUpdate = () => {
      refreshData();
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, []);

  // Filter & Sort Calculations
  const filteredClasses = classes.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      (c.waliKelasName && c.waliKelasName.toLowerCase().includes(query)) ||
      (c.academicYear && c.academicYear.toLowerCase().includes(query));

    const matchesGrade = gradeFilter === 'ALL' || c.grade === gradeFilter;
    const matchesMajor = majorFilter === 'ALL' || c.major === majorFilter;

    return matchesSearch && matchesGrade && matchesMajor;
  });

  const sortedClasses = [...filteredClasses].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'grade-asc') return a.grade.localeCompare(b.grade);
    if (sortBy === 'grade-desc') return b.grade.localeCompare(a.grade);
    if (sortBy === 'students-desc') return (b.studentCount || 0) - (a.studentCount || 0);
    return 0;
  });

  // Pagination Calculations
  const totalItems = sortedClasses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedClasses = sortedClasses.slice(startIndex, endIndex);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gradeFilter, majorFilter, sortBy, itemsPerPage]);

  const handleOpenAdd = () => {
    setActiveClass(null);
    setFormError('');
    setFormData({
      name: '',
      grade: 'X',
      major: 'IPA',
      waliKelasId: users[0]?.id || '',
      academicYear: getAcademicYearFromDate()
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: StudentClass) => {
    setActiveClass(c);
    setFormError('');
    setFormData({ ...c });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (c: StudentClass) => {
    setClassToDelete(c);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;

    setIsDeleting(true);
    try {
      StorageService.deleteClass(classToDelete.id);
      refreshData();
      setIsDeleteModalOpen(false);
      onNotify('success', 'Kelas Dihapus', `Data kelas ${classToDelete.name} berhasil dihapus dari database.`);
      setClassToDelete(null);
    } catch (err) {
      console.error('Failed to delete class:', err);
      onNotify('error', 'Gagal Menghapus', 'Terjadi kesalahan saat menghapus kelas.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formData.name?.trim();
    if (!cleanName) {
      setFormError('Nama kelas wajib diisi!');
      return;
    }

    // Check duplicate name
    const existing = StorageService.getClasses();
    const isDuplicate = existing.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== activeClass?.id);
    if (isDuplicate) {
      setFormError(`Nama kelas "${cleanName}" sudah terdaftar.`);
      return;
    }

    setIsSaving(true);
    try {
      const selWali = users.find(u => u.id === formData.waliKelasId);

      const classToSave: StudentClass = {
        id: activeClass ? activeClass.id : `cls-${Date.now()}`,
        name: cleanName,
        grade: formData.grade || 'X',
        major: formData.major || 'IPA',
        waliKelasId: formData.waliKelasId,
        waliKelasName: selWali ? selWali.name : 'Belum Ditugaskan',
        academicYear: formData.academicYear || '2025/2026'
      };

      StorageService.saveClass(classToSave);

      if (selWali) {
        StorageService.saveUser({
          ...selWali,
          assignedClassId: classToSave.id,
          assignedClassName: classToSave.name
        });
      }

      refreshData();
      setIsFormOpen(false);
      onNotify('success', 'Data Kelas Disimpan', `Kelas ${classToSave.name} berhasil disimpan.`);
    } catch (err) {
      console.error('Failed to save class:', err);
      setFormError('Gagal menyimpan data kelas. Silakan coba lagi.');
      onNotify('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data kelas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Data Kelas & Wali Kelas</h2>
            <p className="text-xs text-slate-500">
              Penugasan Wali Kelas dan Pengelolaan Rombongan Belajar SMAN 1 Lumbung ({classes.length} Kelas)
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* SEARCH, FILTER & SORTING CONTROLS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kelas, wali kelas, atau tahun ajaran..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Grade */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:border-indigo-600 focus:bg-white"
            >
              <option value="ALL">Semua Tingkat (X, XI, XII)</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          {/* Filter Major */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:border-indigo-600 focus:bg-white"
            >
              <option value="ALL">Semua Jurusan</option>
              <option value="IPA">Jurusan IPA</option>
              <option value="IPS">Jurusan IPS</option>
              <option value="UMUM">UMUM</option>
            </select>
          </div>

          {/* Sorting Control */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:border-indigo-600 focus:bg-white"
            >
              <option value="name-asc">Urutkan: Nama (A - Z)</option>
              <option value="name-desc">Urutkan: Nama (Z - A)</option>
              <option value="grade-asc">Urutkan: Tingkat (X → XII)</option>
              <option value="grade-desc">Urutkan: Tingkat (XII → X)</option>
              <option value="students-desc">Urutkan: Siswa Terbanyak</option>
            </select>
          </div>
        </div>

        {/* Status Filter Count Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Menampilkan <strong className="text-slate-900">{totalItems}</strong> kelas terfilter (Total {classes.length} kelas)
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Tampilkan per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value={6}>6 Kelas</option>
              <option value={12}>12 Kelas</option>
              <option value={24}>24 Kelas</option>
              <option value={999}>Semua</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedClasses.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            Tidak ada data kelas yang cocok dengan kata kunci atau filter pencarian.
          </div>
        ) : (
          paginatedClasses.map((c) => {
            const classStudents = students.filter(s => s.classId === c.id && s.status === 'aktif');
            const countL = classStudents.filter(s => s.gender === 'L').length;
            const countP = classStudents.filter(s => s.gender === 'P').length;
            const totalCount = c.studentCount !== undefined ? c.studentCount : classStudents.length;

            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-extrabold text-slate-900 tracking-tight">{c.name}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {c.academicYear}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Wali Kelas: <strong className="text-slate-900">{c.waliKelasName || 'Belum Ditugaskan'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Total Siswa: <strong className="text-slate-900">{totalCount} Siswa</strong></span>
                    </div>

                    {/* Keterangan Data: Rincian Jumlah Laki-laki & Perempuan */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 rounded-xl px-2.5 py-1.5 text-blue-900">
                        <span className="text-sm">👦</span>
                        <div>
                          <span className="text-[10px] text-blue-700 block font-semibold leading-tight">Laki-laki (L)</span>
                          <strong className="text-xs font-mono font-bold text-blue-950">{countL} Siswa</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-pink-50/70 border border-pink-200/80 rounded-xl px-2.5 py-1.5 text-pink-900">
                        <span className="text-sm">👧</span>
                        <div>
                          <span className="text-[10px] text-pink-700 block font-semibold leading-tight">Perempuan (P)</span>
                          <strong className="text-xs font-mono font-bold text-pink-950">{countP} Siswa</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleOpenDelete(c)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION CONTROLS FOOTER */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Halaman <strong className="text-slate-900">{safeCurrentPage}</strong> dari <strong className="text-slate-900">{totalPages}</strong> (Total {totalItems} Kelas)
          </span>

          <div className="flex items-center gap-1.5">
            <button
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

      {/* MODAL: ADD / EDIT CLASS */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeClass ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kelas *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: X IPA 1"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tingkat Grade</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Jurusan</label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="IPA">IPA</option>
                    <option value="IPS">IPS</option>
                    <option value="UMUM">UMUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Penugasan Wali Kelas</label>
                <select
                  value={formData.waliKelasId || ''}
                  onChange={(e) => setFormData({ ...formData, waliKelasId: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {[...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">Tahun Ajaran</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, academicYear: getAcademicYearFromDate() })}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    title="Set Otomatis Berdasarkan Kalender Akademik"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto Sesuai Kalender ({getAcademicYearFromDate()})</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.academicYear || getAcademicYearFromDate()}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder={getAcademicYearFromDate()}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis terisi sesuai kalender akademik berjalan. Anda juga dapat mengubah nilai tahun ajaran secara manual jika diperlukan.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteModalOpen && classToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Kelas</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus kelas <strong className="text-slate-900">{classToDelete.name}</strong>? Data siswa di kelas ini akan terlepas.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Kelas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
