import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { downloadStudentTemplate, parseStudentExcelFile } from '../../services/exportExcel';
import { Student, StudentClass } from '../../types';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit,
  QrCode,
  X,
  AlertTriangle,
  School,
  CheckCircle2,
  XCircle,
  Loader2,
  CheckSquare,
  Square,
  Info,
  ArrowRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StudentManagementProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  defaultOpenBulk?: boolean;
  defaultOpenForm?: boolean;
  defaultOpenPrint?: boolean;
}

interface ValidationRowItem {
  rowNum: number;
  nis: string;
  nisn?: string;
  name: string;
  className: string;
  gender: string;
  isValid: boolean;
  errorReason?: string;
  studentObj?: Partial<Student>;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  onNotify,
  defaultOpenBulk = false,
  defaultOpenForm = false,
  defaultOpenPrint = false
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'nis-asc' | 'class-asc'>('name-asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Multi-Select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(defaultOpenForm);
  const [isBulkOpen, setIsBulkOpen] = useState(defaultOpenBulk);
  const [isCardModalOpen, setIsCardModalOpen] = useState(defaultOpenPrint);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    nis: '',
    nisn: '',
    name: '',
    classId: '',
    className: '',
    rfidUid: '',
    qrCode: '',
    gender: 'L',
    parentPhone: '',
    address: '',
    status: 'aktif'
  });

  // Bulk Upload Modal Step & Inspection State
  const [uploadStep, setUploadStep] = useState<'SELECT_FILE' | 'INSPECTION' | 'PROCESSING'>('SELECT_FILE');
  const [validationRows, setValidationRows] = useState<ValidationRowItem[]>([]);
  const [inspectionFilter, setInspectionFilter] = useState<'ALL' | 'VALID' | 'FAILED'>('ALL');
  const [uploadError, setUploadError] = useState('');
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);

  const refreshData = () => {
    setStudents(StorageService.getStudents());
    setClasses(StorageService.getClasses());
  };

  useEffect(() => {
    refreshData();

    const handleDataUpdate = () => {
      refreshData();
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, []);

  const handleOpenAdd = () => {
    const firstClass = classes[0];
    setFormData({
      nis: '',
      nisn: '',
      name: '',
      classId: firstClass ? firstClass.id : 'cls-1',
      className: firstClass ? firstClass.name : 'X IPA 1',
      rfidUid: '',
      qrCode: '',
      gender: 'L',
      parentPhone: '',
      address: '',
      status: 'aktif'
    });
    setActiveStudent(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setActiveStudent(s);
    setFormData({ ...s });
    setIsFormOpen(true);
  };

  const handleDeleteSingle = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}?`)) {
      StorageService.deleteStudent(id);
      setSelectedIds(prev => prev.filter(i => i !== id));
      refreshData();
      onNotify('success', 'Data Dihapus', `Siswa ${name} berhasil dihapus.`);
    }
  };

  // Bulk Delete Actions
  const handleToggleSelectStudent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredStudents.map(s => s.id);
    const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;

    const deletedCount = StorageService.bulkDeleteStudents(selectedIds);
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
    refreshData();
    onNotify('success', 'Bulk Delete Berhasil', `Berhasil menghapus ${deletedCount} data siswa terpilih.`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nis || !formData.name) {
      alert('NIS dan Nama wajib diisi!');
      return;
    }

    const targetClass = classes.find(c => c.id === formData.classId) || classes[0];

    const studentToSave: Student = {
      id: activeStudent ? activeStudent.id : `std-${Date.now()}`,
      nis: formData.nis.trim(),
      nisn: formData.nisn ? formData.nisn.trim() : '',
      name: formData.name.trim(),
      classId: targetClass ? targetClass.id : 'cls-1',
      className: targetClass ? targetClass.name : 'X IPA 1',
      rfidUid: formData.rfidUid ? formData.rfidUid.trim() : `000${formData.nis}`,
      qrCode: formData.qrCode ? formData.qrCode.trim() : `SMAN1L-${formData.nis}`,
      gender: (formData.gender as 'L' | 'P') || 'L',
      parentPhone: formData.parentPhone || '',
      address: formData.address || '',
      status: formData.status as 'aktif' | 'nonaktif',
      createdAt: activeStudent ? activeStudent.createdAt : new Date().toISOString().split('T')[0]
    };

    StorageService.saveStudent(studentToSave);
    refreshData();
    setIsFormOpen(false);
    onNotify('success', 'Data Disimpan', `Data siswa ${studentToSave.name} berhasil disimpan.`);
  };

  // Mass Upload File Parsing & Inspection Validation Table Generator
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setValidationRows([]);

    try {
      const parsed = await parseStudentExcelFile(file);
      if (parsed.length === 0) {
        setUploadError('File tidak berisi data siswa yang valid.');
        return;
      }

      const existingStudents = StorageService.getStudents();
      const registeredClasses = StorageService.getClasses();
      const rows: ValidationRowItem[] = [];
      const seenBatchNis = new Set<string>();

      parsed.forEach((row, idx) => {
        const rowNum = idx + 1;
        const cleanNis = row.nis ? String(row.nis).trim() : '';
        const cleanName = row.name ? String(row.name).trim() : '';
        const cleanClass = row.className ? String(row.className).trim() : '';
        const cleanGender = row.gender ? String(row.gender).trim().toUpperCase() : 'L';

        // Check if class exists in database registered classes
        const matchedClassObj = registeredClasses.find(
          c => c.name.trim().toLowerCase() === cleanClass.toLowerCase()
        );

        let isValid = true;
        let errorReason = '';

        if (!cleanNis) {
          isValid = false;
          errorReason = 'NIS wajib diisi / tidak boleh kosong.';
        } else if (!cleanName) {
          isValid = false;
          errorReason = 'Nama Siswa wajib diisi.';
        } else if (!cleanClass) {
          isValid = false;
          errorReason = 'Nama Kelas tidak boleh kosong.';
        } else if (!matchedClassObj) {
          isValid = false;
          errorReason = `Kelas "${cleanClass}" belum terdaftar di database. Silakan tambahkan data kelas di menu "Data Kelas" terlebih dahulu atau sesuaikan nama kelas pada template.`;
        } else if (existingStudents.some(s => s.nis === cleanNis)) {
          isValid = false;
          errorReason = `NIS '${cleanNis}' sudah ada di database.`;
        } else if (seenBatchNis.has(cleanNis)) {
          isValid = false;
          errorReason = `Duplikasi NIS '${cleanNis}' dalam file upload.`;
        }

        if (isValid) {
          seenBatchNis.add(cleanNis);
        }

        const studentObjToAttach: Partial<Student> = {
          ...row,
          classId: matchedClassObj ? matchedClassObj.id : '',
          className: matchedClassObj ? matchedClassObj.name : cleanClass,
          gender: cleanGender === 'P' || cleanGender === 'PEREMPUAN' ? 'P' : 'L'
        };

        rows.push({
          rowNum,
          nis: cleanNis || '-',
          nisn: row.nisn,
          name: cleanName || 'Tanpa Nama',
          className: cleanClass || 'Belum Ada',
          gender: cleanGender === 'P' || cleanGender === 'PEREMPUAN' ? 'P' : 'L',
          isValid,
          errorReason,
          studentObj: studentObjToAttach
        });
      });

      setValidationRows(rows);
      setUploadStep('INSPECTION');
      setInspectionFilter('ALL');
    } catch (err) {
      console.error(err);
      setUploadError('Gagal membaca file Excel/CSV. Pastikan format file sesuai template.');
    }
  };

  // Execute Bulk Import with Smooth Loading Transition
  const handleConfirmBulkInsertWithAnimation = async () => {
    const validRowObjects = validationRows.filter(r => r.isValid && r.studentObj).map(r => r.studentObj!);
    if (validRowObjects.length === 0) return;

    setUploadStep('PROCESSING');
    setUploadProgressPercent(15);
    setUploadProgressMsg('Mempersiapkan transaksi impor...');

    await new Promise(r => setTimeout(r, 600));
    setUploadProgressPercent(45);
    setUploadProgressMsg(`Validasi ulang & memproses ${validRowObjects.length} data siswa...`);

    await new Promise(r => setTimeout(r, 800));
    setUploadProgressPercent(80);
    setUploadProgressMsg('Menyimpan ke LocalStorage & menyinkronkan Supabase Database...');

    const result = StorageService.bulkInsertStudents(validRowObjects);

    await new Promise(r => setTimeout(r, 600));
    setUploadProgressPercent(100);

    refreshData();
    setIsBulkOpen(false);
    setUploadStep('SELECT_FILE');
    setValidationRows([]);

    if (result.errors.length > 0) {
      onNotify('error', 'Bulk Upload Selesai', `${result.inserted} siswa berhasil diimpor. ${result.errors.length} baris gagal.`);
    } else {
      onNotify('success', 'Bulk Upload Berhasil', `Berhasil mengimpor ${result.inserted} data siswa.`);
    }
  };

  const filteredStudents = students.filter(s => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.nis.includes(query) ||
      s.rfidUid.includes(query) ||
      s.qrCode.toLowerCase().includes(query);

    const matchesClass = selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;
    const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;

    return matchesSearch && matchesClass && matchesGender;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'nis-asc') return a.nis.localeCompare(b.nis);
    if (sortBy === 'class-asc') return a.className.localeCompare(b.className);
    return 0;
  });

  // Pagination Calculations
  const totalStudentItems = sortedStudents.length;
  const totalStudentPages = Math.ceil(totalStudentItems / itemsPerPage) || 1;
  const safeStudentPage = Math.min(Math.max(1, currentPage), totalStudentPages);
  const studentStartIndex = (safeStudentPage - 1) * itemsPerPage;
  const studentEndIndex = Math.min(studentStartIndex + itemsPerPage, totalStudentItems);
  const paginatedStudents = sortedStudents.slice(studentStartIndex, studentEndIndex);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassFilter, genderFilter, sortBy, itemsPerPage]);

  const isAllFilteredSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every(s => selectedIds.includes(s.id));

  // Inspection Table Filtering
  const validCount = validationRows.filter(r => r.isValid).length;
  const failedCount = validationRows.filter(r => !r.isValid).length;

  const filteredValidationRows = validationRows.filter(r => {
    if (inspectionFilter === 'VALID') return r.isValid;
    if (inspectionFilter === 'FAILED') return !r.isValid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Master Data Siswa SMAN 1 Lumbung</h2>
            <p className="text-xs text-slate-500">
              Total {students.length} Siswa Terdaftar • {selectedIds.length} Siswa Terpilih
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm animate-fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Siswa Terpilih ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setUploadStep('SELECT_FILE');
              setValidationRows([]);
              setIsBulkOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload Massal (Preview & Validasi)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filter, Search, Sorting Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query Input */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nama, NIS, UID RFID, QR Code..."
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

          {/* Filter Class */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:border-indigo-600 focus:bg-white"
            >
              <option value="ALL">Semua Kelas</option>
              {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Gender */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:border-indigo-600 focus:bg-white"
            >
              <option value="ALL">Semua Jenis Kelamin</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
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
              <option value="nis-asc">Urutkan: NIS Siswa</option>
              <option value="class-asc">Urutkan: Kelas</option>
            </select>
          </div>
        </div>

        {/* Count & Items Per Page Controls */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Menampilkan <strong className="text-slate-900">{totalStudentItems}</strong> siswa terfilter (Total {students.length} siswa)
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Tampilkan per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value={10}>10 Siswa</option>
              <option value={20}>20 Siswa</option>
              <option value={50}>50 Siswa</option>
              <option value={100}>100 Siswa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table with Checkbox for Bulk Delete */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            Daftar Siswa ({totalStudentItems})
          </span>
          {selectedIds.length > 0 && (
            <span className="text-indigo-700 font-bold bg-indigo-100 px-2.5 py-0.5 rounded-full text-[11px]">
              {selectedIds.length} Siswa Terpilih
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-3 text-center w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="p-1 text-slate-600 hover:text-indigo-600 focus:outline-none"
                    title="Pilih Semua Siswa Di Halaman Ini"
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">JK</th>
                <th className="py-3 px-4">UID RFID</th>
                <th className="py-3 px-4">QR String</th>
                <th className="py-3 px-4 text-center">Kartu ID</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const isSelected = selectedIds.includes(s.id);
                  const realIndex = studentStartIndex + idx + 1;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-indigo-50/30 transition-all ${
                        isSelected ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-400">{realIndex}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700 font-bold">
                        <div>{s.nis}</div>
                        {s.nisn && <div className="text-[10px] text-slate-400 font-normal">{s.nisn}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-semibold">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{s.gender}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold text-[11px]">
                        {s.rfidUid}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-600 text-[11px]">
                        {s.qrCode}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setActiveStudent(s);
                            setIsCardModalOpen(true);
                          }}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors"
                          title="Lihat Kartu Pelajar RFID & QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(s.id, s.name)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER BAR FOR STUDENTS */}
        {totalStudentPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Halaman <strong className="text-slate-900">{safeStudentPage}</strong> dari <strong className="text-slate-900">{totalStudentPages}</strong> (Menampilkan {studentStartIndex + 1}-{studentEndIndex} dari {totalStudentItems} siswa)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safeStudentPage <= 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold transition-all"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(7, totalStudentPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalStudentPages > 7) {
                  if (safeStudentPage > 4) {
                    pageNum = safeStudentPage - 3 + i;
                  }
                  if (pageNum > totalStudentPages) {
                    pageNum = totalStudentPages - (6 - i);
                  }
                }
                return pageNum;
              }).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                    safeStudentPage === page
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalStudentPages, prev + 1))}
                disabled={safeStudentPage >= totalStudentPages}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold transition-all"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: BULK DELETE CONFIRMATION */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">Konfirmasi Hapus Massal Data Siswa</h3>
                <p className="text-xs text-rose-700">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Apakah Anda yakin ingin menghapus permanen <strong>{selectedIds.length} siswa terpilih</strong> dari database SMAN 1 Lumbung?
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Ya, Hapus {selectedIds.length} Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD/EDIT STUDENT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    NIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 23241001"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0071234567"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap siswa"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      const selClass = classes.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        classId: e.target.value,
                        className: selClass ? selClass.name : ''
                      });
                    }}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:border-indigo-600"
                  >
                    {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:border-indigo-600"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    UID RFID Tag
                  </label>
                  <input
                    type="text"
                    value={formData.rfidUid || ''}
                    onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    String QR Code
                  </label>
                  <input
                    type="text"
                    value={formData.qrCode || ''}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  No HP Orang Tua
                </label>
                <input
                  type="text"
                  value={formData.parentPhone || ''}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK UPLOAD CSV/EXCEL WITH TABEL VALIDASI INSPECTION & LOADING ANIMATION */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Upload Massal & Tabel Validasi Data Siswa</h3>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: SELECT FILE */}
            {uploadStep === 'SELECT_FILE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Unduh Template Excel / CSV</h4>
                    <p className="text-[11px] text-slate-500">Gunakan format kolom resmi agar data terstruktur dengan benar.</p>
                  </div>
                  <button
                    onClick={downloadStudentTemplate}
                    className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shrink-0 transition-all"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Download Template</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Pilih File Excel (.xlsx) / CSV
                  </label>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                  />
                </div>

                {uploadError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CHECK & INSPECTION TABEL VALIDASI */}
            {uploadStep === 'INSPECTION' && (
              <div className="space-y-4 animate-fade-in">
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Baris File</span>
                    <span className="text-xl font-mono font-bold text-slate-900">{validationRows.length}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Berhasil / Valid</span>
                    <span className="text-xl font-mono font-bold text-emerald-800">{validCount}</span>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Gagal / Error</span>
                    <span className="text-xl font-mono font-bold text-rose-800">{failedCount}</span>
                  </div>
                </div>

                {/* Warning Banner for Unregistered Classes */}
                {failedCount > 0 && validationRows.some(r => r.errorReason?.includes('belum terdaftar')) && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Peringatan Validasi Kelas:</strong>
                      <p className="mt-0.5 text-amber-800">
                        Siswa dengan nama kelas yang <strong>belum terdaftar di database</strong> ditolak dan tidak boleh diimpor. Silakan tambahkan data kelas terlebih dahulu di menu <strong>Data Kelas</strong>, atau ganti nama kelas pada file template Excel/CSV Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter Toolbar for Validation Table */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Tabel Preview & Hasil Check Validasi Data:
                  </span>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setInspectionFilter('ALL')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        inspectionFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({validationRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionFilter('VALID')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        inspectionFilter === 'VALID'
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      Berhasil ({validCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionFilter('FAILED')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        inspectionFilter === 'FAILED'
                          ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Gagal ({failedCount})
                    </button>
                  </div>
                </div>

                {/* Validation Inspection Table */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 bg-slate-50">
                        <th className="py-2.5 px-3">Baris</th>
                        <th className="py-2.5 px-3">NIS</th>
                        <th className="py-2.5 px-3">Nama Siswa</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Status Validasi</th>
                        <th className="py-2.5 px-3">Keterangan Error / Hasil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredValidationRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Tidak ada data yang sesuai dengan filter preview.
                          </td>
                        </tr>
                      ) : (
                        filteredValidationRows.map((r) => (
                          <tr
                            key={r.rowNum}
                            className={`hover:bg-slate-50 transition-colors ${
                              !r.isValid ? 'bg-rose-50/30' : 'bg-emerald-50/20'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{r.rowNum}</td>
                            <td className="py-2.5 px-3 font-mono text-indigo-700 font-bold">{r.nis}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                            <td className="py-2.5 px-3 text-slate-700">{r.className}</td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Berhasil</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Gagal</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="text-emerald-700 text-[11px] font-medium">
                                  Data valid, siap diimpor.
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>{r.errorReason}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 font-medium">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Hanya <strong>{validCount} data ber-status Berhasil</strong> yang akan dimasukkan ke database saat Anda mengklik button di bawah. Data gagal akan dilewati secara otomatis.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: ANIMATED LOADING PROGRESS TRANSITION */}
            {uploadStep === 'PROCESSING' && (
              <div className="py-12 text-center space-y-5 animate-fade-in">
                <div className="relative w-20 h-20 mx-auto">
                  <Loader2 className="w-20 h-20 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-indigo-800">
                    {uploadProgressPercent}%
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Pemrosesan & Impor Data Siswa...</h4>
                  <p className="text-xs text-indigo-600 font-mono font-bold mt-1 animate-pulse">
                    {uploadProgressMsg}
                  </p>
                </div>

                {/* Animated Bar */}
                <div className="max-w-md mx-auto bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
                  <div
                    className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${uploadProgressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            {uploadStep !== 'PROCESSING' && (
              <div className="pt-3 flex justify-between items-center border-t border-slate-200">
                {uploadStep === 'INSPECTION' && (
                  <button
                    type="button"
                    onClick={() => setUploadStep('SELECT_FILE')}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    ← Pilih File Lain
                  </button>
                )}

                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>

                  {uploadStep === 'INSPECTION' && (
                    <button
                      type="button"
                      disabled={validCount === 0}
                      onClick={handleConfirmBulkInsertWithAnimation}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Proses Impor ({validCount} Data Berhasil)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: STUDENT ID CARD PREVIEW */}
      {isCardModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up text-center">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* School ID Card Front */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 border-2 border-indigo-400 rounded-2xl p-6 text-white shadow-lg space-y-4">
              <div className="flex items-center justify-center gap-2 border-b border-indigo-400/40 pb-3">
                <School className="w-5 h-5 text-indigo-200" />
                <div>
                  <h4 className="text-xs font-black tracking-wide uppercase">SMAN 1 LUMBUNG</h4>
                  <p className="text-[9px] text-indigo-200 font-medium">Kartu Presensi Siswa Resmi</p>
                </div>
              </div>

              <div className="w-20 h-20 mx-auto rounded-xl bg-white text-indigo-900 flex items-center justify-center font-black text-2xl shadow-inner">
                {activeStudent.name.charAt(0)}
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">
                  {activeStudent.name}
                </h3>
                <p className="text-xs text-indigo-200 font-mono mt-0.5">NIS: {activeStudent.nis}</p>
                <p className="text-xs font-semibold text-white">Kelas: {activeStudent.className}</p>
              </div>

              <div className="bg-white p-3 rounded-xl max-w-[140px] mx-auto shadow-md">
                <div className="aspect-square bg-slate-900 rounded flex flex-col items-center justify-center p-2 text-center">
                  <QrCode className="w-12 h-12 text-white" />
                  <span className="text-[8px] font-mono text-indigo-300 mt-1 truncate max-w-full">
                    {activeStudent.qrCode}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-400/40 text-[10px] font-mono text-indigo-200 font-bold">
                RFID Tag UID: {activeStudent.rfidUid}
              </div>
            </div>

            <button
              onClick={() => setIsCardModalOpen(false)}
              className="mt-5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
            >
              Tutup Pratinjau Kartu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
