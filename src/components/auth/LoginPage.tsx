import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { hashPassword } from '../../utils/cryptoUtils';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Standalone SQL script for password column & SHA-256 password hashing
  const PASSWORD_SQL_SCRIPT = `-- ==============================================================================
-- SQL MIGRATION: MENAMBAHKAN KOLOM PASSWORD & HASHING SHA-256 DI SUPABASE
-- Jalankan skrip ini pada Supabase SQL Editor jika kolom password belum ada
-- ==============================================================================

-- 1. Tambahkan kolom password_hash jika belum tersedia
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- 2. Update default password hash (SHA-256) untuk akun bawaan:
-- Admin (password: admin123) -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- Guru Piket (password: piket123) -> a93b4d458c9735d4653e05a8f94d13712d989f55e378c772cb83a45c331165dc
-- Wali Kelas (password: wali123) -> 268db4da6ebbf0f6a2b8e3ad5bcf7047f3b6a9394f7247fb459df95171732551

UPDATE public.users 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' 
WHERE username = 'admin' AND (password_hash IS NULL OR password_hash = '');

UPDATE public.users 
SET password_hash = 'a93b4d458c9735d4653e05a8f94d13712d989f55e378c772cb83a45c331165dc' 
WHERE username = 'piket' AND (password_hash IS NULL OR password_hash = '');

UPDATE public.users 
SET password_hash = '268db4da6ebbf0f6a2b8e3ad5bcf7047f3b6a9394f7247fb459df95171732551' 
WHERE role = 'wali_kelas' AND (password_hash IS NULL OR password_hash = '');
`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Silakan masukkan username akun Anda.');
      return;
    }

    if (!password) {
      setErrorMessage('Silakan masukkan password akun Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate minor authentication latency for smooth feeling
      await new Promise(r => setTimeout(r, 400));
      const success = await login(cleanUsername, password, rememberMe);

      if (!success) {
        setErrorMessage('Username atau password salah. Silakan periksa kembali!');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Terjadi kendala saat proses masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage('');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(PASSWORD_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-600 selection:text-white">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Branding Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">SMAN 1 LUMBUNG</span>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Sistem Absensi Digital
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Portal Masuk Terpadu Tenaga Pendidik & Kependidikan</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSqlModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-all shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Skrip SQL Password</span>
        </button>
      </header>

      {/* Center Login Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-1">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Selamat Datang</h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Silakan masukkan username dan kata sandi Anda untuk mengakses dashboard presensi.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Username Akun <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin / piket / walixiipa1"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Kata Sandi / Password <span className="text-indigo-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Enkripsi SHA-256</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-10 pr-11 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 p-0.5 rounded-lg transition-colors"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-lg bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Ingat sesi login saya</span>
              </label>

              <span className="text-[11px] text-indigo-400/80 font-medium">SMAN 1 Lumbung</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem Presensi</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Login Account Pills for Convenience */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pilihan Akun Cepat (Akses Demo):</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all group"
              >
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Admin</span>
                <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-white">admin</span>
                <span className="text-[10px] text-slate-400 font-mono block">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('piket', 'piket123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all group"
              >
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Guru Piket</span>
                <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-white">piket</span>
                <span className="text-[10px] text-slate-400 font-mono block">piket123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('walixiipa1', 'wali123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all group"
              >
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Wali Kelas</span>
                <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-white">walixiipa1</span>
                <span className="text-[10px] text-slate-400 font-mono block">wali123</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/50 text-center text-xs text-slate-500 relative z-10">
        SMAN 1 Lumbung • Sistem Absensi Siswa Digital RFID & QR Code • All Rights Reserved
      </footer>

      {/* SQL Script Helper Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Skrip SQL Kolom Password & Hashing SHA-256</h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Jika tabel <code className="text-indigo-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">public.users</code> di Supabase belum memiliki kolom <code className="text-indigo-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">password_hash</code>, salin dan jalankan skrip DDL SQL berikut di SQL Editor Supabase:
            </p>

            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-72 leading-relaxed">
                {PASSWORD_SQL_SCRIPT}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
