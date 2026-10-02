import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { SchoolSettings as SettingsType } from '../../types';
import { Settings, Save, Clock, School, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { formatIndonesianDate } from '../../utils/dateUtils';

interface SchoolSettingsProps {
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const SchoolSettings: React.FC<SchoolSettingsProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<SettingsType>({
    schoolName: 'SMAN 1 Lumbung',
    npsn: '20211543',
    address: '',
    headmasterName: '',
    headmasterNip: '',
    entryTimeLimit: '07:00',
    exitTimeLimit: '15:30',
    lateToleranceMinutes: 5,
    soundEnabled: true,
    autoMarkAlpaTime: '10:00'
  });

  const [lockedDates, setLockedDates] = useState<string[]>([]);

  const refreshLockedDates = () => {
    setLockedDates(StorageService.getLockedDates());
  };

  useEffect(() => {
    setSettings(StorageService.getSettings());
    refreshLockedDates();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    onNotify('success', 'Pengaturan Disimpan', 'Konfigurasi sekolah dan jam masuk berhasil diperbarui.');
  };

  const handleUnlockDate = (date: string) => {
    if (confirm(`Apakah Anda yakin ingin membuka kunci presensi tanggal ${date}?`)) {
      StorageService.unlockDate(date);
      refreshLockedDates();
      onNotify('success', 'Kunci Presensi Dibuka', `Kunci presensi untuk tanggal ${date} berhasil dibuka.`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pengaturan Sekolah & Pembukaan Kunci Presensi</h2>
          <p className="text-xs text-slate-500">Konfigurasi jam sekolah, toleransi keterlambatan, dan manajemen kunci data presensi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Section 1: Presensi Parameters */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Parameter Jam Masuk & Keterlambatan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Batas Jam Masuk (Siswa Tepat Waktu)
              </label>
              <input
                type="time"
                required
                value={settings.entryTimeLimit}
                onChange={(e) => setSettings({ ...settings, entryTimeLimit: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Siswa scan setelah jam ini dianggap Terlambat.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Toleransi Keterlambatan (Menit)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={settings.lateToleranceMinutes}
                onChange={(e) => setSettings({ ...settings, lateToleranceMinutes: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">Toleransi misal 5 menit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Batas Jam Pulang
              </label>
              <input
                type="time"
                value={settings.exitTimeLimit}
                onChange={(e) => setSettings({ ...settings, exitTimeLimit: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Identitas Sekolah */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
            <School className="w-4 h-4 text-indigo-600" />
            <span>Identitas SMAN 1 Lumbung</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NPSN</label>
                <input
                  type="text"
                  value={settings.npsn}
                  onChange={(e) => setSettings({ ...settings, npsn: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={settings.headmasterName}
                  onChange={(e) => setSettings({ ...settings, headmasterName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={settings.headmasterNip}
                  onChange={(e) => setSettings({ ...settings, headmasterNip: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Manajemen Kunci Presensi Tanggal */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Manajemen & Pembukaan Kunci Presensi (Hak Akses Admin)</span>
          </div>

          {lockedDates.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center font-medium">
              Tidak ada tanggal presensi yang sedang dikunci saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 mb-2">
                Daftar tanggal presensi yang dikunci oleh pengguna. Klik <strong>Buka Kunci</strong> untuk mengizinkan perubahan status kembali:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lockedDates.map((date) => (
                  <div key={date} className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-amber-950 block">{date}</span>
                      <span className="text-[10px] text-amber-700">{formatIndonesianDate(date)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlockDate(date)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
