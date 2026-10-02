import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { SchoolSettings as SettingsType } from '../../types';
import { Settings, Save, Clock, School, ShieldCheck } from 'lucide-react';

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

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    onNotify('success', 'Pengaturan Disimpan', 'Konfigurasi sekolah dan jam masuk berhasil diperbarui.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Pengaturan Sekolah & Presensi</h2>
          <p className="text-xs text-slate-400">Konfigurasi batas jam masuk, toleransi keterlambatan, dan identitas sekolah</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Section 1: Presensi Parameters */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4" />
            <span>Parameter Jam Masuk & Keterlambatan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batas Jam Masuk (Siswa Tepat Waktu)
              </label>
              <input
                type="time"
                required
                value={settings.entryTimeLimit}
                onChange={(e) => setSettings({ ...settings, entryTimeLimit: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Siswa scan setelah jam ini dianggap Terlambat.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Toleransi Keterlambatan (Menit)
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={settings.lateToleranceMinutes}
                onChange={(e) => setSettings({ ...settings, lateToleranceMinutes: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Toleransi misal 5 menit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batas Jam Pulang
              </label>
              <input
                type="time"
                value={settings.exitTimeLimit}
                onChange={(e) => setSettings({ ...settings, exitTimeLimit: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Identitas Sekolah */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
            <School className="w-4 h-4" />
            <span>Identitas SMAN 1 Lumbung</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NPSN</label>
                <input
                  type="text"
                  value={settings.npsn}
                  onChange={(e) => setSettings({ ...settings, npsn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Lengkap</label>
              <textarea
                rows={2}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={settings.headmasterName}
                  onChange={(e) => setSettings({ ...settings, headmasterName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={settings.headmasterNip}
                  onChange={(e) => setSettings({ ...settings, headmasterNip: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
