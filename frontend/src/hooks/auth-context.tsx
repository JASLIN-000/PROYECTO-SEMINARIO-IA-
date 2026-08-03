/* oxlint-disable react/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, LoginPayload } from '@/types/auth';
import { login as loginService, logout as logoutService } from '@/services/auth.service';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_USER_KEY = 'auth:user';
const STORAGE_TOKEN_KEY = 'auth:token';
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
  const [token, setToken] = useState<string | null>(() => {
    const raw = localStorage.getItem(STORAGE_TOKEN_KEY);
    return raw?.trim() ? raw : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && token),
      async login(payload) {
        const response = await loginService(payload);
        setUser(response.tecnico);
        setToken(response.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.tecnico));
        localStorage.setItem(STORAGE_TOKEN_KEY, response.token);
        localStorage.setItem(STORAGE_ROUTE_KEY, response.tecnico.rutaNumero);
      },
      async logout() {
        if (token) {
          try {
            await logoutService();
          } catch {
            // Even if server-side revocation fails, local cleanup must continue.
          }
        }

        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_USER_KEY);
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_ROUTE_KEY);
      },
    }),
    [token, user],
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
