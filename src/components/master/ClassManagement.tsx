import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { StudentClass, User } from '../../types';
import { Building2, Plus, Edit, Trash2, Users, UserCheck, X } from 'lucide-react';

interface ClassManagementProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ onNotify }) => {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<StudentClass | null>(null);

  const [formData, setFormData] = useState<Partial<StudentClass>>({
    name: '',
    grade: 'X',
    major: 'IPA',
    waliKelasId: '',
    academicYear: '2025/2026'
  });

  const refreshData = () => {
    setClasses(StorageService.getClasses());
    setUsers(StorageService.getUsers().filter(u => u.role === 'wali_kelas' || u.role === 'admin'));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAdd = () => {
    setActiveClass(null);
    setFormData({
      name: '',
      grade: 'X',
      major: 'IPA',
      waliKelasId: users[0]?.id || '',
      academicYear: '2025/2026'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: StudentClass) => {
    setActiveClass(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kelas ${name}?`)) {
      StorageService.deleteClass(id);
      refreshData();
      onNotify('success', 'Kelas Dihapus', `Data kelas ${name} berhasil dihapus.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Nama kelas wajib diisi!');
      return;
    }

    const selWali = users.find(u => u.id === formData.waliKelasId);

    const classToSave: StudentClass = {
      id: activeClass ? activeClass.id : `cls-${Date.now()}`,
      name: formData.name.trim(),
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
    setIsModalOpen(false);
    onNotify('success', 'Data Kelas Disimpan', `Kelas ${classToSave.name} berhasil disimpan.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Data Kelas & Wali Kelas</h2>
            <p className="text-xs text-slate-500">Penugasan Wali Kelas SMAN 1 Lumbung</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-extrabold text-slate-900 tracking-tight">{c.name}</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {c.academicYear}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Wali Kelas: <strong className="text-slate-900">{c.waliKelasName || 'Belum Ada'}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Jumlah Siswa: <strong className="text-slate-900">{c.studentCount || 0} Siswa</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => handleOpenEdit(c)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeClass ? 'Edit Kelas' : 'Tambah Kelas'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kelas</label>
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
                    <option value="IPA">MIPA / IPA</option>
                    <option value="IPS">IPS / SOSIAL</option>
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
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
