import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storage';
import { SchoolSettings as SettingsType } from '../../types';
import {
  Settings,
  Save,
  Clock,
  School,
  Lock,
  Unlock,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Database,
  CloudCheck,
  RefreshCw,
  DownloadCloud,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatIndonesianDate } from '../../utils/dateUtils';
import {
  syncSettingsToSupabase,
  fetchSettingsFromSupabase,
  testSupabaseConnection
} from '../../services/supabase';

interface SchoolSettingsProps {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
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
    autoMarkAlpaTime: '10:00',
    autoLockEnabled: true
  });

  const [lockedDates, setLockedDates] = useState<string[]>([]);
  const [unlockedDates, setUnlockedDates] = useState<string[]>([]);
  const [customLockDateInput, setCustomLockDateInput] = useState('');

  // Database Cloud Status State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [isSaving, setIsSaving] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const refreshLockState = () => {
    setLockedDates(StorageService.getLockedDates());
    setUnlockedDates(StorageService.getUnlockedDates());
  };

  const checkDb = async () => {
    setDbStatus('checking');
    const res = await testSupabaseConnection();
    setDbStatus(res.success ? 'connected' : 'error');
  };

  const loadSettingsFromCloud = async () => {
    const cloudSettings = await fetchSettingsFromSupabase();
    if (cloudSettings) {
      setSettings(cloudSettings);
      StorageService.saveSettings(cloudSettings);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // 1. Initial local load
    setSettings(StorageService.getSettings());
    refreshLockState();
    checkDb();

    // 2. Fetch latest from database
    loadSettingsFromCloud();

    const handleDataUpdate = () => {
      refreshLockState();
    };

    window.addEventListener('sman1_data_updated', handleDataUpdate);
    return () => window.removeEventListener('sman1_data_updated', handleDataUpdate);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Save locally & trigger synchronous updates
      StorageService.saveSettings(settings);

      // Explicitly sync to Supabase database
      const syncRes = await syncSettingsToSupabase(settings);

      if (syncRes.success) {
        onNotify(
          'success',
          'Pengaturan Disimpan ke Database',
          'Konfigurasi sekolah, batas jam masuk/pulang, dan aturan penguncian berhasil tersimpan di Database Supabase & LocalStorage.'
        );
        setDbStatus('connected');
      } else {
        onNotify(
          'info',
          'Disimpan di Lokal',
          `Pengaturan tersimpan di penyimpanan lokal. Sinkronisasi database cloud: ${syncRes.error || 'Kendala koneksi'}`
        );
      }
    } catch (err: any) {
      console.error('Save settings error:', err);
      onNotify('error', 'Gagal Sinkron', 'Pengaturan tersimpan lokal, namun gagal menyelaraskan dengan database cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualPull = async () => {
    setIsPulling(true);
    onNotify('info', 'Menarik Pengaturan', 'Mengunduh pengaturan terbaru dari Database Supabase Cloud...');
    const ok = await loadSettingsFromCloud();
    setIsPulling(false);
    if (ok) {
      onNotify('success', 'Pengaturan Cloud Ditarik', 'Data konfigurasi berhasil diselaraskan dari Database Supabase.');
      setDbStatus('connected');
    } else {
      onNotify('error', 'Gagal Menarik Data', 'Tidak dapat mengambil konfigurasi dari database Supabase.');
    }
  };

  const handleUnlockDate = (date: string) => {
    StorageService.unlockDate(date);
    refreshLockState();
    onNotify('success', 'Kunci Presensi Dibuka', `Akses edit presensi tanggal ${date} telah dibuka dan disinkronkan ke Database.`);
  };

  const handleLockDate = (date: string) => {
    StorageService.lockDate(date);
    refreshLockState();
    onNotify('success', 'Presensi Dikunci', `Data presensi tanggal ${date} berhasil dikunci dan disinkronkan ke Database.`);
  };

  const handleAddCustomLockDate = () => {
    if (!customLockDateInput) return;
    StorageService.lockDate(customLockDateInput);
    setCustomLockDateInput('');
    refreshLockState();
    onNotify('success', 'Tanggal Dikunci', `Tanggal ${customLockDateInput} telah dikunci dan disinkronkan ke Database.`);
  };

  // Build combined list of explicitly locked or automatically locked dates with attendance records
  const allAttendances = StorageService.getAttendances();
  const datesWithAttendances = Array.from(new Set(allAttendances.map(a => a.date))).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header with Database Sync Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Pengaturan Sekolah & Database Supabase</h2>
              {dbStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Terkoneksi ke Database</span>
                </span>
              ) : dbStatus === 'checking' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Cek Database...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Database Offline/Local Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi jam operasional sekolah, toleransi keterlambatan, dan penguncian data presensi terhubung langsung ke Database Cloud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualPull}
            disabled={isPulling}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Tarik nilai konfigurasi terkini langsung dari tabel database"
          >
            <DownloadCloud className={`w-3.5 h-3.5 text-indigo-600 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>{isPulling ? 'Menarik...' : 'Tarik dari Database'}</span>
          </button>

          <button
            type="button"
            onClick={checkDb}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-all"
            title="Cek koneksi database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} />
          </button>
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600 font-bold"
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
                required
                value={settings.lateToleranceMinutes}
                onChange={(e) => setSettings({ ...settings, lateToleranceMinutes: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600 font-bold"
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
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:border-indigo-600 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Jam kepulangan siswa.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Penguncian Otomatis Akhir Hari */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-900">Penguncian Otomatis Akhir Hari</h3>
                <p className="text-[11px] text-slate-500">
                  Secara otomatis mengunci data absensi ketika hari berganti sehingga tidak bisa diubah kecuali oleh Admin.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoLockEnabled: !settings.autoLockEnabled })}
              className="flex items-center gap-1.5 focus:outline-none"
            >
              {settings.autoLockEnabled !== false ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Status: <strong>{settings.autoLockEnabled !== false ? 'AKTIF (Otomatis Kunci Saat Hari Berganti)' : 'NON-AKTIF'}</strong>.
            </span>
          </div>
        </div>

        {/* Section 3: Identitas Sekolah */}
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 font-semibold"
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

        {/* Section 4: Manajemen Buka / Kunci Presensi Per Tanggal */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Manajemen Buka Kunci Presensi (Tersinkron ke Database)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-3">
            Admin dapat melihat status kunci presensi per tanggal dan mengklik tombol <strong>Buka Kunci</strong> untuk mengizinkan modifikasi data yang telah terkunci:
          </p>

          {/* Add custom lock date input */}
          <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-medium text-slate-700">Kunci Tanggal Spesifik:</span>
            <input
              type="date"
              value={customLockDateInput}
              onChange={(e) => setCustomLockDateInput(e.target.value)}
              className="bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg font-mono"
            />
            <button
              type="button"
              onClick={handleAddCustomLockDate}
              disabled={!customLockDateInput}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
            >
              Kunci Tanggal Ini
            </button>
          </div>

          <div className="space-y-2">
            {datesWithAttendances.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center font-medium">
                Belum ada data presensi tersimpan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {datesWithAttendances.map((date) => {
                  const currentlyLocked = StorageService.isDateLocked(date);
                  const isPast = date < todayStr;

                  return (
                    <div
                      key={date}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        currentlyLocked
                          ? 'bg-amber-50/90 border-amber-200'
                          : 'bg-emerald-50/90 border-emerald-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900">{date}</span>
                          {currentlyLocked ? (
                            <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              TERKUNCI {isPast ? '(Akhir Hari)' : ''}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Unlock className="w-2.5 h-2.5" />
                              TERBUKA
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                          {formatIndonesianDate(date)}
                        </span>
                      </div>

                      {currentlyLocked ? (
                        <button
                          type="button"
                          onClick={() => handleUnlockDate(date)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Kunci</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLockDate(date)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Kunci Data</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Perubahan otomatis tersimpan ke Database Supabase Cloud & Local Storage.</span>
          </span>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Menyimpan ke Database...' : 'Simpan Pengaturan ke Database'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
