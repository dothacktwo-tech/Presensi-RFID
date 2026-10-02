import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { StorageService } from '../../services/storage';
import { soundFx } from '../../services/audio';
import { ScanResult, AttendanceRecord } from '../../types';
import { ScanFeedback } from './ScanFeedback';
import {
  QrCode,
  CreditCard,
  Camera,
  CameraOff,
  Keyboard,
  Volume2,
  VolumeX,
  History,
  Sparkles,
  Search,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

interface KioskScannerProps {
  isKioskFullscreen?: boolean;
  onCloseKiosk?: () => void;
}

export const KioskScanner: React.FC<KioskScannerProps> = ({
  isKioskFullscreen = false,
  onCloseKiosk
}) => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);

  // RFID Key Buffer
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(Date.now());
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const refreshRecentScans = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const all = StorageService.getAttendances();
    const todayRecords = all.filter(a => a.date === today).slice(0, 10);
    setRecentScans(todayRecords);
  }, []);

  // Play Sound Effect based on Scan Result
  const triggerAudioFeedback = useCallback((result: ScanResult) => {
    if (soundMuted) return;
    switch (result.type) {
      case 'HADIR':
        soundFx.playSuccess();
        break;
      case 'TERLAMBAT':
        soundFx.playWarning();
        break;
      case 'DUPLICATE':
        soundFx.playInfo();
        break;
      case 'NOT_FOUND':
      case 'ERROR':
        soundFx.playError();
        break;
    }
  }, [soundMuted]);

  // Execute Core Scan Logic
  const handleProcessCode = useCallback((code: string, method: 'RFID' | 'QR' | 'MANUAL') => {
    const clean = code.trim();
    if (!clean) return;

    const result = StorageService.processScan(clean, method, 'Kiosk Scanner');
    setScanResult(result);
    triggerAudioFeedback(result);
    refreshRecentScans();
  }, [triggerAudioFeedback, refreshRecentScans]);

  // Global Keydown Listener for USB RFID Reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses inside text inputs/textareas unless submitting
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      // If typing speed is > 100ms per key, reset buffer (human typing vs barcode/RFID reader)
      if (now - lastKeyTimeRef.current > 150) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (keyBufferRef.current.length >= 3) {
          handleProcessCode(keyBufferRef.current, 'RFID');
          keyBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    refreshRecentScans();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleProcessCode, refreshRecentScans]);

  // Toggle Camera QR Scanner
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
          qrScannerRef.current.clear();
        } catch (e) {
          console.warn('Camera stop error:', e);
        }
        qrScannerRef.current = null;
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode('qr-reader-kiosk');
          qrScannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => {
              handleProcessCode(decodedText, 'QR');
            },
            () => {
              // Ignore frame errors
            }
          );
        } catch (err) {
          console.error('Failed to start camera:', err);
          setIsCameraActive(false);
          alert('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
        }
      }, 200);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      handleProcessCode(manualCode, 'MANUAL');
      setManualCode('');
    }
  };

  return (
    <div className={`flex flex-col gap-6 ${isKioskFullscreen ? 'p-6 bg-slate-950 text-white min-h-screen' : ''}`}>
      {/* Kiosk Mode Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
            <QrCode className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-white tracking-tight">
              Kiosk Scan Presensi Siswa SMAN 1 Lumbung
            </h2>
            <p className="text-xs text-slate-400">
              Mendukung input otomatis USB RFID Reader & Pemindaian Kamera QR Code
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              soundMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
            }`}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            <span>{soundMuted ? 'Suara Muted' : 'Suara Aktif'}</span>
          </button>

          {/* Close Kiosk Fullscreen button */}
          {isKioskFullscreen && onCloseKiosk && (
            <button
              onClick={onCloseKiosk}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Tutup Kiosk
            </button>
          )}
        </div>
      </div>

      {/* Main Scan Display Banner */}
      <ScanFeedback result={scanResult} />

      {/* Grid of Input Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: RFID USB Reader Listener Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">USB RFID Reader</h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Standby Otomatis
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hubungkan pembaca RFID USB ke perangkat. Cukup tempelkan kartu RFID siswa, sistem akan membaca dan memproses presensi secara instant.
            </p>
          </div>

          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="text-[11px] font-mono text-indigo-300">
              Input String RFID diakhiri &apos;ENTER&apos;
            </span>
          </div>
        </div>

        {/* Card 2: QR Code Camera Scanner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Kamera QR Code</h3>
                  <p className="text-[10px] text-slate-400">Scan via WebCam</p>
                </div>
              </div>

              <button
                onClick={toggleCamera}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isCameraActive
                    ? 'bg-rose-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> Stop Kamera
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Buka Kamera
                  </>
                )}
              </button>
            </div>

            {/* Camera Viewport Container */}
            <div className="mt-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[160px] flex items-center justify-center relative">
              <div id="qr-reader-kiosk" className="w-full"></div>
              {!isCameraActive && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  <QrCode className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Kamera non-aktif. Klik tombol di atas untuk menyalakan.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Manual Code / NIS Input Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Input NIS / RFID Manual</h3>
                <p className="text-[10px] text-slate-400">Gunakan jika kartu fisik tertinggal</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Ketik NIS / UID RFID / Kode QR
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Contoh: 23241001 atau 0008472910"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Proses Presensi Manual
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Stream of Recent Scans Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Riwayat Scan Terbaru Hari Ini</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {recentScans.length} Record Terakhir
          </span>
        </div>

        {recentScans.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Belum ada aktivitas scan hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Jam</th>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {recentScans.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-indigo-300">{r.time}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{r.nis}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{r.studentName}</td>
                    <td className="py-2.5 px-3 text-slate-300">{r.className}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {r.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {r.status === 'HADIR' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          HADIR
                        </span>
                      )}
                      {r.status === 'TERLAMBAT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          TERLAMBAT ({r.lateMinutes}m)
                        </span>
                      )}
                      {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
