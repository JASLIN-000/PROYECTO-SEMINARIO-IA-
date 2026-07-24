/* oxlint-disable react/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, LoginPayload } from '@/types/auth';
import { login as loginService } from '@/services/auth.service';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const STORAGE_USER_KEY = 'auth:user';
const STORAGE_ROUTE_KEY = 'rutaNumero';

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser() {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      async login(payload) {
        const response = await loginService(payload);
        setUser(response.tecnico);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.tecnico));
        localStorage.setItem(STORAGE_ROUTE_KEY, response.tecnico.rutaNumero);
      },
      logout() {
        setUser(null);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_ROUTE_KEY);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
