import React from 'react';
import { AttendanceRecord } from '../../types';
import { Clock } from 'lucide-react';

interface RecentScansListProps {
  records: AttendanceRecord[];
}

export const RecentScansList: React.FC<RecentScansListProps> = ({ records }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Log Presensi Siswa Terkini</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono font-semibold">Real-time Stream</span>
      </div>

      {records.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Belum ada aktivitas scan hari ini.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                  {r.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{r.studentName}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIS: {r.nis} • Kelas {r.className}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{r.time}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white text-slate-700 border border-slate-200">
                    {r.method}
                  </span>
                </div>

                {r.status === 'HADIR' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    HADIR
                  </span>
                )}
                {r.status === 'TERLAMBAT' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    TERLAMBAT ({r.lateMinutes}m)
                  </span>
                )}
                {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    {r.status}
                  </span>
                )}
                {r.status === 'ALPA' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    ALPA
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
