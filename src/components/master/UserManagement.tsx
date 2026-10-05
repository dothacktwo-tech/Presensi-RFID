import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { User, UserRole, StudentClass, RolePermissionsMap, MenuKey } from '../../types';
import { UserCog, Plus, Trash2, Edit, X, Shield, Save, AlertTriangle, Loader2, KeyRound } from 'lucide-react';
import { hashPassword } from '../../utils/cryptoUtils';

interface UserManagementProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

interface MenuDefinition {
  key: MenuKey;
  label: string;
  group: 'UTAMA' | 'DATA MASTER' | 'KEHADIRAN' | 'LAPORAN' | 'PENGATURAN';
}

const MENU_DEFINITIONS: MenuDefinition[] = [
  { key: 'dashboard', label: 'Dashboard Utama', group: 'UTAMA' },
  { key: 'classes', label: 'Data Kelas', group: 'DATA MASTER' },
  { key: 'students', label: 'Data Siswa - Daftar Siswa', group: 'DATA MASTER' },
  { key: 'students-print', label: 'Data Siswa - Cetak Data Siswa', group: 'DATA MASTER' },
  { key: 'attendance-check', label: 'Absensi - Absensi Hari Ini', group: 'KEHADIRAN' },
  { key: 'manual-input', label: 'Absensi - Absensi Manual', group: 'KEHADIRAN' },
  { key: 'attendance-history', label: 'Absensi - Riwayat Absensi', group: 'KEHADIRAN' },
  { key: 'scanner', label: 'Absensi - Input Scan RFID / QR Code', group: 'KEHADIRAN' },
  { key: 'reports', label: 'Laporan - Laporan Absensi', group: 'LAPORAN' },
  { key: 'reports-rekap', label: 'Laporan - Rekapitulasi Absensi', group: 'LAPORAN' },
  { key: 'reports-pdf', label: 'Laporan - Cetak PDF Resmi', group: 'LAPORAN' },
  { key: 'reports-excel', label: 'Laporan - Export Excel / CSV', group: 'LAPORAN' },
  { key: 'users', label: 'Pengaturan - Manajemen User & RBAC', group: 'PENGATURAN' },
  { key: 'sidebar-settings', label: 'Pengaturan - Pengaturan Sidebar', group: 'PENGATURAN' },
  { key: 'school-settings', label: 'Pengaturan - Jam & Profil Sekolah', group: 'PENGATURAN' },
  { key: 'supabase-settings', label: 'Pengaturan - Database Supabase & SQL', group: 'PENGATURAN' },
];

export const UserManagement: React.FC<UserManagementProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'RBAC_MATRIX'>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<StudentClass[]>([]);

  // Modals & State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    name: '',
    email: '',
    role: 'guru_piket',
    assignedClassId: '',
    nip: ''
  });

  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() =>
    StorageService.getRolePermissions()
  );

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setClasses(StorageService.getClasses());
    setRolePermissions(StorageService.getRolePermissions());
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
    setActiveUser(null);
    setFormError('');
    setPasswordInput('');
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
    setFormError('');
    setPasswordInput('');
    setFormData({ ...u });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (u: User) => {
    setUserToDelete(u);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    if (userToDelete.username === 'admin') {
      onNotify('error', 'Akses Ditolak', 'Akun admin utama tidak dapat dihapus.');
      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      StorageService.deleteUser(userToDelete.id);
      refreshData();
      setIsDeleteModalOpen(false);
      onNotify('success', 'User Dihapus', `User ${userToDelete.name} berhasil dihapus dari database.`);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      onNotify('error', 'Gagal Menghapus', 'Terjadi kesalahan saat menghapus user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUsername = formData.username?.trim().toLowerCase();
    const cleanName = formData.name?.trim();

    if (!cleanUsername || !cleanName) {
      setFormError('Username dan Nama wajib diisi!');
      return;
    }

    // Check duplicate username
    const existing = StorageService.getUsers();
    const isDuplicate = existing.some(u => u.username.toLowerCase() === cleanUsername && u.id !== activeUser?.id);
    if (isDuplicate) {
      setFormError(`Username "@${cleanUsername}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    setIsSaving(true);
    try {
      const selClass = classes.find(c => c.id === formData.assignedClassId);

      let passwordHashToSave = activeUser?.passwordHash;
      if (passwordInput.trim()) {
        passwordHashToSave = await hashPassword(passwordInput.trim());
      } else if (!activeUser) {
        // Default password for new users if not specified
        const defaultPlain = formData.role === 'admin' ? 'admin123' : formData.role === 'guru_piket' ? 'piket123' : 'wali123';
        passwordHashToSave = await hashPassword(defaultPlain);
      }

      const userToSave: User = {
        id: activeUser ? activeUser.id : `usr-${Date.now()}`,
        username: cleanUsername,
        passwordHash: passwordHashToSave,
        name: cleanName,
        email: formData.email || `${cleanUsername}@sman1lumbung.sch.id`,
        role: formData.role as UserRole,
        assignedClassId: formData.assignedClassId,
        assignedClassName: selClass ? selClass.name : undefined,
        nip: formData.nip || ''
      };

      StorageService.saveUser(userToSave);
      refreshData();
      setIsModalOpen(false);
      onNotify('success', 'User Disimpan', `Pengguna ${userToSave.name} (${userToSave.role}) berhasil disimpan.`);
    } catch (err) {
      console.error('Failed to save user:', err);
      setFormError('Gagal menyimpan data pengguna. Silakan coba lagi.');
      onNotify('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data user.');
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC Permission Checkbox Toggle
  const handleTogglePermission = (role: UserRole, menuKey: MenuKey) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menuKey]: !prev[role][menuKey]
      }
    }));
  };

  const handleSaveRolePermissions = () => {
    StorageService.saveRolePermissions(rolePermissions);
    onNotify('success', 'Hak Akses RBAC Disimpan', 'Konfigurasi hak akses menu per role berhasil diperbarui.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Tab Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna & Pengaturan Hak Akses (RBAC)</h2>
              <p className="text-xs text-slate-500">
                Atur akun pengguna dan atur menu yang dapat diakses oleh Admin, Guru Piket, dan Wali Kelas via Checkbox Matrix
              </p>
            </div>
          </div>

          {activeTab === 'USERS' && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna Baru</span>
            </button>
          )}

          {activeTab === 'RBAC_MATRIX' && (
            <button
              onClick={handleSaveRolePermissions}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Hak Akses RBAC</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-bold pt-2">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'USERS'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span>Daftar Akun User ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('RBAC_MATRIX')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'RBAC_MATRIX'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Matriks Hak Akses Menu (RBAC Checkbox)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'USERS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
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
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => handleOpenDelete(u)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                          title="Hapus User"
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
      )}

      {/* TAB 2: RBAC MENU PERMISSIONS MATRIX (CHECKBOXES) */}
      {activeTab === 'RBAC_MATRIX' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Matriks Hak Akses Menu Aplikasi Per Role</h3>
              <p className="text-xs text-slate-500">Centang (check) menu yang diizinkan untuk muncul pada sidebar tiap role</p>
            </div>

            <button
              onClick={handleSaveRolePermissions}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Matriks RBAC</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 w-1/2">Nama Menu / Sub-Menu</th>
                  <th className="py-3 px-4 text-center">Administrator</th>
                  <th className="py-3 px-4 text-center">Guru Piket</th>
                  <th className="py-3 px-4 text-center">Wali Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {MENU_DEFINITIONS.map((menu) => (
                  <tr key={menu.key} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className="text-[10px] text-indigo-600 font-mono font-bold mr-2">[{menu.group}]</span>
                      <span>{menu.label}</span>
                    </td>

                    {/* Admin Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions.admin?.[menu.key] !== false}
                        onChange={() => handleTogglePermission('admin', menu.key)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Guru Piket Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions.guru_piket?.[menu.key] !== false}
                        onChange={() => handleTogglePermission('guru_piket', menu.key)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Wali Kelas Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions.wali_kelas?.[menu.key] !== false}
                        onChange={() => handleTogglePermission('wali_kelas', menu.key)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {activeUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username (Login) *</label>
                <input
                  type="text"
                  required
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: fauzi_piket"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap & Gelar *</label>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Role Akses</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru_piket">Guru Piket</option>
                    <option value="wali_kelas">Wali Kelas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">NIP (Opsional)</label>
                  <input
                    type="text"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="1982..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              {formData.role === 'wali_kelas' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Penugasan Wali Kelas</label>
                  <select
                    value={formData.assignedClassId || ''}
                    onChange={(e) => setFormData({ ...formData, assignedClassId: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {[...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="fauzi@sman1lumbung.sch.id"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Kata Sandi / Password {activeUser ? '(Kosongkan jika tidak ingin diubah)' : '(Opsional, default sesuai role)'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">SHA-256</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={activeUser ? "•••••••• (tidak berubah)" : "Default: admin123 / piket123 / wali123"}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus User</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus akun pengguna <strong className="text-slate-900">{userToDelete.name}</strong> (@{userToDelete.username})?
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
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
