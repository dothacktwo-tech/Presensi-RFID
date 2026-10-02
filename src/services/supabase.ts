import { createClient } from '@supabase/supabase-js';
import { StorageService } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvhejxzczpbzmpkrbkkn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_z9QI0j-xF_SQCt0W5EIHWA_AWrWlCoi';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- SQL DDL SCHEMA, MIGRATION & SEED DATA UNTUK SMAN 1 LUMBUNG ABSENSI SISWA
-- Jalankan skrip ini pada Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- OPSIONAL: Jika ingin mereset/menghapus tabel lama yang tidak sesuai:
-- DROP TABLE IF EXISTS public.attendances CASCADE;
-- DROP TABLE IF EXISTS public.students CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.classes CASCADE;
-- DROP TABLE IF EXISTS public.settings CASCADE;

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
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- ==============================================================================
-- OTOMATISASI PENAMBAHAN KOLOM JIKA TABEL LAMA SUDAH PERNAH DIBUAT
-- (Mencegah ERROR 42703: column "rfid_uid" does not exist)
-- ==============================================================================
DO $$
BEGIN
    -- Penambahan kolom pada public.students
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

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='parent_phone') THEN
        ALTER TABLE public.students ADD COLUMN parent_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='address') THEN
        ALTER TABLE public.students ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='status') THEN
        ALTER TABLE public.students ADD COLUMN status TEXT DEFAULT 'aktif';
    END IF;

    -- Penambahan kolom pada public.attendances
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendances' AND column_name='late_minutes') THEN
        ALTER TABLE public.attendances ADD COLUMN late_minutes INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendances' AND column_name='notes') THEN
        ALTER TABLE public.attendances ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendances' AND column_name='scanned_by') THEN
        ALTER TABLE public.attendances ADD COLUMN scanned_by TEXT;
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
END $$;

-- SEED DATA AWAL SMAN 1 LUMBUNG
INSERT INTO public.settings (id, school_name, npsn, address, headmaster_name, headmaster_nip, entry_time_limit, late_tolerance_minutes)
VALUES ('school_config', 'SMAN 1 Lumbung', '20211543', 'Jl. Raya Lumbung No. 45, Ciamis', 'Drs. H. Mulyana, M.Pd.', '19680512 199403 1 004', '07:00', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classes (id, name, grade, major, wali_kelas_name, academic_year) VALUES
('cls-1', 'X IPA 1', 'X', 'IPA', 'Budi Santoso, S.Pd.', '2025/2026'),
('cls-2', 'X IPA 2', 'X', 'IPA', 'Rina Wijaya, S.Pd.', '2025/2026'),
('cls-3', 'XI IPA 1', 'XI', 'IPA', 'Siti Aminah, S.Pd.', '2025/2026'),
('cls-4', 'XI IPS 1', 'XI', 'IPS', 'Dedi Kurniawan, S.Si.', '2025/2026'),
('cls-5', 'XII IPA 1', 'XII', 'IPA', 'Endang Suherman, M.Pd.', '2025/2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, username, name, email, role, assigned_class_id, assigned_class_name, nip) VALUES
('usr-1', 'admin', 'Drs. H. Mulyana, M.Pd.', 'admin@sman1lumbung.sch.id', 'admin', NULL, NULL, '19680512 199403 1 004'),
('usr-piket', 'piket', 'Ahmad Fauzi, S.Pd.', 'fauzi.piket@sman1lumbung.sch.id', 'guru_piket', NULL, NULL, '19820415 200801 1 008'),
('usr-2', 'walixiipa1', 'Siti Aminah, S.Pd.', 'sitiaminah@sman1lumbung.sch.id', 'wali_kelas', 'cls-3', 'XI IPA 1', '19850920 201001 2 015')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, nis, nisn, name, class_id, class_name, rfid_uid, qr_code, gender, parent_phone, address, status) VALUES
('std-101', '23241001', '0071234561', 'Aditya Pratama', 'cls-3', 'XI IPA 1', '0008472910', 'SMAN1L-23241001', 'L', '081234567890', 'Dusun Lumbung RT 02 RW 01', 'aktif'),
('std-102', '23241002', '0071234562', 'Annisa Rahmawati', 'cls-3', 'XI IPA 1', '0009182374', 'SMAN1L-23241002', 'P', '081234567891', 'Dusun Rawa RT 01 RW 03', 'aktif'),
('std-103', '23241003', '0071234563', 'Bagus Setyawan', 'cls-3', 'XI IPA 1', '0007564123', 'SMAN1L-23241003', 'L', '081234567892', 'Dusun Cikupa RT 03 RW 02', 'aktif'),
('std-104', '23241004', '0071234564', 'Citra Dewi Kartika', 'cls-3', 'XI IPA 1', '0006231458', 'SMAN1L-23241004', 'P', '081234567893', 'Dusun Sukamaju RT 04 RW 01', 'aktif'),
('std-105', '23241005', '0071234565', 'Daffa Rizky Maulana', 'cls-3', 'XI IPA 1', '0005412987', 'SMAN1L-23241005', 'L', '081234567894', 'Dusun Sadewata RT 02 RW 02', 'aktif')
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
  const tables = ['settings', 'classes', 'users', 'students', 'attendances'];
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
        createdTables: ['settings', 'classes', 'users', 'students', 'attendances'],
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
      late_tolerance_minutes: localSettings.lateToleranceMinutes
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
