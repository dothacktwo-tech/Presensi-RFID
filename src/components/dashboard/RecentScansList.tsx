import React from 'react';
import { AttendanceRecord } from '../../types';
import { Clock, ShieldAlert } from 'lucide-react';

interface RecentScansListProps {
  records: AttendanceRecord[];
}

export const RecentScansList: React.FC<RecentScansListProps> = ({ records }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Log Presensi Siswa Terkini</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Real-time Stream</span>
      </div>

      {records.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          Belum ada data presensi hari ini.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {records.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/50 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                  {r.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{r.studentName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    NIS: {r.nis} • Kelas {r.className}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono text-indigo-300">{r.time}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {r.method}
                  </span>
                </div>

                {r.status === 'HADIR' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    HADIR
                  </span>
                )}
                {r.status === 'TERLAMBAT' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    TERLAMBAT ({r.lateMinutes}m)
                  </span>
                )}
                {(r.status === 'SAKIT' || r.status === 'IZIN') && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    {r.status}
                  </span>
                )}
                {r.status === 'ALPA' && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
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
