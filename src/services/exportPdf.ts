import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, SchoolSettings } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';

export interface PdfExportOptions {
  records: AttendanceRecord[];
  settings: SchoolSettings;
  title?: string;
  startDate?: string;
  endDate?: string;
  className?: string;
  statusFilter?: string;
  generatedBy?: string;
}

export const generateAttendancePdf = (options: PdfExportOptions) => {
  const {
    records,
    settings,
    title = 'LAPORAN REKAPITULASI PRESENSI SISWA',
    startDate,
    endDate,
    className = 'Semua Kelas',
    statusFilter = 'Semua Status',
    generatedBy = 'Sistem Absensi'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- SCHOOL HEADER (KOP SURAT) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PEMERINTAH PROVINSI JAWA BARAT', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(13);
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, 21, { align: 'center' });
  doc.setFontSize(16);
  doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, 28, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings.address, pageWidth / 2, 34, { align: 'center' });
  doc.text(`NPSN: ${settings.npsn} | Email: info@sman1lumbung.sch.id`, pageWidth / 2, 39, { align: 'center' });

  // Double Divider Line
  doc.setLineWidth(0.8);
  doc.line(15, 42, pageWidth - 15, 42);
  doc.setLineWidth(0.2);
  doc.line(15, 43, pageWidth - 15, 43);

  // --- REPORT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 51, { align: 'center' });

  // --- METADATA INFO BOX ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const dateRangeStr = startDate && endDate
    ? (startDate === endDate ? formatIndonesianDate(startDate) : `${startDate} s.d. ${endDate}`)
    : formatIndonesianDate(new Date().toISOString().split('T')[0]);

  doc.text(`Periode          : ${dateRangeStr}`, 15, 59);
  doc.text(`Kelas            : ${className}`, 15, 64);
  doc.text(`Filter Status   : ${statusFilter}`, 15, 69);
  doc.text(`Total Data       : ${records.length} Record`, pageWidth - 15, 59, { align: 'right' });
  doc.text(`Dicetak Pada   : ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, pageWidth - 15, 64, { align: 'right' });

  // --- SUMMARY STATS ---
  const hadir = records.filter(r => r.status === 'HADIR').length;
  const terlambat = records.filter(r => r.status === 'TERLAMBAT').length;
  const sakit = records.filter(r => r.status === 'SAKIT').length;
  const izin = records.filter(r => r.status === 'IZIN').length;
  const alpa = records.filter(r => r.status === 'ALPA').length;
  const totalLateMinutes = records.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);

  doc.setFillColor(245, 247, 250);
  doc.rect(15, 73, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Ringkasan: HADIR (${hadir}) | TERLAMBAT (${terlambat}) | SAKIT (${sakit}) | IZIN (${izin}) | ALPA (${alpa}) | Total Keterlambatan: ${totalLateMinutes} mnt`, 17, 78);

  // --- ATTENDANCE TABLE ---
  const tableData = records.map((rec, index) => [
    index + 1,
    rec.nis,
    rec.studentName,
    rec.className,
    rec.date,
    rec.time,
    rec.method,
    rec.status,
    rec.status === 'TERLAMBAT' && rec.lateMinutes ? `${rec.lateMinutes} mnt` : '-',
    rec.notes || '-'
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Tanggal', 'Jam', 'Metode', 'Status', 'Keterlambatan', 'Keterangan']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Indigo Navy
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 38 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 15 },
      6: { halign: 'center', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 22 },
      9: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      // Highlight Status column
      if (data.section === 'body' && data.column.index === 7) {
        const statusVal = String(data.cell.raw);
        if (statusVal === 'HADIR') {
          data.cell.styles.textColor = [22, 101, 52]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (statusVal === 'TERLAMBAT') {
          data.cell.styles.textColor = [194, 65, 12]; // Orange
          data.cell.styles.fontStyle = 'bold';
        } else if (statusVal === 'SAKIT' || statusVal === 'IZIN') {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
        } else if (statusVal === 'ALPA') {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // --- SIGNATURE SECTION ---
  // @ts-expect-error autoTable lastAutoTable property
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 200;
  
  if (finalY < 230) {
    const todayStr = formatIndonesianDate(new Date().toISOString().split('T')[0]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Lumbung, ${todayStr}`, pageWidth - 65, finalY);
    doc.text('Mengetahui,', pageWidth - 65, finalY + 5);
    doc.text('Kepala SMAN 1 Lumbung', pageWidth - 65, finalY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text(settings.headmasterName, pageWidth - 65, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.headmasterNip}`, pageWidth - 65, finalY + 35);

    doc.text('Petugas / Wali Kelas,', 20, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(generatedBy, 20, finalY + 30);
  }

  // Save PDF
  doc.save(`Laporan_Absensi_SMAN1_Lumbung_${new Date().getTime()}.pdf`);
};
