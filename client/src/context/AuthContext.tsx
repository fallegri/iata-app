import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface AuthTeacher {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  teacher: AuthTeacher | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, teacher: AuthTeacher) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'iata_token';
const TEACHER_KEY = 'iata_teacher';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const teacherJson = localStorage.getItem(TEACHER_KEY);
    if (token && teacherJson) {
      try {
        const teacher = JSON.parse(teacherJson) as AuthTeacher;
        return { token, teacher, isAuthenticated: true, isLoading: false };
      } catch {
        // Invalid stored data, reset
      }
    }
    return { token: null, teacher: null, isAuthenticated: false, isLoading: false };
  });

  const login = useCallback((token: string, teacher: AuthTeacher) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
    setState({ token, teacher, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TEACHER_KEY);
    setState({ token: null, teacher: null, isAuthenticated: false, isLoading: false });
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setState({ token: null, teacher: null, isAuthenticated: false, isLoading: false });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
