import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService } from '../services/storage';
import {
  supabase,
  pullFromSupabase,
  runStateAndDatabaseDiagnostic,
  purgeGhostRecords,
  DiagnosticReport
} from '../services/supabase';
import {
  Student,
  StudentClass,
  AttendanceRecord,
  User,
  SchoolSettings,
  RolePermissionsMap
} from '../types';

export interface DiagnosticSummary {
  timestamp: string;
  localStudentsCount: number;
  remoteStudentsCount: number;
  activeStudentsCount: number;
  classesCount: number;
  attendancesCount: number;
  isConsistent: boolean;
  ghostStudentsCount: number;
  message: string;
}

export interface UseSyncDataReturn {
  // Core Data
  students: Student[];
  classes: StudentClass[];
  attendances: AttendanceRecord[];
  users: User[];
  settings: SchoolSettings;
  rolePermissions: RolePermissionsMap;
  lockedDates: string[];
  unlockedDates: string[];

  // Sync State
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  diagnosticSummary: DiagnosticSummary | null;

  // Actions
  syncData: (forceRemote?: boolean) => Promise<void>;
  refetchLocal: () => void;
  refetchRemote: () => Promise<void>;
  runDiagnostics: () => Promise<DiagnosticReport>;
  purgeGhosts: () => Promise<{ success: boolean; purgedStudentsCount: number; purgedAttendancesCount: number; message: string }>;

  // Scoped Helpers
  getDisplayedStudents: (role?: string, assignedClassId?: string) => Student[];
  getDisplayedAttendances: (role?: string, assignedClassId?: string) => AttendanceRecord[];
  getDisplayedClasses: (role?: string, assignedClassId?: string) => StudentClass[];
}

/**
 * useSyncData Custom Hook
 * 
 * Provides unified, synchronous, and reactive data fetching across components.
 * Automatically aligns local state with Supabase Cloud records, listens to mutations,
 * and logs real-time diagnostics to pinpoint inconsistencies in student counts.
 */
export function useSyncData(options: { autoFetchRemoteOnMount?: boolean; enableLogging?: boolean } = {}): UseSyncDataReturn {
  const { autoFetchRemoteOnMount = true, enableLogging = true } = options;

  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [classes, setClasses] = useState<StudentClass[]>(() => StorageService.getClasses());
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => StorageService.getAttendances());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [settings, setSettings] = useState<SchoolSettings>(() => StorageService.getSettings());
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(() => StorageService.getRolePermissions());
  const [lockedDates, setLockedDates] = useState<string[]>(() => StorageService.getLockedDates());
  const [unlockedDates, setUnlockedDates] = useState<string[]>(() => StorageService.getUnlockedDates());

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [diagnosticSummary, setDiagnosticSummary] = useState<DiagnosticSummary | null>(null);

  const isMountedRef = useRef(true);

  // Synchronous Local Refetch
  const refetchLocal = useCallback(() => {
    StorageService.init();
    const st = StorageService.getStudents();
    const cl = StorageService.getClasses();
    const at = StorageService.getAttendances();
    const us = StorageService.getUsers();
    const se = StorageService.getSettings();
    const rp = StorageService.getRolePermissions();
    const ld = StorageService.getLockedDates();
    const ud = StorageService.getUnlockedDates();

    if (isMountedRef.current) {
      setStudents(st);
      setClasses(cl);
      setAttendances(at);
      setUsers(us);
      setSettings(se);
      setRolePermissions(rp);
      setLockedDates(ld);
      setUnlockedDates(ud);
    }

    return { st, cl, at, us };
  }, []);

  // Diagnostic Logger for pinpointing inconsistencies in student counts
  const logStudentCountDiagnostic = useCallback((localSt: Student[], remoteSt: any[] | null) => {
    if (!enableLogging) return;

    const activeLocal = localSt.filter(s => s.status === 'aktif').length;
    const remoteCount = remoteSt ? remoteSt.length : -1;
    const isConsistent = remoteSt === null || localSt.length === remoteCount;

    const summary: DiagnosticSummary = {
      timestamp: new Date().toLocaleTimeString(),
      localStudentsCount: localSt.length,
      remoteStudentsCount: remoteCount >= 0 ? remoteCount : localSt.length,
      activeStudentsCount: activeLocal,
      classesCount: StorageService.getClasses().length,
      attendancesCount: StorageService.getAttendances().length,
      isConsistent,
      ghostStudentsCount: remoteSt !== null ? Math.max(0, localSt.length - remoteCount) : 0,
      message: isConsistent
        ? `[OK] State Sinkron: ${localSt.length} siswa total (${activeLocal} aktif)`
        : `[MISMATCH] LocalStorage: ${localSt.length} vs Supabase: ${remoteCount} siswa`
    };

    setDiagnosticSummary(summary);

    console.groupCollapsed(`📊 [useSyncData Diagnostic] Student Parity Check @ ${summary.timestamp}`);
    console.info(`Local Students: ${localSt.length} (${activeLocal} active)`);
    if (remoteSt !== null) {
      console.info(`Supabase Cloud Students: ${remoteSt.length}`);
      console.info(`Status Parity: ${isConsistent ? '✅ CONSISTENT' : '⚠️ MISMATCH DETECTED'}`);
    }
    console.groupEnd();
  }, [enableLogging]);

  // Comprehensive Sync from Supabase and Local
  const syncData = useCallback(async (forceRemote: boolean = true) => {
    setIsSyncing(true);
    setError(null);

    // 1. Immediately force local synchronous refresh
    const local = refetchLocal();

    // 2. Fetch and synchronize remote database if requested
    if (forceRemote) {
      try {
        const result = await pullFromSupabase();
        if (isMountedRef.current) {
          refetchLocal();
          setLastSyncTime(new Date());

          // Cross-reference query for students
          const { data: dbStudents } = await supabase.from('students').select('id, status');
          logStudentCountDiagnostic(StorageService.getStudents(), dbStudents || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isMountedRef.current) {
          setError(`Gagal sinkronisasi data remote: ${msg}`);
          console.warn('[useSyncData] Remote sync warning:', msg);
          logStudentCountDiagnostic(local.st, null);
        }
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    } else {
      logStudentCountDiagnostic(local.st, null);
      setIsSyncing(false);
    }
  }, [refetchLocal, logStudentCountDiagnostic]);

  const refetchRemote = useCallback(async () => {
    await syncData(true);
  }, [syncData]);

  const runDiagnostics = useCallback(async () => {
    return await runStateAndDatabaseDiagnostic();
  }, []);

  const purgeGhosts = useCallback(async () => {
    const res = await purgeGhostRecords();
    refetchLocal();
    await syncData(true);
    return res;
  }, [refetchLocal, syncData]);

  // Scoped Display Helpers (Role Based Filter)
  const getDisplayedStudents = useCallback((role?: string, assignedClassId?: string): Student[] => {
    if (role === 'wali_kelas' && assignedClassId) {
      return students.filter(s => s.classId === assignedClassId);
    }
    return students;
  }, [students]);

  const getDisplayedAttendances = useCallback((role?: string, assignedClassId?: string): AttendanceRecord[] => {
    if (role === 'wali_kelas' && assignedClassId) {
      return attendances.filter(a => a.classId === assignedClassId);
    }
    return attendances;
  }, [attendances]);

  const getDisplayedClasses = useCallback((role?: string, assignedClassId?: string): StudentClass[] => {
    if (role === 'wali_kelas' && assignedClassId) {
      return classes.filter(c => c.id === assignedClassId);
    }
    return classes;
  }, [classes]);

  // Lifecycle & Reactive Event Subscriptions
  useEffect(() => {
    isMountedRef.current = true;

    // Initial synchronous load
    refetchLocal();

    // Auto fetch from remote on mount if enabled
    if (autoFetchRemoteOnMount) {
      syncData(true);
    }

    // Reactive listener for any local / remote mutation events
    const handleMutationEvent = () => {
      refetchLocal();
    };

    window.addEventListener('sman1_data_updated', handleMutationEvent);
    window.addEventListener('storage', handleMutationEvent);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('sman1_data_updated', handleMutationEvent);
      window.removeEventListener('storage', handleMutationEvent);
    };
  }, [autoFetchRemoteOnMount, refetchLocal, syncData]);

  return {
    students,
    classes,
    attendances,
    users,
    settings,
    rolePermissions,
    lockedDates,
    unlockedDates,
    isLoading,
    isSyncing,
    error,
    lastSyncTime,
    diagnosticSummary,
    syncData,
    refetchLocal,
    refetchRemote,
    runDiagnostics,
    purgeGhosts,
    getDisplayedStudents,
    getDisplayedAttendances,
    getDisplayedClasses
  };
}
