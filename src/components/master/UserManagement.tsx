import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { User, UserRole, StudentClass } from '../../types';
import { UserCog, Plus, Trash2, Edit, X } from 'lucide-react';

interface UserManagementProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    name: '',
    email: '',
    role: 'guru_piket',
    assignedClassId: '',
    nip: ''
  });

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setClasses(StorageService.getClasses());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenAdd = () => {
    setActiveUser(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      role: 'guru_piket',
      assignedClassId: '',
      nip: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setActiveUser(u);
    setFormData({ ...u });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin menghapus pengguna ${name}?`)) {
      StorageService.deleteUser(id);
      refreshData();
      onNotify('success', 'User Dihapus', `User ${name} telah dihapus.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name) {
      alert('Username dan Nama wajib diisi!');
      return;
    }

    const selClass = classes.find(c => c.id === formData.assignedClassId);

    const userToSave: User = {
      id: activeUser ? activeUser.id : `usr-${Date.now()}`,
      username: formData.username.trim().toLowerCase(),
      name: formData.name.trim(),
      email: formData.email || `${formData.username}@sman1lumbung.sch.id`,
      role: formData.role as UserRole,
      assignedClassId: formData.assignedClassId,
      assignedClassName: selClass ? selClass.name : undefined,
      nip: formData.nip || ''
    };

    StorageService.saveUser(userToSave);
    refreshData();
    setIsModalOpen(false);
    onNotify('success', 'User Disimpan', `Pengguna ${userToSave.name} (${userToSave.role}) berhasil disimpan.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna & Role (RBAC)</h2>
            <p className="text-xs text-slate-500">Pengaturan Hak Akses Admin, Guru Piket, dan Wali Kelas</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-4">Nama User</th>
              <th className="py-3 px-4">Username / Email</th>
              <th className="py-3 px-4">Role Akses</th>
              <th className="py-3 px-4">Penugasan Kelas</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">
                  <div>{u.name}</div>
                  {u.nip && <div className="text-[10px] font-mono text-slate-400 font-normal">NIP: {u.nip}</div>}
                </td>
                <td className="py-3 px-4 font-mono text-indigo-700 font-bold">
                  <div>@{u.username}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                </td>
                <td className="py-3 px-4">
                  {u.role === 'admin' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      ADMIN
                    </span>
                  )}
                  {u.role === 'guru_piket' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      GURU PIKET
                    </span>
                  )}
                  {u.role === 'wali_kelas' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      WALI KELAS
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {u.assignedClassName ? (
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold">
                      {u.assignedClassName}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Semua / Full</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeUser ? 'Edit User' : 'Tambah User RBAC'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi, S.Pd."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="fauzi"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role RBAC</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="admin">Admin Full</option>
                    <option value="guru_piket">Guru Piket</option>
                    <option value="wali_kelas">Wali Kelas</option>
                  </select>
                </div>
              </div>

              {formData.role === 'wali_kelas' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Wali Kelas Untuk</label>
                  <select
                    value={formData.assignedClassId || ''}
                    onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NIP (Opsional)</label>
                <input
                  type="text"
                  value={formData.nip || ''}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="19xxxxxxxxxxxxxx"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
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
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
