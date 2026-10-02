import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  login: (username: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isGuruPiket: boolean;
  isWaliKelas: boolean;
  hasAccessToClass: (classId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    StorageService.init();
    const users = StorageService.getUsers();
    // Default logged in user as Admin or load from session
    const savedUser = localStorage.getItem('sman1_active_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else if (users.length > 0) {
      setCurrentUser(users[0]); // Default Drs. H. Mulyana (Admin)
    }
  }, []);

  const switchRole = (role: UserRole) => {
    const users = StorageService.getUsers();
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      localStorage.setItem('sman1_active_user', JSON.stringify(targetUser));
    }
  };

  const login = (username: string): boolean => {
    const users = StorageService.getUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('sman1_active_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sman1_active_user');
  };

  const isAdmin = currentUser?.role === 'admin';
  const isGuruPiket = currentUser?.role === 'guru_piket' || isAdmin;
  const isWaliKelas = currentUser?.role === 'wali_kelas';

  const hasAccessToClass = (classId: string): boolean => {
    if (isAdmin || isGuruPiket) return true;
    if (isWaliKelas && currentUser?.assignedClassId) {
      return currentUser.assignedClassId === classId;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        login,
        logout,
        isAdmin,
        isGuruPiket,
        isWaliKelas,
        hasAccessToClass
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
