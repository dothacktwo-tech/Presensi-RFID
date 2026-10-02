import React from 'react';
import { ScanResult } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, User } from 'lucide-react';

interface ScanFeedbackProps {
  result: ScanResult | null;
}

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[260px] shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-800">Siap Menerima Scan Absensi</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Tempelkan kartu RFID pada USB Reader atau arahkan QR Code siswa ke kamera scanner.
        </p>
      </div>
    );
  }

  const { type, student, record, message, lateMinutes } = result;

  const bgStyles = {
    HADIR: 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-md',
    TERLAMBAT: 'bg-amber-50 border-amber-300 text-amber-950 shadow-md',
    DUPLICATE: 'bg-sky-50 border-sky-300 text-sky-950 shadow-md',
    NOT_FOUND: 'bg-rose-50 border-rose-300 text-rose-950 shadow-md',
    ERROR: 'bg-rose-50 border-rose-300 text-rose-950 shadow-md'
  };

  const badgeStyles = {
    HADIR: 'bg-emerald-600 text-white font-bold',
    TERLAMBAT: 'bg-amber-600 text-white font-bold',
    DUPLICATE: 'bg-sky-600 text-white font-bold',
    NOT_FOUND: 'bg-rose-600 text-white font-bold',
    ERROR: 'bg-rose-600 text-white font-bold'
  };

  const iconMap = {
    HADIR: <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0 animate-bounce" />,
    TERLAMBAT: <Clock className="w-10 h-10 text-amber-600 shrink-0" />,
    DUPLICATE: <AlertTriangle className="w-10 h-10 text-sky-600 shrink-0" />,
    NOT_FOUND: <XCircle className="w-10 h-10 text-rose-600 shrink-0" />,
    ERROR: <XCircle className="w-10 h-10 text-rose-600 shrink-0" />
  };

  return (
    <div className={`border-2 rounded-2xl p-6 lg:p-8 transition-all duration-300 animate-slide-up ${bgStyles[type]}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center font-black text-3xl text-indigo-700 shadow-md">
            {student ? student.name.charAt(0) : '?'}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
            {iconMap[type]}
          </div>
        </div>

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
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-white border border-slate-200 text-slate-800 font-bold shadow-xs">
                Jam: {record.time} ({record.method})
              </span>
            )}
          </div>

          {student ? (
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {student.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-slate-700 font-semibold mt-1">
                <span>NIS: <strong className="text-indigo-700 font-mono">{student.nis}</strong></span>
                <span>•</span>
                <span>Kelas: <strong className="text-indigo-900">{student.className}</strong></span>
                <span>•</span>
                <span>JK: {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-rose-800">
                Data Siswa Tidak Ditemukan
              </h2>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-800 mt-3 pt-3 border-t border-slate-200/80 leading-relaxed font-semibold">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
