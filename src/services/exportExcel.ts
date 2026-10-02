import * as XLSX from 'xlsx';
import { AttendanceRecord, Student } from '../types';

/**
 * Export attendance records to formatted Excel spreadsheet
 */
export const exportAttendanceToExcel = (records: AttendanceRecord[], filenameStr: string = 'Rekap_Absensi_SMAN1_Lumbung') => {
  const formattedRows = records.map((r, i) => ({
    'No': i + 1,
    'NIS': r.nis,
    'Nama Siswa': r.studentName,
    'Kelas': r.className,
    'Tanggal': r.date,
    'Jam Scan': r.time,
    'Metode Scan': r.method,
    'Status Presensi': r.status,
    'Durasi Keterlambatan': r.status === 'TERLAMBAT' && r.lateMinutes ? `${r.lateMinutes} menit` : '-',
    'Catatan / Alasan': r.notes || '-',
    'Petugas': r.scannedBy || 'System'
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // Auto-fit columns
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // NIS
    { wch: 25 }, // Nama Siswa
    { wch: 12 }, // Kelas
    { wch: 12 }, // Tanggal
    { wch: 10 }, // Jam
    { wch: 10 }, // Metode
    { wch: 15 }, // Status
    { wch: 18 }, // Terlambat
    { wch: 25 }, // Catatan
    { wch: 20 }  // Petugas
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');

  XLSX.writeFile(workbook, `${filenameStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Download sample template CSV/Excel for Bulk Student Upload
 */
export const downloadStudentTemplate = () => {
  const sampleData = [
    {
      'NIS': '24251010',
      'NISN': '0089876543',
      'Nama': 'Siti Rahmah',
      'Kelas': 'X IPA 1',
      'Jenis Kelamin (L/P)': 'P',
      'UID RFID': '0009988776',
      'QR Code': 'SMAN1L-24251010',
      'No HP Orang Tua': '081234567899',
      'Alamat': 'Dusun Lumbung RT 01 RW 01'
    },
    {
      'NIS': '24251011',
      'NISN': '0089876544',
      'Nama': 'Rizky Pratama',
      'Kelas': 'X IPA 1',
      'Jenis Kelamin (L/P)': 'L',
      'UID RFID': '0008877665',
      'QR Code': 'SMAN1L-24251011',
      'No HP Orang Tua': '081234567898',
      'Alamat': 'Dusun Cikupa RT 02 RW 01'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 12 },
    { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

  XLSX.writeFile(workbook, 'Template_Import_Siswa_SMAN1_Lumbung.xlsx');
};

/**
 * Parse uploaded Excel or CSV file for student bulk upload
 */
export const parseStudentExcelFile = (file: File): Promise<Partial<Student>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        const parsedStudents: Partial<Student>[] = jsonData.map((row) => {
          // Normalize column headers
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                rk => rk.toLowerCase().trim() === k.toLowerCase().trim()
              );
              if (matchedKey && row[matchedKey] !== undefined) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const nis = getVal(['nis', 'nomor induk', 'no_induk']);
          const nisn = getVal(['nisn']);
          const name = getVal(['nama', 'nama siswa', 'nama_lengkap', 'name']);
          const className = getVal(['kelas', 'class', 'nama kelas']);
          const genderRaw = getVal(['jenis kelamin', 'jk', 'gender', 'jenis kelamin (l/p)']);
          const rfidUid = getVal(['uid rfid', 'rfid', 'uid', 'rfid_uid', 'id rfid']);
          const qrCode = getVal(['qr code', 'qr', 'qrcode', 'qr_string']);
          const parentPhone = getVal(['no hp orang tua', 'hp ortu', 'no hp', 'telepon', 'phone']);
          const address = getVal(['alamat', 'address']);

          return {
            nis,
            nisn,
            name,
            className,
            gender: genderRaw.toUpperCase().startsWith('P') ? 'P' : 'L',
            rfidUid,
            qrCode,
            parentPhone,
            address
          };
        });

        resolve(parsedStudents.filter(s => s.nis || s.name));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
