import React from 'react';
import { StudentClass, AttendanceRecord, Student } from '../../types';
import { BarChart3, TrendingUp } from 'lucide-react';

interface AttendanceChartProps {
  classes: StudentClass[];
  attendances: AttendanceRecord[];
  students: Student[];
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({ classes, attendances, students }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter(a => a.date === today);

  const classData = classes.map(c => {
    const classStudents = students.filter(s => s.classId === c.id && s.status === 'aktif');
    const total = classStudents.length || 1; // avoid divide by zero

    const classScans = todayAttendances.filter(a => a.classId === c.id);
    const hadirCount = classScans.filter(a => a.status === 'HADIR').length;
    const terlambatCount = classScans.filter(a => a.status === 'TERLAMBAT').length;
    const totalPresent = hadirCount + terlambatCount;
    const percentage = Math.round((totalPresent / total) * 100);

    return {
      className: c.name,
      total,
      hadirCount,
      terlambatCount,
      totalPresent,
      percentage
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Statistik Kehadiran Per Kelas Hari Ini</h3>
            <p className="text-[11px] text-slate-400">Persentase siswa hadir (Tepat Waktu + Terlambat)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-lg">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-semibold">Sistem Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {classData.map((cd) => (
          <div key={cd.className} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">{cd.className}</span>
              <span className="font-mono text-slate-300">
                <strong className="text-emerald-400">{cd.totalPresent}</strong> / {cd.total} Siswa ({cd.percentage}%)
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden flex border border-slate-800">
              {/* Hadir Tepat Waktu (Green) */}
              <div
                style={{ width: `${(cd.hadirCount / cd.total) * 100}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Hadir: ${cd.hadirCount}`}
              ></div>
              {/* Terlambat (Amber) */}
              <div
                style={{ width: `${(cd.terlambatCount / cd.total) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Terlambat: ${cd.terlambatCount}`}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
          <span>Hadir Tepat Waktu</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
          <span>Terlambat (&gt; 07:00)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700"></span>
          <span>Belum Absen / Alpa</span>
        </div>
      </div>
    </div>
  );
};
