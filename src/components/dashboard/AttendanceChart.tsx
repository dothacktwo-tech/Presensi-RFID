import React from 'react';
import { StudentClass, AttendanceRecord, Student } from '../../types';
import { BarChart3, TrendingUp, ChevronRight } from 'lucide-react';

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
    const total = classStudents.length || 1;

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

  const groupedData: any = {};
  for (const cd of classData) {
    const generation = cd.className.split(" ")[0];
    if (!groupedData[generation]) groupedData[generation] = [];
    groupedData[generation].push(cd);
  }

  const [expandedGenerations, setExpandedGenerations] = React.useState<Record<string, boolean>>({});
  const toggleGeneration = (gen: string) => {
    setExpandedGenerations(prev => ({ ...prev, [gen]: !prev[gen] }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Statistik Kehadiran Per Kelas Hari Ini</h3>
            <p className="text-[11px] text-slate-500">Persentase siswa hadir (Tepat Waktu + Terlambat)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-bold">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedData).map(([gen, classes]) => (
          <div key={gen} className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleGeneration(gen)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-900"
            >
              <span>Angkatan {gen}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${expandedGenerations[gen] ? 'rotate-90' : ''}`} />
            </button>
            {expandedGenerations[gen] && (
              <div className="p-3 space-y-4">
                {(classes as any[]).map((cd) => (
                  <div key={cd.className} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{cd.className}</span>
                      <span className="font-mono text-slate-600">
                        <strong className="text-emerald-600">{cd.totalPresent}</strong> / {cd.total} Siswa ({cd.percentage}%)
                      </span>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex border border-slate-200">
                      <div
                        style={{ width: `${(cd.hadirCount / cd.total) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Hadir: ${cd.hadirCount}`}
                      ></div>
                      <div
                        style={{ width: `${(cd.terlambatCount / cd.total) * 100}%` }}
                        className="bg-amber-500 h-full transition-all duration-500"
                        title={`Terlambat: ${cd.terlambatCount}`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
          <span>Hadir Tepat Waktu</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
          <span>Terlambat (&gt; 07:00)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300"></span>
          <span>Belum Absen / Alpa</span>
        </div>
      </div>
    </div>
  );
};
