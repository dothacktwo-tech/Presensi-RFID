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
  CreditCard,
  X,
  CheckCircle2,
  AlertTriangle,
  School
} from 'lucide-react';

interface StudentManagementProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onNotify }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // Form State
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

  // Bulk Upload State
  const [previewRows, setPreviewRows] = useState<Partial<Student>[]>([]);
  const [uploadError, setUploadError] = useState('');

  const refreshData = () => {
    setStudents(StorageService.getStudents());
    setClasses(StorageService.getClasses());
  };

  useEffect(() => {
    refreshData();
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}?`)) {
      StorageService.deleteStudent(id);
      refreshData();
      onNotify('success', 'Data Dihapus', `Siswa ${name} berhasil dihapus.`);
    }
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

  // Handle File Upload for Bulk Insert
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    try {
      const parsed = await parseStudentExcelFile(file);
      if (parsed.length === 0) {
        setUploadError('File tidak berisi data siswa yang valid.');
        return;
      }
      setPreviewRows(parsed);
    } catch (err) {
      console.error(err);
      setUploadError('Gagal membaca file Excel/CSV. Pastikan format file sesuai.');
    }
  };

  const handleConfirmBulkInsert = () => {
    if (previewRows.length === 0) return;

    const result = StorageService.bulkInsertStudents(previewRows);
    refreshData();
    setIsBulkOpen(false);
    setPreviewRows([]);

    if (result.errors.length > 0) {
      onNotify('error', 'Bulk Upload Selesai dengan Catatan', `${result.inserted} siswa berhasil diimpor. ${result.errors.length} baris dilewati/gagal.`);
    } else {
      onNotify('success', 'Bulk Upload Berhasil', `Berhasil mengimpor ${result.inserted} data siswa.`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis.includes(searchQuery) ||
      s.rfidUid.includes(searchQuery) ||
      s.qrCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClassFilter === 'ALL' || s.classId === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Master Data Siswa SMAN 1 Lumbung</h2>
            <p className="text-xs text-slate-400">Total {students.length} Siswa Terdaftar</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload Massal (Bulk)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama, NIS, UID RFID, atau QR Code..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">No</th>
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
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">
                      <div>{s.nis}</div>
                      {s.nisn && <div className="text-[10px] text-slate-500">{s.nisn}</div>}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                        {s.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{s.gender}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 text-[11px]">
                      {s.rfidUid}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400 text-[11px]">
                      {s.qrCode}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setIsCardModalOpen(true);
                        }}
                        className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg border border-indigo-500/30 transition-colors"
                        title="Lihat Kartu Pelajar RFID & QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 hover:bg-rose-950 text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD/EDIT STUDENT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {activeStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    NIS <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 23241001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0071234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap siswa"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    UID RFID Tag
                  </label>
                  <input
                    type="text"
                    value={formData.rfidUid || ''}
                    onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    String QR Code
                  </label>
                  <input
                    type="text"
                    value={formData.qrCode || ''}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="Otomatis jika kosong"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  No HP Orang Tua
                </label>
                <input
                  type="text"
                  value={formData.parentPhone || ''}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK UPLOAD CSV/EXCEL */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upload Massal Data Siswa (Bulk)</h3>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-white">Unduh Template Excel / CSV</h4>
                  <p className="text-[11px] text-slate-400">Gunakan format kolom resmi agar data terstruktur dengan benar.</p>
                </div>
                <button
                  onClick={downloadStudentTemplate}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pilih File Excel (.xlsx) / CSV
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-xl p-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                />
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Preview Rows */}
              {previewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Pratinjau Impor ({previewRows.length} Siswa)</span>
                    <span className="text-emerald-400">Siap Diimpor</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950">
                    {previewRows.map((r, i) => (
                      <div key={i} className="p-2.5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{r.name}</span>
                          <span className="text-slate-400 font-mono ml-2">({r.nis})</span>
                        </div>
                        <span className="text-slate-400 font-mono">{r.className || 'X IPA 1'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={previewRows.length === 0}
                  onClick={handleConfirmBulkInsert}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Proses Upload ({previewRows.length} Siswa)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STUDENT ID CARD PREVIEW */}
      {isCardModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up text-center">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated School ID Card Front */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border-2 border-indigo-500/40 rounded-2xl p-6 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-center gap-2 border-b border-indigo-500/30 pb-3">
                <School className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black tracking-wide uppercase">SMAN 1 LUMBUNG</h4>
                  <p className="text-[9px] text-indigo-300 font-medium">Kartu Presensi Siswa Resmi</p>
                </div>
              </div>

              <div className="w-20 h-20 mx-auto rounded-xl bg-slate-800 border-2 border-white/20 flex items-center justify-center font-black text-2xl text-indigo-300 shadow-inner">
                {activeStudent.name.charAt(0)}
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">
                  {activeStudent.name}
                </h3>
                <p className="text-xs text-indigo-300 font-mono mt-0.5">NIS: {activeStudent.nis}</p>
                <p className="text-xs font-semibold text-slate-300">Kelas: {activeStudent.className}</p>
              </div>

              {/* QR Code Simulation box */}
              <div className="bg-white p-3 rounded-xl max-w-[140px] mx-auto shadow-md">
                <div className="aspect-square bg-slate-900 rounded flex flex-col items-center justify-center p-2 text-center">
                  <QrCode className="w-12 h-12 text-white" />
                  <span className="text-[8px] font-mono text-indigo-300 mt-1 truncate max-w-full">
                    {activeStudent.qrCode}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-500/30 text-[10px] font-mono text-emerald-400">
                RFID Tag UID: {activeStudent.rfidUid}
              </div>
            </div>

            <button
              onClick={() => setIsCardModalOpen(false)}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Tutup Pratinjau Kartu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
