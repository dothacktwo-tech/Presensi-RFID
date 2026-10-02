import React from 'react';
import { ScanResult } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, User, Sparkles } from 'lucide-react';

interface ScanFeedbackProps {
  result: ScanResult | null;
}

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-4 animate-pulse">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-300">Siap Menerima Scan Absensi</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          Tempelkan kartu RFID pada USB Reader atau arahkan QR Code siswa ke kamera scanner.
        </p>
      </div>
    );
  }

  const { type, student, record, message, lateMinutes } = result;

  const bgStyles = {
    HADIR: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-2xl shadow-emerald-900/30',
    TERLAMBAT: 'bg-amber-950/90 border-amber-500/50 text-amber-100 shadow-2xl shadow-amber-900/30',
    DUPLICATE: 'bg-sky-950/90 border-sky-500/50 text-sky-100 shadow-2xl shadow-sky-900/30',
    NOT_FOUND: 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-2xl shadow-rose-900/30',
    ERROR: 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-2xl shadow-rose-900/30'
  };

  const badgeStyles = {
    HADIR: 'bg-emerald-500 text-white',
    TERLAMBAT: 'bg-amber-500 text-slate-950 font-bold',
    DUPLICATE: 'bg-sky-500 text-white',
    NOT_FOUND: 'bg-rose-600 text-white',
    ERROR: 'bg-rose-600 text-white'
  };

  const iconMap = {
    HADIR: <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0 animate-bounce" />,
    TERLAMBAT: <Clock className="w-10 h-10 text-amber-400 shrink-0" />,
    DUPLICATE: <AlertTriangle className="w-10 h-10 text-sky-400 shrink-0" />,
    NOT_FOUND: <XCircle className="w-10 h-10 text-rose-400 shrink-0" />,
    ERROR: <XCircle className="w-10 h-10 text-rose-400 shrink-0" />
  };

  return (
    <div className={`border-2 rounded-2xl p-6 lg:p-8 transition-all duration-300 animate-slide-up ${bgStyles[type]}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Large Avatar or Icon */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-slate-900/80 border-2 border-white/20 flex items-center justify-center font-extrabold text-3xl text-white shadow-inner">
            {student ? student.name.charAt(0) : '?'}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700">
            {iconMap[type]}
          </div>
        </div>

        {/* Info Content */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeStyles[type]}`}>
              {type === 'HADIR' && 'HADIR TEPAT WAKTU'}
              {type === 'TERLAMBAT' && `TERLAMBAT (${lateMinutes} MENIT)`}
              {type === 'DUPLICATE' && 'SUDAH ABSEN HARI INI'}
              {type === 'NOT_FOUND' && 'KARTU TIDAK TERDAFTAR'}
              {type === 'ERROR' && 'KARTU TIDAK AKTIF'}
            </span>

            {record && (
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-white/10 text-white/90">
                Jam: {record.time} ({record.method})
              </span>
            )}
          </div>

          {student ? (
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {student.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-300 font-medium mt-1">
                <span>NIS: <strong className="text-white font-mono">{student.nis}</strong></span>
                <span>•</span>
                <span>Kelas: <strong className="text-indigo-200">{student.className}</strong></span>
                <span>•</span>
                <span>JK: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-rose-200">
                Data Siswa Tidak Ditemukan
              </h2>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-200/90 mt-3 pt-3 border-t border-white/10 leading-relaxed font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
