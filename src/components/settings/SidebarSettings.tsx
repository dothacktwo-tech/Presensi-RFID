import React from 'react';
import { PanelLeft, PanelLeftClose, Check, Sparkles, Sliders } from 'lucide-react';

interface SidebarSettingsProps {
  sidebarMode: 'full' | 'minimalist';
  setSidebarMode: (mode: 'full' | 'minimalist') => void;
  onNotify: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const SidebarSettings: React.FC<SidebarSettingsProps> = ({
  sidebarMode,
  setSidebarMode,
  onNotify
}) => {
  const handleSelectMode = (mode: 'full' | 'minimalist') => {
    setSidebarMode(mode);
    localStorage.setItem('sman1_sidebar_mode', mode);
    onNotify(
      'success',
      'Pengaturan Tampilan Diperbarui',
      `Tampilan Sidebar berhasil diubah ke mode ${mode === 'minimalist' ? 'Minimalis (Ringkas)' : 'Full (Lengkap)'}.`
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pengaturan Tampilan Sidebar</h2>
          <p className="text-xs text-slate-500">
            Pilih mode navigasi sidebar (Minimalis / Full) untuk mengoptimalkan area tampilan layar Anda
          </p>
        </div>
      </div>

      {/* Mode Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Mode Full */}
        <div
          onClick={() => handleSelectMode('full')}
          className={`cursor-pointer bg-white border-2 rounded-2xl p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
            sidebarMode === 'full'
              ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <PanelLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mode Full (Lengkap)</h3>
                  <p className="text-[11px] text-slate-500">Tampilan standar dengan teks & sub-menu</p>
                </div>
              </div>

              {sidebarMode === 'full' && (
                <span className="p-1.5 bg-indigo-600 text-white rounded-full">
                  <Check className="w-4 h-4" />
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Menampilkan label menu lengkap, sub-menu terstruktur, serta kartu identitas user. Sangat cocok untuk kemudahan navigasi harian.
            </p>

            {/* Visual Mockup Preview */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex gap-2 items-center">
              <div className="w-24 bg-white border border-slate-200 rounded-lg p-2 text-[9px] space-y-1">
                <div className="bg-indigo-600 text-white p-1 rounded font-bold">Dashboard</div>
                <div className="bg-slate-200 text-slate-700 p-1 rounded">Absensi</div>
                <div className="bg-slate-100 text-slate-500 pl-3 p-0.5 rounded">└ Manual</div>
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-[9px] text-slate-400 text-center">
                Area Konten Utama
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
              sidebarMode === 'full'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {sidebarMode === 'full' ? 'Mode Full Aktif' : 'Pilih Mode Full'}
          </button>
        </div>

        {/* Option 2: Mode Minimalis */}
        <div
          onClick={() => handleSelectMode('minimalist')}
          className={`cursor-pointer bg-white border-2 rounded-2xl p-6 shadow-sm transition-all duration-200 flex flex-col justify-between ${
            sidebarMode === 'minimalist'
              ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <PanelLeftClose className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mode Minimalis (Ringkas)</h3>
                  <p className="text-[11px] text-slate-500">Tampilan icon-bar compact</p>
                </div>
              </div>

              {sidebarMode === 'minimalist' && (
                <span className="p-1.5 bg-indigo-600 text-white rounded-full">
                  <Check className="w-4 h-4" />
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Menyembunyikan label teks dan menyiutkan sidebar menjadi baris ikon ringkas untuk memberikan area layar seluas mungkin bagi tabel data dan grafik.
            </p>

            {/* Visual Mockup Preview */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex gap-2 items-center">
              <div className="w-10 bg-white border border-slate-200 rounded-lg p-2 text-[9px] flex flex-col items-center gap-1.5">
                <div className="w-5 h-5 bg-indigo-600 rounded"></div>
                <div className="w-5 h-5 bg-slate-200 rounded"></div>
                <div className="w-5 h-5 bg-slate-200 rounded"></div>
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 text-[9px] text-slate-400 text-center">
                Area Konten Maksimal (Lebih Luas)
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
              sidebarMode === 'minimalist'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {sidebarMode === 'minimalist' ? 'Mode Minimalis Aktif' : 'Pilih Mode Minimalis'}
          </button>
        </div>
      </div>
    </div>
  );
};
