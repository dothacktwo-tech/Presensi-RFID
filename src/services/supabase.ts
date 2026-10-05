import { createClient } from '@supabase/supabase-js';
import { StorageService } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvhejxzczpbzmpkrbkkn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_z9QI0j-xF_SQCt0W5EIHWA_AWrWlCoi';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- SQL DDL SCHEMA, MIGRATION & SEED DATA UNTUK SMAN 1 LUMBUNG ABSENSI SISWA
-- Jalankan skrip ini pada Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Tabel Settings (Pengaturan Sekolah & Jam Masuk)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'school_config',
    school_name TEXT NOT NULL DEFAULT 'SMAN 1 Lumbung',
    npsn TEXT DEFAULT '20211543',
    address TEXT,
    headmaster_name TEXT,
    headmaster_nip TEXT,
    entry_time_limit TEXT DEFAULT '07:00',
    exit_time_limit TEXT DEFAULT '15:30',
    late_tolerance_minutes INT DEFAULT 5,
    sound_enabled BOOLEAN DEFAULT true,
    auto_mark_alpa_time TEXT DEFAULT '10:00',
    auto_lock_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Classes (Data Kelas & Wali Kelas)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    major TEXT NOT NULL,
    wali_kelas_id TEXT,
    wali_kelas_name TEXT,
    academic_year TEXT DEFAULT '2025/2026',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Users (Data Pengguna & RBAC)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guru_piket', 'wali_kelas')),
    assigned_class_id TEXT REFERENCES public.classes(id) ON DELETE SET NULL,
    assigned_class_name TEXT,
    nip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Students (Master Data Siswa)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT,
    name TEXT NOT NULL,
    class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    rfid_uid TEXT UNIQUE,
    qr_code TEXT UNIQUE,
    gender CHAR(1) CHECK (gender IN ('L', 'P')),
    parent_phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Attendances (Transaksional Presensi Siswa)
CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    nis TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    method TEXT CHECK (method IN ('RFID', 'QR', 'MANUAL')),
    status TEXT CHECK (status IN ('HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'ALPA')),
    late_minutes INT DEFAULT 0,
    notes TEXT,
    scanned_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Role Permissions (Matriks Hak Akses RBAC)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role TEXT PRIMARY KEY CHECK (role IN ('admin', 'guru_piket', 'wali_kelas')),
    permissions_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel Locked Dates (Status Penguncian Presensi Per Tanggal)
CREATE TABLE IF NOT EXISTS public.locked_dates (
    date DATE PRIMARY KEY,
    is_locked BOOLEAN DEFAULT true,
    locked_by TEXT DEFAULT 'System Auto-Lock',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Audit Logs (Jejak Aktivitas & Log Sistem)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- OTOMATISASI MIGRATION DDL
-- ==============================================================================
DO $$
BEGIN
    -- users table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;

    -- settings table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='exit_time_limit') THEN
        ALTER TABLE public.settings ADD COLUMN exit_time_limit TEXT DEFAULT '15:30';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='auto_lock_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN auto_lock_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='sound_enabled') THEN
        ALTER TABLE public.settings ADD COLUMN sound_enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='auto_mark_alpa_time') THEN
        ALTER TABLE public.settings ADD COLUMN auto_mark_alpa_time TEXT DEFAULT '10:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='updated_at') THEN
        ALTER TABLE public.settings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- students table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='rfid_uid') THEN
        ALTER TABLE public.students ADD COLUMN rfid_uid TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='qr_code') THEN
        ALTER TABLE public.students ADD COLUMN qr_code TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='nisn') THEN
        ALTER TABLE public.students ADD COLUMN nisn TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='gender') THEN
        ALTER TABLE public.students ADD COLUMN gender CHAR(1);
    END IF;

    -- attendances table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendances' AND column_name='late_minutes') THEN
        ALTER TABLE public.attendances ADD COLUMN late_minutes INT DEFAULT 0;
    END IF;
END $$;

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_student_date ON public.attendances(student_id, date);
CREATE INDEX IF NOT EXISTS idx_students_rfid ON public.students(rfid_uid);
CREATE INDEX IF NOT EXISTS idx_students_qr ON public.students(qr_code);

-- Enable Row Level Security (RLS) & Kebijakan Akses Publik
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access settings') THEN
        CREATE POLICY "Allow anon full access settings" ON public.settings FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access classes') THEN
        CREATE POLICY "Allow anon full access classes" ON public.classes FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access users') THEN
        CREATE POLICY "Allow anon full access users" ON public.users FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access students') THEN
        CREATE POLICY "Allow anon full access students" ON public.students FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access attendances') THEN
        CREATE POLICY "Allow anon full access attendances" ON public.attendances FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access role_permissions') THEN
        CREATE POLICY "Allow anon full access role_permissions" ON public.role_permissions FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access locked_dates') THEN
        CREATE POLICY "Allow anon full access locked_dates" ON public.locked_dates FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon full access audit_logs') THEN
        CREATE POLICY "Allow anon full access audit_logs" ON public.audit_logs FOR ALL USING (true);
    END IF;
END $$;

-- SEED DATA AWAL SMAN 1 LUMBUNG
INSERT INTO public.settings (id, school_name, npsn, address, headmaster_name, headmaster_nip, entry_time_limit, exit_time_limit, late_tolerance_minutes, auto_lock_enabled)
VALUES ('school_config', 'SMAN 1 Lumbung', '20211543', 'Jl. Raya Lumbung No. 45, Ciamis', 'Drs. H. Mulyana, M.Pd.', '19680512 199403 1 004', '07:00', '15:30', 5, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, name, grade, major, wali_kelas_name, academic_year) VALUES
('cls-1', 'X IPA 1', 'X', 'IPA', 'Budi Santoso, S.Pd.', '2025/2026'),
('cls-2', 'X IPA 2', 'X', 'IPA', 'Rina Wijaya, S.Pd.', '2025/2026'),
('cls-3', 'XI IPA 1', 'XI', 'IPA', 'Siti Aminah, S.Pd.', '2025/2026'),
('cls-4', 'XI IPS 1', 'XI', 'IPS', 'Dedi Kurniawan, S.Si.', '2025/2026'),
('cls-5', 'XII IPA 1', 'XII', 'IPA', 'Endang Suherman, M.Pd.', '2025/2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, username, password_hash, name, email, role, assigned_class_id, assigned_class_name, nip) VALUES
('usr-1', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Drs. H. Mulyana, M.Pd.', 'admin@sman1lumbung.sch.id', 'admin', NULL, NULL, '19680512 199403 1 004'),
('usr-piket', 'piket', 'a93b4d458c9735d4653e05a8f94d13712d989f55e378c772cb83a45c331165dc', 'Ahmad Fauzi, S.Pd.', 'fauzi.piket@sman1lumbung.sch.id', 'guru_piket', NULL, NULL, '19820415 200801 1 008'),
('usr-2', 'walixiipa1', '268db4da6ebbf0f6a2b8e3ad5bcf7047f3b6a9394f7247fb459df95171732551', 'Siti Aminah, S.Pd.', 'sitiaminah@sman1lumbung.sch.id', 'wali_kelas', 'cls-3', 'XI IPA 1', '19850920 201001 2 015')
ON CONFLICT (id) DO NOTHING;
`;

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('settings').select('school_name').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Terhubung ke Supabase Cloud. Tabel belum siap, silakan klik tombol "Buat / Sinkronkan Otomatis Tabel" atau jalankan Skrip SQL.'
        };
      }
      return { success: false, message: `Status Supabase: ${error.message}` };
    }
    return { success: true, message: 'Koneksi Supabase & Seluruh Tabel Database Berhasil Terhubung!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Koneksi Gagal: ${msg}` };
  }
}

export interface TableCheckResult {
  name: string;
  exists: boolean;
  count: number;
  message: string;
}

export async function checkAllTablesStatus(): Promise<TableCheckResult[]> {
  const tables = ['settings', 'classes', 'users', 'students', 'attendances', 'role_permissions', 'locked_dates', 'audit_logs'];
  const results: TableCheckResult[] = [];

  for (const tbl of tables) {
    try {
      const { error, count } = await supabase
        .from(tbl)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          name: tbl,
          exists: false,
          count: 0,
          message: error.message.includes('does not exist')
            ? 'Tabel belum dibuat'
            : error.message
        });
      } else {
        results.push({
          name: tbl,
          exists: true,
          count: count || 0,
          message: 'Tabel Aktif & Siap'
        });
      }
    } catch {
      results.push({
        name: tbl,
        exists: false,
        count: 0,
        message: 'Gagal mengecek tabel'
      });
    }
  }

  return results;
}

export async function autoCreateAndSyncTables(): Promise<{
  success: boolean;
  syncedCount: number;
  createdTables: string[];
  failedTables: string[];
  messages: string[];
}> {
  const messages: string[] = [];
  const createdTables: string[] = [];
  const failedTables: string[] = [];

  try {
    const syncRes = await syncLocalToSupabase();
    if (syncRes.success) {
      messages.push(`Berhasil menyinkronkan ${syncRes.syncedCount} data ke Supabase Cloud.`);
      return {
        success: true,
        syncedCount: syncRes.syncedCount,
        createdTables: ['settings', 'classes', 'users', 'students', 'attendances', 'role_permissions', 'locked_dates', 'audit_logs'],
        failedTables: [],
        messages
      };
    } else {
      messages.push(...syncRes.errors);
      return {
        success: false,
        syncedCount: syncRes.syncedCount,
        createdTables,
        failedTables,
        messages
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    messages.push(`Kendala otomatisasi: ${msg}`);
    return {
      success: false,
      syncedCount: 0,
      createdTables,
      failedTables,
      messages
    };
  }
}

export async function syncLocalToSupabase(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // 1. Sync Settings
    const localSettings = StorageService.getSettings();
    const { error: errSettings } = await supabase.from('settings').upsert({
      id: 'school_config',
      school_name: localSettings.schoolName,
      npsn: localSettings.npsn,
      address: localSettings.address,
      headmaster_name: localSettings.headmasterName,
      headmaster_nip: localSettings.headmasterNip,
      entry_time_limit: localSettings.entryTimeLimit,
      exit_time_limit: localSettings.exitTimeLimit,
      late_tolerance_minutes: Number(localSettings.lateToleranceMinutes) || 5,
      sound_enabled: localSettings.soundEnabled !== false,
      auto_mark_alpa_time: localSettings.autoMarkAlpaTime || '10:00',
      auto_lock_enabled: localSettings.autoLockEnabled !== false,
      updated_at: new Date().toISOString()
    });
    if (errSettings) errors.push(`Tabel settings: ${errSettings.message}`);
    else synced++;

    // 2. Sync Classes
    const localClasses = StorageService.getClasses();
    if (localClasses.length > 0) {
      const formattedClasses = localClasses.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        major: c.major,
        wali_kelas_id: c.waliKelasId || null,
        wali_kelas_name: c.waliKelasName || null,
        academic_year: c.academicYear || '2025/2026'
      }));
      const { error: errClasses } = await supabase.from('classes').upsert(formattedClasses);
      if (errClasses) errors.push(`Tabel classes: ${errClasses.message}`);
      else synced += localClasses.length;
    }

    // 3. Sync Users
    const localUsers = StorageService.getUsers();
    if (localUsers.length > 0) {
      const formattedUsers = localUsers.map(u => ({
        id: u.id,
        username: u.username,
        password_hash: u.passwordHash || null,
        name: u.name,
        email: u.email,
        role: u.role,
        assigned_class_id: u.assignedClassId || null,
        assigned_class_name: u.assignedClassName || null,
        nip: u.nip || null
      }));
      const { error: errUsers } = await supabase.from('users').upsert(formattedUsers);
      if (errUsers) errors.push(`Tabel users: ${errUsers.message}`);
      else synced += localUsers.length;
    }

    // 4. Sync Students
    const localStudents = StorageService.getStudents();
    if (localStudents.length > 0) {
      const formattedStudents = localStudents.map(s => ({
        id: s.id,
        nis: s.nis,
        nisn: s.nisn || null,
        name: s.name,
        class_id: s.classId,
        class_name: s.className,
        rfid_uid: s.rfidUid,
        qr_code: s.qrCode,
        gender: s.gender,
        parent_phone: s.parentPhone || null,
        address: s.address || null,
        status: s.status
      }));
      const { error: errStudents } = await supabase.from('students').upsert(formattedStudents);
      if (errStudents) errors.push(`Tabel students: ${errStudents.message}`);
      else synced += localStudents.length;
    }

    // 5. Sync Attendances
    const localAttendances = StorageService.getAttendances();
    if (localAttendances.length > 0) {
      const formattedAttendances = localAttendances.map(a => ({
        id: a.id,
        student_id: a.studentId,
        nis: a.nis,
        student_name: a.studentName,
        class_id: a.classId,
        class_name: a.className,
        date: a.date,
        time: a.time,
        method: a.method,
        status: a.status,
        late_minutes: a.lateMinutes || 0,
        notes: a.notes || null,
        scanned_by: a.scannedBy || 'Sync System'
      }));
      const { error: errAttendances } = await supabase.from('attendances').upsert(formattedAttendances);
      if (errAttendances) errors.push(`Tabel attendances: ${errAttendances.message}`);
      else synced += localAttendances.length;
    }

    // 6. Sync Role Permissions
    const localPermissions = StorageService.getRolePermissions();
    if (localPermissions) {
      const formattedPerms = [
        { role: 'admin', permissions_json: localPermissions.admin },
        { role: 'guru_piket', permissions_json: localPermissions.guru_piket },
        { role: 'wali_kelas', permissions_json: localPermissions.wali_kelas }
      ];
      const { error: errPerms } = await supabase.from('role_permissions').upsert(formattedPerms);
      if (errPerms) errors.push(`Tabel role_permissions: ${errPerms.message}`);
      else synced += formattedPerms.length;
    }

    // 7. Sync Locked Dates
    const localLockedDates = StorageService.getLockedDates();
    if (localLockedDates.length > 0) {
      const formattedLocked = localLockedDates.map(d => ({
        date: d,
        is_locked: true,
        locked_by: 'Admin / System'
      }));
      const { error: errLocked } = await supabase.from('locked_dates').upsert(formattedLocked);
      if (errLocked) errors.push(`Tabel locked_dates: ${errLocked.message}`);
      else synced += localLockedDates.length;
    }

    return {
      success: errors.length === 0,
      syncedCount: synced,
      errors
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      syncedCount: synced,
      errors: [msg]
    };
  }
}

export async function pullFromSupabase(): Promise<{ success: boolean; pulledCount: number; message: string }> {
  try {
    let count = 0;

    // 1. Fetch settings
    const { data: dbSettings } = await supabase.from('settings').select('*').single();
    if (dbSettings) {
      const loadedSettings = {
        schoolName: dbSettings.school_name || 'SMAN 1 Lumbung',
        npsn: dbSettings.npsn || '20211543',
        address: dbSettings.address || '',
        headmasterName: dbSettings.headmaster_name || '',
        headmasterNip: dbSettings.headmaster_nip || '',
        entryTimeLimit: dbSettings.entry_time_limit || '07:00',
        exitTimeLimit: dbSettings.exit_time_limit || '15:30',
        lateToleranceMinutes: Number(dbSettings.late_tolerance_minutes) || 5,
        soundEnabled: dbSettings.sound_enabled !== false,
        autoMarkAlpaTime: dbSettings.auto_mark_alpa_time || '10:00',
        autoLockEnabled: dbSettings.auto_lock_enabled !== false
      };
      localStorage.setItem('sman1_lumbung_settings', JSON.stringify(loadedSettings));
      count++;
    }

    // 2. Fetch classes
    const { data: dbClasses } = await supabase.from('classes').select('*');
    if (dbClasses && Array.isArray(dbClasses)) {
      const classesFormatted = dbClasses.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        major: c.major,
        waliKelasId: c.wali_kelas_id || undefined,
        waliKelasName: c.wali_kelas_name || undefined,
        academicYear: c.academic_year || '2025/2026'
      }));
      localStorage.setItem('sman1_lumbung_classes', JSON.stringify(classesFormatted));
      count += classesFormatted.length;
    }

    // 3. Fetch users
    const { data: dbUsers } = await supabase.from('users').select('*');
    if (dbUsers && Array.isArray(dbUsers)) {
      const usersFormatted = dbUsers.map((u: any) => ({
        id: u.id,
        username: u.username,
        passwordHash: u.password_hash || undefined,
        name: u.name,
        email: u.email || '',
        role: u.role,
        assignedClassId: u.assigned_class_id || undefined,
        assignedClassName: u.assigned_class_name || undefined,
        nip: u.nip || undefined
      }));
      localStorage.setItem('sman1_lumbung_users', JSON.stringify(usersFormatted));
      count += usersFormatted.length;
    }

    // 4. Fetch students
    const { data: dbStudents } = await supabase.from('students').select('*');
    if (dbStudents && Array.isArray(dbStudents)) {
      const studentsFormatted = dbStudents.map((s: any) => ({
        id: s.id,
        nis: s.nis,
        nisn: s.nisn || '',
        name: s.name,
        classId: s.class_id,
        className: s.class_name,
        rfidUid: s.rfid_uid || `RFID-${s.nis}`,
        qrCode: s.qr_code || `SMAN1L-${s.nis}`,
        gender: s.gender || 'L',
        parentPhone: s.parent_phone || '',
        address: s.address || '',
        status: s.status || 'aktif',
        createdAt: s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      localStorage.setItem('sman1_lumbung_students', JSON.stringify(studentsFormatted));
      count += studentsFormatted.length;
    }

    // 5. Fetch attendances
    const { data: dbAttendances } = await supabase.from('attendances').select('*');
    if (dbAttendances && Array.isArray(dbAttendances)) {
      const attendancesFormatted = dbAttendances.map((a: any) => ({
        id: a.id,
        studentId: a.student_id,
        nis: a.nis,
        studentName: a.student_name,
        classId: a.class_id,
        className: a.class_name,
        date: a.date,
        time: a.time,
        method: a.method || 'RFID',
        status: a.status,
        lateMinutes: a.late_minutes || 0,
        notes: a.notes || '',
        scannedBy: a.scanned_by || 'Sync System'
      }));
      localStorage.setItem('sman1_lumbung_attendances', JSON.stringify(attendancesFormatted));
      count += attendancesFormatted.length;
    }

    // 6. Fetch role_permissions
    const { data: dbPerms } = await supabase.from('role_permissions').select('*');
    if (dbPerms && Array.isArray(dbPerms) && dbPerms.length > 0) {
      const permObj: any = StorageService.getRolePermissions();
      dbPerms.forEach((p: any) => {
        if (p.role && p.permissions_json) {
          permObj[p.role] = p.permissions_json;
        }
      });
      localStorage.setItem('sman1_lumbung_role_permissions', JSON.stringify(permObj));
      count += dbPerms.length;
    }

    // 7. Fetch locked_dates
    const { data: dbLocked } = await supabase.from('locked_dates').select('*');
    if (dbLocked && Array.isArray(dbLocked) && dbLocked.length > 0) {
      const lockedArray = dbLocked.filter((d: any) => d.is_locked !== false).map((d: any) => d.date);
      localStorage.setItem('sman1_lumbung_locked_dates', JSON.stringify(lockedArray));
      count += dbLocked.length;
    }

    StorageService.notifyDataChanged();
    return {
      success: true,
      pulledCount: count,
      message: `Berhasil menarik ${count} data terbaru dari Database Supabase Cloud!`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      pulledCount: 0,
      message: `Gagal menarik data dari Supabase: ${msg}`
    };
  }
}

export async function deleteRecordFromSupabase(tableName: 'students' | 'users' | 'classes' | 'attendances', ids: string[]): Promise<void> {
  try {
    await supabase.from(tableName).delete().in('id', ids);
  } catch (e) {
    console.warn(`Gagal menghapus dari Supabase tabel ${tableName}:`, e);
  }
}

export async function syncStudentToSupabase(s: any): Promise<void> {
  try {
    await supabase.from('students').upsert({
      id: s.id,
      nis: s.nis,
      nisn: s.nisn || null,
      name: s.name,
      class_id: s.classId,
      class_name: s.className,
      rfid_uid: s.rfidUid,
      qr_code: s.qrCode,
      gender: s.gender,
      parent_phone: s.parentPhone || null,
      address: s.address || null,
      status: s.status
    });
  } catch (e) {
    console.warn('Supabase student sync error:', e);
  }
}

export async function syncClassToSupabase(c: any): Promise<void> {
  try {
    await supabase.from('classes').upsert({
      id: c.id,
      name: c.name,
      grade: c.grade,
      major: c.major,
      wali_kelas_id: c.waliKelasId || null,
      wali_kelas_name: c.waliKelasName || null,
      academic_year: c.academicYear || '2025/2026'
    });
  } catch (e) {
    console.warn('Supabase class sync error:', e);
  }
}

export async function syncUserToSupabase(u: any): Promise<void> {
  try {
    await supabase.from('users').upsert({
      id: u.id,
      username: u.username,
      password_hash: u.passwordHash || null,
      name: u.name,
      email: u.email,
      role: u.role,
      assigned_class_id: u.assignedClassId || null,
      assigned_class_name: u.assignedClassName || null,
      nip: u.nip || null
    });
  } catch (e) {
    console.warn('Supabase user sync error:', e);
  }
}

export async function syncSettingsToSupabase(s: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('settings').upsert({
      id: 'school_config',
      school_name: s.schoolName,
      npsn: s.npsn || '20211543',
      address: s.address || '',
      headmaster_name: s.headmasterName || '',
      headmaster_nip: s.headmasterNip || '',
      entry_time_limit: s.entryTimeLimit || '07:00',
      exit_time_limit: s.exitTimeLimit || '15:30',
      late_tolerance_minutes: Number(s.lateToleranceMinutes) || 5,
      sound_enabled: s.soundEnabled !== false,
      auto_mark_alpa_time: s.autoMarkAlpaTime || '10:00',
      auto_lock_enabled: s.autoLockEnabled !== false,
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('Supabase settings sync error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase settings sync exception:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncRolePermissionsToSupabase(map: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!map) return { success: true };
    const formattedPerms = [
      { role: 'admin', permissions_json: map.admin, updated_at: new Date().toISOString() },
      { role: 'guru_piket', permissions_json: map.guru_piket, updated_at: new Date().toISOString() },
      { role: 'wali_kelas', permissions_json: map.wali_kelas, updated_at: new Date().toISOString() }
    ];
    const { error } = await supabase.from('role_permissions').upsert(formattedPerms);
    if (error) {
      console.warn('Supabase role_permissions sync error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase role_permissions sync exception:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncLockedDateToSupabase(date: string, isLocked: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    if (isLocked) {
      const { error } = await supabase.from('locked_dates').upsert({
        date,
        is_locked: true,
        locked_by: 'Admin / System',
        updated_at: new Date().toISOString()
      });
      if (error) console.warn('Supabase lock date error:', error);
    } else {
      const { error } = await supabase.from('locked_dates').delete().eq('date', date);
      if (error) console.warn('Supabase unlock date error:', error);
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase lock date exception:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function fetchSettingsFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'school_config').single();
    if (error || !data) return null;
    return {
      schoolName: data.school_name || 'SMAN 1 Lumbung',
      npsn: data.npsn || '20211543',
      address: data.address || '',
      headmasterName: data.headmaster_name || '',
      headmasterNip: data.headmaster_nip || '',
      entryTimeLimit: data.entry_time_limit || '07:00',
      exitTimeLimit: data.exit_time_limit || '15:30',
      lateToleranceMinutes: Number(data.late_tolerance_minutes) || 5,
      soundEnabled: data.sound_enabled !== false,
      autoMarkAlpaTime: data.auto_mark_alpa_time || '10:00',
      autoLockEnabled: data.auto_lock_enabled !== false
    };
  } catch {
    return null;
  }
}

export async function syncAttendanceToSupabase(a: any): Promise<void> {
  try {
    await supabase.from('attendances').upsert({
      id: a.id,
      student_id: a.studentId,
      nis: a.nis,
      student_name: a.studentName,
      class_id: a.classId,
      class_name: a.className,
      date: a.date,
      time: a.time,
      method: a.method,
      status: a.status,
      late_minutes: a.lateMinutes || 0,
      notes: a.notes || null,
      scanned_by: a.scannedBy || 'System'
    });
  } catch (e) {
    console.warn('Supabase attendance sync error:', e);
  }
}

// ============================================================================
// DIAGNOSTIC UTILITY FUNCTION FOR STUDENTS, ATTENDANCE & GHOST RECORDS
// ============================================================================

export interface DiagnosticReport {
  timestamp: string;
  localState: {
    studentsCount: number;
    classesCount: number;
    attendancesCount: number;
    usersCount: number;
    studentsList: Array<{ id: string; name: string; nis: string; classId: string; status: string }>;
    attendancesList: Array<{ id: string; studentId: string; studentName: string; date: string; status: string }>;
  };
  remoteDatabase: {
    connected: boolean;
    studentsCount: number;
    classesCount: number;
    attendancesCount: number;
    usersCount: number;
    studentsList: Array<any>;
    attendancesList: Array<any>;
    error?: string;
  };
  crossReference: {
    ghostStudentsInLocal: string[]; // Students in LocalStorage but missing in Supabase Cloud
    ghostAttendancesInLocal: string[]; // Attendance records in LocalStorage but missing in Supabase Cloud
    orphanAttendancesInLocal: string[]; // Attendance records referencing non-existent student IDs
    mismatchedStudentCounts: boolean;
    analysisMessage: string;
  };
}

export async function runStateAndDatabaseDiagnostic(): Promise<DiagnosticReport> {
  console.group('🔍 [DIAGNOSTIC UTILITY] Running SMAN 1 Lumbung System State Audit');
  const now = new Date().toISOString();

  // 1. Inspect Local State
  const localStudents = StorageService.getStudents();
  const localClasses = StorageService.getClasses();
  const localAttendances = StorageService.getAttendances();
  const localUsers = StorageService.getUsers();

  console.log('%c[1] LOCAL STORAGE STATE:', 'color: #6366f1; font-weight: bold;', {
    studentsCount: localStudents.length,
    classesCount: localClasses.length,
    attendancesCount: localAttendances.length,
    usersCount: localUsers.length
  });

  if (localStudents.length > 0) {
    console.table(localStudents.map(s => ({ ID: s.id, NIS: s.nis, Nama: s.name, Kelas: s.className, Status: s.status })));
  }

  // 2. Query Remote Supabase Database Records
  let dbConnected = false;
  let remoteStudents: any[] = [];
  let remoteAttendances: any[] = [];
  let remoteClasses: any[] = [];
  let remoteUsers: any[] = [];
  let dbErrorStr: string | undefined;

  try {
    const { data: stdData, error: stdErr } = await supabase.from('students').select('*');
    const { data: attData, error: attErr } = await supabase.from('attendances').select('*');
    const { data: clsData } = await supabase.from('classes').select('*');
    const { data: usrData } = await supabase.from('users').select('*');

    if (!stdErr && !attErr) {
      dbConnected = true;
      remoteStudents = stdData || [];
      remoteAttendances = attData || [];
      remoteClasses = clsData || [];
      remoteUsers = usrData || [];
    } else {
      dbErrorStr = stdErr?.message || attErr?.message || 'Gagal query Supabase';
    }
  } catch (err) {
    dbErrorStr = err instanceof Error ? err.message : String(err);
  }

  console.log('%c[2] SUPABASE CLOUD DATABASE:', 'color: #10b981; font-weight: bold;', {
    connected: dbConnected,
    studentsCount: remoteStudents.length,
    classesCount: remoteClasses.length,
    attendancesCount: remoteAttendances.length,
    usersCount: remoteUsers.length,
    error: dbErrorStr
  });

  // 3. Cross-Reference Analysis
  const remoteStudentIds = new Set(remoteStudents.map(s => s.id));
  const remoteAttendanceIds = new Set(remoteAttendances.map(a => a.id));
  const localStudentIds = new Set(localStudents.map(s => s.id));

  // Ghost Students: Students in LocalStorage that do NOT exist in Supabase
  const ghostStudentsInLocal = dbConnected
    ? localStudents.filter(s => !remoteStudentIds.has(s.id)).map(s => `${s.name} (${s.id})`)
    : [];

  // Ghost Attendances: Attendance in LocalStorage that do NOT exist in Supabase
  const ghostAttendancesInLocal = dbConnected
    ? localAttendances.filter(a => !remoteAttendanceIds.has(a.id)).map(a => `${a.studentName} - ${a.date} (${a.id})`)
    : [];

  // Orphan Attendances: Attendance in LocalStorage that reference student IDs missing from both local & cloud
  const orphanAttendancesInLocal = localAttendances
    ? localAttendances.filter(a => !localStudentIds.has(a.studentId) && (!dbConnected || !remoteStudentIds.has(a.studentId)))
        .map(a => `${a.studentName} [Orphan StudentID: ${a.studentId}] (${a.id})`)
    : [];

  const mismatchedStudentCounts = localStudents.length !== remoteStudents.length;

  let analysisMessage = '';
  if (!dbConnected) {
    analysisMessage = `Database Supabase belum terhubung/tabel belum dibuat. LocalStorage menyimpan ${localStudents.length} siswa dan ${localAttendances.length} absensi.`;
  } else if (localStudents.length === 0 && remoteStudents.length === 0) {
    analysisMessage = 'SISTEM BERSIH MURNI: Tidak ada data siswa di LocalStorage maupun Supabase Cloud (0 record).';
  } else if (ghostStudentsInLocal.length > 0 || ghostAttendancesInLocal.length > 0 || orphanAttendancesInLocal.length > 0) {
    analysisMessage = `DIAGNOSIS PERBEDAAN: Ditemukan ${ghostStudentsInLocal.length} ghost siswa di lokal, ${ghostAttendancesInLocal.length} ghost absensi, dan ${orphanAttendancesInLocal.length} absensi yatim (orphan). Gunakan fungsi Purge untuk menyelaraskan!`;
  } else if (mismatchedStudentCounts) {
    analysisMessage = `JUMLAH TIDAK SAMA: LocalStorage memiliki ${localStudents.length} siswa sedangkan Supabase Cloud memiliki ${remoteStudents.length} siswa. Tekan Pull/Push Sync untuk menyelaraskan.`;
  } else {
    analysisMessage = '100% SINKRON: Data LocalStorage dan Supabase Cloud identik dan selaras sempurna.';
  }

  console.log('%c[3] CROSS-REFERENCE ANALYSIS:', 'color: #f59e0b; font-weight: bold;', {
    ghostStudentsCount: ghostStudentsInLocal.length,
    ghostAttendancesCount: ghostAttendancesInLocal.length,
    orphanAttendancesCount: orphanAttendancesInLocal.length,
    mismatchedStudentCounts,
    analysisMessage
  });

  console.groupEnd();

  const report: DiagnosticReport = {
    timestamp: now,
    localState: {
      studentsCount: localStudents.length,
      classesCount: localClasses.length,
      attendancesCount: localAttendances.length,
      usersCount: localUsers.length,
      studentsList: localStudents.map(s => ({ id: s.id, name: s.name, nis: s.nis, classId: s.classId, status: s.status })),
      attendancesList: localAttendances.map(a => ({ id: a.id, studentId: a.studentId, studentName: a.studentName, date: a.date, status: a.status }))
    },
    remoteDatabase: {
      connected: dbConnected,
      studentsCount: remoteStudents.length,
      classesCount: remoteClasses.length,
      attendancesCount: remoteAttendances.length,
      usersCount: remoteUsers.length,
      studentsList: remoteStudents,
      attendancesList: remoteAttendances,
      error: dbErrorStr
    },
    crossReference: {
      ghostStudentsInLocal,
      ghostAttendancesInLocal,
      orphanAttendancesInLocal,
      mismatchedStudentCounts,
      analysisMessage
    }
  };

  return report;
}

export async function purgeGhostRecords(): Promise<{ success: boolean; purgedStudentsCount: number; purgedAttendancesCount: number; message: string }> {
  try {
    const diagnostic = await runStateAndDatabaseDiagnostic();
    let purgedStudentsCount = 0;
    let purgedAttendancesCount = 0;

    if (!diagnostic.remoteDatabase.connected) {
      // If cloud is not connected, purge all local mock students & attendances to clean state
      localStorage.setItem('sman1_lumbung_students', JSON.stringify([]));
      localStorage.setItem('sman1_lumbung_attendances', JSON.stringify([]));
      StorageService.notifyDataChanged();
      return {
        success: true,
        purgedStudentsCount: diagnostic.localState.studentsCount,
        purgedAttendancesCount: diagnostic.localState.attendancesCount,
        message: 'Berhasil membersihkan seluruh record lokal untuk pencapaian state 0 record bersih.'
      };
    }

    // Filter local storage to KEEP ONLY records that exist in Supabase Cloud
    const remoteStudentIds = new Set(diagnostic.remoteDatabase.studentsList.map((s: any) => s.id));
    const remoteAttendanceIds = new Set(diagnostic.remoteDatabase.attendancesList.map((a: any) => a.id));

    const currentLocalStudents = StorageService.getStudents();
    const cleanStudents = currentLocalStudents.filter(s => remoteStudentIds.has(s.id));
    purgedStudentsCount = currentLocalStudents.length - cleanStudents.length;

    const currentLocalAttendances = StorageService.getAttendances();
    const cleanAttendances = currentLocalAttendances.filter(a => remoteAttendanceIds.has(a.id) && remoteStudentIds.has(a.studentId));
    purgedAttendancesCount = currentLocalAttendances.length - cleanAttendances.length;

    localStorage.setItem('sman1_lumbung_students', JSON.stringify(cleanStudents));
    localStorage.setItem('sman1_lumbung_attendances', JSON.stringify(cleanAttendances));
    StorageService.notifyDataChanged();

    return {
      success: true,
      purgedStudentsCount,
      purgedAttendancesCount,
      message: `Berhasil membersihkan ${purgedStudentsCount} ghost siswa dan ${purgedAttendancesCount} ghost absensi dari LocalStorage.`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      purgedStudentsCount: 0,
      purgedAttendancesCount: 0,
      message: `Gagal membersihkan ghost records: ${msg}`
    };
  }
}

// Expose diagnostic tool globally on window for developer/console usage
if (typeof window !== 'undefined') {
  (window as any).runStateAndDatabaseDiagnostic = runStateAndDatabaseDiagnostic;
  (window as any).purgeGhostRecords = purgeGhostRecords;
}


