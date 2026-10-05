import React, { useState, useEffect } from 'react';
import { QrManagementModal } from './QrManagementModal';
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
  ChevronRight,
  Printer
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

  // Print settings states
  const [printType, setPrintType] = useState<'list' | 'cards'>('list');
  const [docTitle, setDocTitle] = useState('DAFTAR DATA SISWA');
  const [sigRole, setSigRole] = useState('Kepala Sekolah');
  const [sigName, setSigName] = useState('H. Dadang Kusnandar, M.Pd.');
  const [sigId, setSigId] = useState('NIP. 197408122002121003');
  const [showNisn, setShowNisn] = useState(true);
  const [showRfid, setShowRfid] = useState(true);
  const [showParaf, setShowParaf] = useState(true);
  const [cardTheme, setCardTheme] = useState<'blue' | 'emerald' | 'indigo'>('blue');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Multi-Select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(defaultOpenForm);
  const [isBulkOpen, setIsBulkOpen] = useState(defaultOpenBulk);
  const [isCardModalOpen, setIsCardModalOpen] = useState(defaultOpenPrint);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
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

  const handleOpenQr = (s: Student) => {
    setActiveStudent(s);
    setIsQrModalOpen(true);
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
      s.className.toLowerCase().includes(query) ||
      s.rfidUid.includes(query) ||
      s.qrCode.toLowerCase().includes(query);

    const matchesClass = selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;
    const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;

    return matchesSearch && matchesClass && matchesGender;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    // 1. Sort by Class
    const classCompare = a.className.localeCompare(b.className, undefined, { numeric: true });
    if (classCompare !== 0) return classCompare;
    // 2. Sort by Name
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    // 3. Sort by NIS
    return a.nis.localeCompare(b.nis);
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

  if (defaultOpenPrint) {
    const activeClassObj = classes.find(c => c.id === selectedClassFilter);
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="space-y-6">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            /* Hide non-printable UI elements */
            header, aside, .no-print, nav, button, select, input, .top-bar, .sidebar, .toast-container {
              display: none !important;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .print-card-grid {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 16px !important;
            }
            .break-inside-avoid {
              break-inside: avoid !important;
            }
          }
        `}} />

        {/* PRINT DASHBOARD HEADER (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Printer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cetak Data & Kartu Siswa</h2>
              <p className="text-xs text-slate-500">
                Pilih format cetak dan filter data siswa di bawah untuk dicetak langsung ke kertas / PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>
          </div>
        </div>

        {/* PRINT CONFIGURATOR PANEL (no-print) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          {/* 1. FILTER & TARGET FORMAT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 col-span-1">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              1. Format & Filter Cetak
            </h3>

            {/* Print Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Format Dokumen</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintType('list')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    printType === 'list'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Daftar Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintType('cards')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    printType === 'cards'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Kartu ID Pelajar</span>
                </button>
              </div>
            </div>

            {/* Class Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Filter Kelas</label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-semibold focus:border-indigo-600 focus:bg-white"
              >
                <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
                {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Filter Jenis Kelamin</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 font-semibold focus:border-indigo-600 focus:bg-white"
              >
                <option value="ALL">Semua Jenis Kelamin</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            {/* Search query */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Cari Siswa Spesifik</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama, NIS, atau Kode..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
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
            </div>
          </div>

          {/* 2. LAYOUT & TEXT CUSTOMIZER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 col-span-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              2. Kustomisasi Layout & Konten Dokumen
            </h3>

            {printType === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Judul Dokumen (Header)</label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Jabatan Tanda Tangan</label>
                    <input
                      type="text"
                      value={sigRole}
                      onChange={(e) => setSigRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Nama Penandatangan</label>
                    <input
                      type="text"
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">NIP / Identitas Pegawai</label>
                    <input
                      type="text"
                      value={sigId}
                      onChange={(e) => setSigId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block">
                      Opsi Tampilan Tabel
                    </span>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={showNisn}
                        onChange={(e) => setShowNisn(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span>Tampilkan Kolom NISN</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={showRfid}
                        onChange={(e) => setShowRfid(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span>Tampilkan Kolom UID RFID</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        checked={showParaf}
                        onChange={(e) => setShowParaf(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                      />
                      <span>Sertakan Kolom Paraf / Tanda Tangan Siswa</span>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-medium">
                    Info: Untuk hasil terbaik saat mencetak, aktifkan opsi <strong>&ldquo;Background graphics&rdquo;</strong> di jendela dialog printer browser Anda.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block">
                    Tema Warna Kartu
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCardTheme('blue')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        cardTheme === 'blue'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-600/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-5 h-5 bg-indigo-600 rounded-full mx-auto mb-1.5" />
                      Biru Klasik
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardTheme('emerald')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        cardTheme === 'emerald'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-600/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-5 h-5 bg-emerald-600 rounded-full mx-auto mb-1.5" />
                      Hijau Emerald
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardTheme('indigo')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        cardTheme === 'indigo'
                          ? 'bg-slate-100 border-slate-800 text-slate-900 ring-2 ring-slate-850/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-5 h-5 bg-slate-800 rounded-full mx-auto mb-1.5" />
                      Abu Modern
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                  <div className="text-xs text-slate-700 font-medium space-y-1.5">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block mb-1">
                      Spesifikasi Kartu
                    </span>
                    <p>• Cetakan berisi QR Code yang valid untuk scan presensi</p>
                    <p>• Mengandung string QR: <code className="bg-white px-1 py-0.5 border border-slate-200 rounded text-[11px] font-bold">SMAN1L-[NIS]</code></p>
                    <p>• Cetakan dirancang pas untuk disisipkan ke casing card holder ukuran standar</p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 font-medium">
                    Tip: Gunakan kertas tebal (Kertas foto, Buffalo, atau Cardstock) untuk mendapatkan kartu ID fisik yang kaku dan kuat.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MOCK PREVIEW PAPER FIELD */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 lg:p-10 flex justify-center items-start shadow-inner overflow-x-auto">
          {/* THE SIMULATED A4 PAPER WRAPPER */}
          <div
            id="printable-area"
            className="w-full max-w-4xl bg-white p-8 lg:p-12 shadow-md border border-slate-250 min-h-[1120px] text-slate-900"
          >
            {printType === 'list' ? (
              /* A. TABULAR STUDENT LIST FORMAT */
              <div className="font-serif">
                {/* Official Kop Surat */}
                <div className="text-center space-y-1 pb-3 border-b-4 border-double border-slate-950 flex flex-col items-center justify-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider leading-tight text-slate-900">
                    Pemerintah Provinsi Jawa Barat
                  </h3>
                  <h2 className="text-sm font-extrabold uppercase tracking-widest leading-tight text-slate-900">
                    Dinas Pendidikan
                  </h2>
                  <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                    SMA NEGERI 1 LUMBUNG
                  </h1>
                  <p className="text-[10px] font-sans font-medium text-slate-600">
                    Jl. Raya Lumbung No. 12, Kec. Lumbung, Kab. Ciamis 46258 • Telp: (0265) 771234 • Email: sman1lumbung@sch.id
                  </p>
                </div>

                {/* Document Title */}
                <div className="my-6 text-center">
                  <h2 className="text-base font-bold uppercase underline tracking-wide text-slate-950">
                    {docTitle || 'DAFTAR DATA SISWA'}
                  </h2>
                  <p className="text-xs uppercase font-extrabold text-slate-900 mt-1 font-sans">
                    Kelas: {activeClassObj ? activeClassObj.name : 'SEMUA KELAS'} • TAHUN AJARAN 2026/2027
                  </p>
                </div>

                {/* Table Sheet */}
                <table className="w-full border-collapse border border-slate-900 text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 border border-slate-900 font-extrabold uppercase text-center text-slate-900">
                      <th className="border border-slate-900 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-900 py-2 px-2 w-20">NIS</th>
                      {showNisn && <th className="border border-slate-900 py-2 px-2 w-24">NISN</th>}
                      <th className="border border-slate-900 py-2 px-3">Nama Lengkap Siswa</th>
                      <th className="border border-slate-900 py-2 px-1 w-10">L/P</th>
                      <th className="border border-slate-900 py-2 px-16">Kelas</th>
                      {showRfid && <th className="border border-slate-900 py-2 px-3 w-28">UID RFID</th>}
                      {showParaf && <th className="border border-slate-900 py-2 px-3 w-28 text-center">Paraf</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {sortedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={showNisn && showRfid && showParaf ? 8 : 5} className="py-8 text-center text-slate-400 italic">
                          Tidak ada data siswa yang cocok dengan filter / pencarian.
                        </td>
                      </tr>
                    ) : (
                      sortedStudents.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-900 py-1.5 px-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-900 py-1.5 px-2 text-center font-mono font-bold text-slate-900">{s.nis}</td>
                          {showNisn && <td className="border border-slate-900 py-1.5 px-2 text-center font-mono text-slate-600">{s.nisn || '-'}</td>}
                          <td className="border border-slate-900 py-1.5 px-3 text-slate-950 font-bold uppercase">{s.name}</td>
                          <td className="border border-slate-900 py-1.5 px-1 text-center">{s.gender}</td>
                          <td className="border border-slate-900 py-1.5 px-2 text-center font-semibold text-slate-700">{s.className}</td>
                          {showRfid && <td className="border border-slate-900 py-1.5 px-3 text-center font-mono text-slate-600 text-[10px]">{s.rfidUid || '-'}</td>}
                          {showParaf && (
                            <td className="border border-slate-900 py-1.5 px-2 font-mono text-slate-400">
                              <span className="text-[8px] font-sans font-bold float-left text-slate-400 select-none mr-2">
                                {idx + 1}.
                              </span>
                              <span className={idx % 2 === 0 ? "ml-1 block" : "mr-4 text-right block"}>
                                .........................
                              </span>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Footer Signature Section */}
                <div className="mt-12 flex justify-end font-sans">
                  <div className="w-64 space-y-16 text-center text-xs text-slate-900">
                    <div>
                      <p>Ciamis, {currentDateStr}</p>
                      <p className="font-bold uppercase mt-0.5">{sigRole || 'Kepala Sekolah'}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase underline tracking-tight">{sigName || 'NAMA PEJABAT'}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">{sigId || 'NIP.----------------'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* B. CARD GRID ID CARDS FORMAT */
              <div className="font-sans">
                {/* Header Metadata (Preview-Only) */}
                <div className="border-b border-slate-200 pb-2 mb-4 text-center text-[11px] text-slate-400 font-bold tracking-widest uppercase no-print">
                  PREVIEW HALAMAN KARTU IDENTITAS PRESENSI ({sortedStudents.length} KARTU)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-card-grid">
                  {sortedStudents.map((s) => (
                    <div
                      key={s.id}
                      className={`border-2 rounded-xl p-4 flex flex-col justify-between h-[230px] relative overflow-hidden break-inside-avoid shadow-inner text-white ${
                        cardTheme === 'emerald'
                          ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 border-emerald-400'
                          : cardTheme === 'indigo'
                          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-slate-500'
                          : 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 border-indigo-400'
                      }`}
                    >
                      {/* Card Header Letterhead */}
                      <div className="flex items-center gap-1.5 border-b border-white/20 pb-2 shrink-0">
                        <School className="w-5 h-5 text-indigo-300 shrink-0" />
                        <div>
                          <h4 className="text-[10px] font-black tracking-wider uppercase">SMAN 1 LUMBUNG</h4>
                          <p className="text-[7px] text-indigo-200 font-bold uppercase leading-tight tracking-widest">
                            Kartu Presensi Siswa Resmi
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="flex items-center gap-3 my-2 flex-1 min-w-0">
                        {/* Left avatar badge */}
                        <div className="w-14 h-14 rounded-full bg-white text-slate-800 border-2 border-indigo-200 flex items-center justify-center font-black text-xl shadow-inner shrink-0 select-none">
                          {s.name.charAt(0)}
                        </div>

                        {/* Middle information details */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h3 className="text-xs font-black tracking-tight leading-tight truncate uppercase">
                            {s.name}
                          </h3>
                          <div className="text-[9px] font-mono text-indigo-200">
                            NIS: <strong className="text-white">{s.nis}</strong>
                          </div>
                          {s.nisn && (
                            <div className="text-[9px] font-mono text-indigo-200">
                              NISN: <strong className="text-white">{s.nisn}</strong>
                            </div>
                          )}
                          <div className="text-[9px] font-bold">
                            Kelas: <span className="bg-white/10 px-1.5 py-0.2 rounded border border-white/20">{s.className}</span>
                          </div>
                        </div>

                        {/* Right interactive barcode visual placeholder */}
                        <div className="bg-white p-1 rounded-lg shadow-sm shrink-0">
                          <div className="w-14 h-14 bg-slate-900 rounded p-1 flex flex-col items-center justify-center">
                            <QrCode className="w-10 h-10 text-white" />
                            <span className="text-[5px] font-mono font-bold text-indigo-300 mt-0.5 truncate max-w-[50px]">
                              {s.qrCode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-1.5 border-t border-white/10 flex justify-between items-center shrink-0">
                        <span className="text-[7px] text-indigo-200 font-mono">
                          RFID: <strong className="text-white">{s.rfidUid}</strong>
                        </span>
                        <span className="text-[6px] text-indigo-300 font-bold tracking-widest uppercase">
                          SISTEM ABSENSI SMART CARD
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                            onClick={() => handleOpenQr(s)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                            title="Kelola QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
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

      {/* MODAL: QR MANAGEMENT */}
      {isQrModalOpen && activeStudent && (
        <QrManagementModal
          student={activeStudent}
          onClose={() => setIsQrModalOpen(false)}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
