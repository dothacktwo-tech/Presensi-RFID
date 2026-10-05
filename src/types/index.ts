export type UserRole = 'admin' | 'guru_piket' | 'wali_kelas';

export interface User {
  id: string;
  username: string;
  passwordHash?: string; // Hashed password (SHA-256)
  name: string;
  email: string;
  role: UserRole;
  assignedClassId?: string; // Specific class for Wali Kelas
  assignedClassName?: string;
  avatarUrl?: string;
  nip?: string;
}

export interface StudentClass {
  id: string;
  name: string; // e.g. "X IPA 1", "XI IPS 2"
  grade: string; // "X", "XI", "XII"
  major: string; // "IPA", "IPS", "UMUM"
  waliKelasId?: string;
  waliKelasName?: string;
  academicYear: string; // e.g. "2025/2026"
  studentCount?: number;
}

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  classId: string;
  className: string;
  rfidUid: string; // USB RFID tag string (e.g. "0008472910")
  qrCode: string;  // QR string identifier (e.g. "SMAN1L-STD-1001")
  gender: 'L' | 'P';
  parentPhone?: string;
  address?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'SAKIT' | 'IZIN' | 'ALPA';

export type ScanMethod = 'RFID' | 'QR' | 'MANUAL';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  nis: string;
  studentName: string;
  classId: string;
  className: string;
  date: string; // Format: "YYYY-MM-DD"
  time: string; // Format: "HH:mm:ss"
  method: ScanMethod;
  status: AttendanceStatus;
  lateMinutes?: number;
  notes?: string;
  scannedBy?: string; // Name/ID of Guru Piket or system
  createdAt: string;
}

export interface SchoolSettings {
  schoolName: string;
  npsn: string;
  address: string;
  headmasterName: string;
  headmasterNip: string;
  entryTimeLimit: string; // e.g. "07:00"
  exitTimeLimit: string;  // e.g. "15:30"
  lateToleranceMinutes: number; // e.g. 5
  soundEnabled: boolean;
  autoMarkAlpaTime: string; // e.g. "10:00"
  autoLockEnabled?: boolean; // Penguncian Otomatis Akhir Hari
}

export interface AttendanceSummary {
  date: string;
  totalStudents: number;
  hadir: number;
  terlambat: number;
  sakit: number;
  izin: number;
  alpa: number;
  belumAbsen: number;
  percentageHadir: number;
}

export interface ScanResult {
  success: boolean;
  type: 'HADIR' | 'TERLAMBAT' | 'DUPLICATE' | 'NOT_FOUND' | 'ERROR';
  student?: Student;
  record?: AttendanceRecord;
  message: string;
  lateMinutes?: number;
}

export type MenuKey =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'students-print'
  | 'attendance-check'
  | 'manual-input'
  | 'attendance-history'
  | 'scanner'
  | 'reports'
  | 'reports-rekap'
  | 'reports-pdf'
  | 'reports-excel'
  | 'users'
  | 'sidebar-settings'
  | 'school-settings'
  | 'supabase-settings';

export type RolePermissionsMap = Record<UserRole, Record<MenuKey, boolean>>;

