import {
  User,
  StudentClass,
  Student,
  AttendanceRecord,
  SchoolSettings,
  ScanResult,
  ScanMethod
} from '../types';
import { getTodayDateString, getCurrentTimeString, calculateLateMinutes } from '../utils/dateUtils';

const STORAGE_KEYS = {
  USERS: 'sman1_lumbung_users',
  CLASSES: 'sman1_lumbung_classes',
  STUDENTS: 'sman1_lumbung_students',
  ATTENDANCES: 'sman1_lumbung_attendances',
  SETTINGS: 'sman1_lumbung_settings',
  INITIALIZED: 'sman1_lumbung_init_v2'
};

// Initial Seed Data for SMAN 1 Lumbung
const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMAN 1 Lumbung',
  npsn: '20211543',
  address: 'Jl. Raya Lumbung No. 45, Kec. Lumbung, Kab. Ciamis, Jawa Barat 46258',
  headmasterName: 'Drs. H. Mulyana, M.Pd.',
  headmasterNip: '19680512 199403 1 004',
  entryTimeLimit: '07:00',
  exitTimeLimit: '15:30',
  lateToleranceMinutes: 5,
  soundEnabled: true,
  autoMarkAlpaTime: '10:00'
};

const DEFAULT_CLASSES: StudentClass[] = [
  { id: 'cls-1', name: 'X IPA 1', grade: 'X', major: 'IPA', waliKelasId: 'usr-3', waliKelasName: 'Budi Santoso, S.Pd.', academicYear: '2025/2026' },
  { id: 'cls-2', name: 'X IPA 2', grade: 'X', major: 'IPA', waliKelasId: 'usr-4', waliKelasName: 'Rina Wijaya, S.Pd.', academicYear: '2025/2026' },
  { id: 'cls-3', name: 'XI IPA 1', grade: 'XI', major: 'IPA', waliKelasId: 'usr-2', waliKelasName: 'Siti Aminah, S.Pd.', academicYear: '2025/2026' },
  { id: 'cls-4', name: 'XI IPS 1', grade: 'XI', major: 'IPS', waliKelasId: 'usr-5', waliKelasName: 'Dedi Kurniawan, S.Si.', academicYear: '2025/2026' },
  { id: 'cls-5', name: 'XII IPA 1', grade: 'XII', major: 'IPA', waliKelasId: 'usr-6', waliKelasName: 'Endang Suherman, M.Pd.', academicYear: '2025/2026' }
];

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    name: 'Drs. H. Mulyana, M.Pd.',
    email: 'admin@sman1lumbung.sch.id',
    role: 'admin',
    nip: '19680512 199403 1 004',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  },
  {
    id: 'usr-piket',
    username: 'piket',
    name: 'Ahmad Fauzi, S.Pd.',
    email: 'fauzi.piket@sman1lumbung.sch.id',
    role: 'guru_piket',
    nip: '19820415 200801 1 008',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
  },
  {
    id: 'usr-2',
    username: 'walixiipa1',
    name: 'Siti Aminah, S.Pd.',
    email: 'sitiaminah@sman1lumbung.sch.id',
    role: 'wali_kelas',
    assignedClassId: 'cls-3',
    assignedClassName: 'XI IPA 1',
    nip: '19850920 201001 2 015',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
  },
  {
    id: 'usr-3',
    username: 'walixipa1',
    name: 'Budi Santoso, S.Pd.',
    email: 'budisantoso@sman1lumbung.sch.id',
    role: 'wali_kelas',
    assignedClassId: 'cls-1',
    assignedClassName: 'X IPA 1',
    nip: '19881105 201201 1 010'
  }
];

const DEFAULT_STUDENTS: Student[] = [
  { id: 'std-101', nis: '23241001', nisn: '0071234561', name: 'Aditya Pratama', classId: 'cls-3', className: 'XI IPA 1', rfidUid: '0008472910', qrCode: 'SMAN1L-23241001', gender: 'L', parentPhone: '081234567890', address: 'Dusun Lumbung RT 02 RW 01', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-102', nis: '23241002', nisn: '0071234562', name: 'Annisa Rahmawati', classId: 'cls-3', className: 'XI IPA 1', rfidUid: '0009182374', qrCode: 'SMAN1L-23241002', gender: 'P', parentPhone: '081234567891', address: 'Dusun Rawa RT 01 RW 03', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-103', nis: '23241003', nisn: '0071234563', name: 'Bagus Setyawan', classId: 'cls-3', className: 'XI IPA 1', rfidUid: '0007564123', qrCode: 'SMAN1L-23241003', gender: 'L', parentPhone: '081234567892', address: 'Dusun Cikupa RT 03 RW 02', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-104', nis: '23241004', nisn: '0071234564', name: 'Citra Dewi Kartika', classId: 'cls-3', className: 'XI IPA 1', rfidUid: '0006231458', qrCode: 'SMAN1L-23241004', gender: 'P', parentPhone: '081234567893', address: 'Dusun Sukamaju RT 04 RW 01', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-105', nis: '23241005', nisn: '0071234565', name: 'Daffa Rizky Maulana', classId: 'cls-3', className: 'XI IPA 1', rfidUid: '0005412987', qrCode: 'SMAN1L-23241005', gender: 'L', parentPhone: '081234567894', address: 'Dusun Sadewata RT 02 RW 02', status: 'aktif', createdAt: '2025-07-15' },

  { id: 'std-201', nis: '24251001', nisn: '0081234501', name: 'Eka Nurjanah', classId: 'cls-1', className: 'X IPA 1', rfidUid: '0001122334', qrCode: 'SMAN1L-24251001', gender: 'P', parentPhone: '085612345678', address: 'Dusun Awiluar RT 01 RW 01', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-202', nis: '24251002', nisn: '0081234502', name: 'Fahri Hidayat', classId: 'cls-1', className: 'X IPA 1', rfidUid: '0002233445', qrCode: 'SMAN1L-24251002', gender: 'L', parentPhone: '085612345679', address: 'Dusun Lumbung RT 05 RW 02', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-203', nis: '24251003', nisn: '0081234503', name: 'Gilang Ramadhan', classId: 'cls-1', className: 'X IPA 1', rfidUid: '0003344556', qrCode: 'SMAN1L-24251003', gender: 'L', parentPhone: '085612345680', address: 'Dusun Cadas RT 02 RW 01', status: 'aktif', createdAt: '2025-07-15' },

  { id: 'std-301', nis: '23242001', nisn: '0072234501', name: 'Hani Febrianti', classId: 'cls-4', className: 'XI IPS 1', rfidUid: '0004455667', qrCode: 'SMAN1L-23242001', gender: 'P', parentPhone: '087812345678', address: 'Dusun Gunung Murni RT 01 RW 02', status: 'aktif', createdAt: '2025-07-15' },
  { id: 'std-302', nis: '23242002', nisn: '0072234502', name: 'Irfan Hakim', classId: 'cls-4', className: 'XI IPS 1', rfidUid: '0005566778', qrCode: 'SMAN1L-23242002', gender: 'L', parentPhone: '087812345679', address: 'Dusun Lumbung RT 01 RW 01', status: 'aktif', createdAt: '2025-07-15' },

  { id: 'std-401', nis: '22231001', nisn: '0061234501', name: 'Jihan Nabila', classId: 'cls-5', className: 'XII IPA 1', rfidUid: '0006677889', qrCode: 'SMAN1L-22231001', gender: 'P', parentPhone: '081312345678', address: 'Dusun Sukaraharja RT 03 RW 03', status: 'aktif', createdAt: '2025-07-15' }
];

export class StorageService {
  static init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));

      // Generate seed attendance records for today and previous 2 days
      const today = getTodayDateString();
      const seedAttendances: AttendanceRecord[] = [
        {
          id: 'att-1',
          studentId: 'std-101',
          nis: '23241001',
          studentName: 'Aditya Pratama',
          classId: 'cls-3',
          className: 'XI IPA 1',
          date: today,
          time: '06:42:15',
          method: 'RFID',
          status: 'HADIR',
          scannedBy: 'System RFID Reader',
          createdAt: `${today}T06:42:15Z`
        },
        {
          id: 'att-2',
          studentId: 'std-102',
          nis: '23241002',
          studentName: 'Annisa Rahmawati',
          classId: 'cls-3',
          className: 'XI IPA 1',
          date: today,
          time: '06:55:40',
          method: 'QR',
          status: 'HADIR',
          scannedBy: 'Ahmad Fauzi, S.Pd.',
          createdAt: `${today}T06:55:40Z`
        },
        {
          id: 'att-3',
          studentId: 'std-103',
          nis: '23241003',
          studentName: 'Bagus Setyawan',
          classId: 'cls-3',
          className: 'XI IPA 1',
          date: today,
          time: '07:12:05',
          method: 'RFID',
          status: 'TERLAMBAT',
          lateMinutes: 7,
          notes: 'Mogok motor di jalan',
          scannedBy: 'System RFID Reader',
          createdAt: `${today}T07:12:05Z`
        },
        {
          id: 'att-4',
          studentId: 'std-201',
          nis: '24251001',
          studentName: 'Eka Nurjanah',
          classId: 'cls-1',
          className: 'X IPA 1',
          date: today,
          time: '06:48:30',
          method: 'RFID',
          status: 'HADIR',
          scannedBy: 'System RFID Reader',
          createdAt: `${today}T06:48:30Z`
        },
        {
          id: 'att-5',
          studentId: 'std-104',
          nis: '23241004',
          studentName: 'Citra Dewi Kartika',
          classId: 'cls-3',
          className: 'XI IPA 1',
          date: today,
          time: '07:30:00',
          method: 'MANUAL',
          status: 'SAKIT',
          notes: 'Surat dokter dikirim via WhatsApp',
          scannedBy: 'Siti Aminah, S.Pd.',
          createdAt: `${today}T07:30:00Z`
        }
      ];

      localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(seedAttendances));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  // --- SETTINGS ---
  static getSettings(): SchoolSettings {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  }

  static saveSettings(settings: SchoolSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- CLASSES ---
  static getClasses(): StudentClass[] {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const classes: StudentClass[] = data ? JSON.parse(data) : [];
    const students = this.getStudents();

    // Attach current student counts dynamically
    return classes.map(c => ({
      ...c,
      studentCount: students.filter(s => s.classId === c.id && s.status === 'aktif').length
    }));
  }

  static getClassById(classId: string): StudentClass | undefined {
    return this.getClasses().find(c => c.id === classId);
  }

  static saveClass(cls: StudentClass): void {
    const classes = this.getClasses();
    const index = classes.findIndex(c => c.id === cls.id);
    if (index >= 0) {
      classes[index] = cls;
    } else {
      classes.push(cls);
    }
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }

  static deleteClass(classId: string): void {
    const classes = this.getClasses().filter(c => c.id !== classId);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }

  // --- STUDENTS ---
  static getStudents(): Student[] {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  }

  static getStudentById(id: string): Student | undefined {
    return this.getStudents().find(s => s.id === id);
  }

  static findStudentByRfidOrQr(code: string): Student | undefined {
    const cleanCode = code.trim();
    if (!cleanCode) return undefined;
    return this.getStudents().find(s => 
      s.rfidUid === cleanCode || 
      s.qrCode === cleanCode || 
      s.nis === cleanCode
    );
  }

  static saveStudent(student: Student): void {
    const students = this.getStudents();
    const index = students.findIndex(s => s.id === student.id);
    if (index >= 0) {
      students[index] = student;
    } else {
      students.push(student);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  static bulkInsertStudents(newStudents: Partial<Student>[]): { inserted: number; errors: string[] } {
    const existing = this.getStudents();
    const classes = this.getClasses();
    const errors: string[] = [];
    let count = 0;

    const updated = [...existing];

    newStudents.forEach((raw, idx) => {
      const rowNum = idx + 1;
      if (!raw.nis || !raw.name) {
        errors.push(`Baris ${rowNum}: NIS dan Nama wajib diisi.`);
        return;
      }

      // Check duplicate NIS
      if (updated.some(s => s.nis === raw.nis)) {
        errors.push(`Baris ${rowNum}: NIS ${raw.nis} sudah terdaftar.`);
        return;
      }

      // Match or find Class
      let targetClass = classes.find(c => c.name.toLowerCase() === raw.className?.toLowerCase().trim());
      if (!targetClass && classes.length > 0) {
        targetClass = classes[0]; // fallback
      }

      const newStudent: Student = {
        id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nis: String(raw.nis).trim(),
        nisn: raw.nisn ? String(raw.nisn).trim() : '',
        name: String(raw.name).trim(),
        classId: targetClass ? targetClass.id : 'cls-1',
        className: targetClass ? targetClass.name : (raw.className || 'Umum'),
        rfidUid: raw.rfidUid ? String(raw.rfidUid).trim() : `RFID-${raw.nis}`,
        qrCode: raw.qrCode ? String(raw.qrCode).trim() : `SMAN1L-${raw.nis}`,
        gender: (String(raw.gender).toUpperCase() === 'P' || String(raw.gender).toLowerCase() === 'perempuan') ? 'P' : 'L',
        parentPhone: raw.parentPhone ? String(raw.parentPhone).trim() : '',
        address: raw.address ? String(raw.address).trim() : '',
        status: 'aktif',
        createdAt: getTodayDateString()
      };

      updated.push(newStudent);
      count++;
    });

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    return { inserted: count, errors };
  }

  static deleteStudent(id: string): void {
    const students = this.getStudents().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  // --- ATTENDANCE PROCESSING ---

  static getAttendances(): AttendanceRecord[] {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Core logic for processing a student attendance scan (RFID / QR / Manual).
   * Prevents duplicate scans on the same day.
   */
  static processScan(inputCode: string, method: ScanMethod = 'RFID', scannedBy: string = 'Kiosk System'): ScanResult {
    const student = this.findStudentByRfidOrQr(inputCode);

    if (!student) {
      return {
        success: false,
        type: 'NOT_FOUND',
        message: `Kartu / QR Code "${inputCode}" tidak terdaftar di sistem SMAN 1 Lumbung.`
      };
    }

    if (student.status !== 'aktif') {
      return {
        success: false,
        type: 'ERROR',
        student,
        message: `Siswa ${student.name} berstatus tidak aktif.`
      };
    }

    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();
    const settings = this.getSettings();

    // Prevent duplicate scan on same day
    const allAttendances = this.getAttendances();
    const existingToday = allAttendances.find(
      a => a.studentId === student.id && a.date === today
    );

    if (existingToday) {
      return {
        success: false,
        type: 'DUPLICATE',
        student,
        record: existingToday,
        message: `Siswa ${student.name} (${student.className}) SUDAH ABSEN hari ini pada jam ${existingToday.time} [Status: ${existingToday.status}].`
      };
    }

    // Check late status
    const { isLate, lateMinutes } = calculateLateMinutes(
      currentTime,
      settings.entryTimeLimit,
      settings.lateToleranceMinutes
    );

    const status = isLate ? 'TERLAMBAT' : 'HADIR';

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      nis: student.nis,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      date: today,
      time: currentTime,
      method,
      status,
      lateMinutes: isLate ? lateMinutes : 0,
      scannedBy,
      createdAt: new Date().toISOString()
    };

    allAttendances.unshift(newRecord); // Add to top
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(allAttendances));

    if (isLate) {
      return {
        success: true,
        type: 'TERLAMBAT',
        student,
        record: newRecord,
        lateMinutes,
        message: `Siswa ${student.name} (${student.className}) berhasil diproses [TERLAMBAT ${lateMinutes} mnt].`
      };
    }

    return {
      success: true,
      type: 'HADIR',
      student,
      record: newRecord,
      message: `Presensi Berhasil! Selamat pagi, ${student.name} (${student.className}).`
    };
  }

  static createManualAttendance(record: Partial<AttendanceRecord>): void {
    const attendances = this.getAttendances();
    const today = record.date || getTodayDateString();

    // Check existing
    const index = attendances.findIndex(a => a.studentId === record.studentId && a.date === today);

    const isNonPresent = record.status === 'SAKIT' || record.status === 'IZIN' || record.status === 'ALPA';

    const fullRecord: AttendanceRecord = {
      id: index >= 0 ? attendances[index].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: record.studentId!,
      nis: record.nis || '',
      studentName: record.studentName || '',
      classId: record.classId || '',
      className: record.className || '',
      date: today,
      time: isNonPresent ? '-' : (record.time || getCurrentTimeString()),
      method: 'MANUAL',
      status: record.status || 'HADIR',
      lateMinutes: record.status === 'TERLAMBAT' ? (record.lateMinutes || 10) : 0,
      notes: record.notes || '',
      scannedBy: record.scannedBy || 'Manual Input',
      createdAt: new Date().toISOString()
    };

    if (index >= 0) {
      attendances[index] = fullRecord;
    } else {
      attendances.unshift(fullRecord);
    }

    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
  }

  static updateAttendanceStatus(id: string, status: AttendanceRecord['status'], notes?: string): void {
    const attendances = this.getAttendances();
    const index = attendances.findIndex(a => a.id === id);
    if (index >= 0) {
      attendances[index].status = status;
      if (notes !== undefined) attendances[index].notes = notes;
      localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
    }
  }

  static deleteAttendance(id: string): void {
    const attendances = this.getAttendances().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
  }

  // --- USERS & RBAC ---
  static getUsers(): User[] {
    this.init();
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static deleteUser(id: string): void {
    const users = this.getUsers().filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // --- LOCKED DATES & BATCH PERMISSION ---
  static getLockedDates(): string[] {
    const data = localStorage.getItem('sman1_lumbung_locked_dates');
    return data ? JSON.parse(data) : [];
  }

  static isDateLocked(date: string): boolean {
    const locked = this.getLockedDates();
    return locked.includes(date);
  }

  static lockDate(date: string): void {
    const locked = this.getLockedDates();
    if (!locked.includes(date)) {
      locked.push(date);
      localStorage.setItem('sman1_lumbung_locked_dates', JSON.stringify(locked));
    }
  }

  static unlockDate(date: string): void {
    const locked = this.getLockedDates().filter(d => d !== date);
    localStorage.setItem('sman1_lumbung_locked_dates', JSON.stringify(locked));
  }
}
