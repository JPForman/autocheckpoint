import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getApiErrorMessage } from '../lib/api';
import type { User } from '../types';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      try {
        await api.post('/auth/refresh');
        const { data } = await api.get<{ user: User }>('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
      setUser(data.user);
      return data.user;
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Login failed');
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) => {
      setError(null);
      try {
        const { data: res } = await api.post<{ user: User }>('/auth/register', data);
        setUser(res.user);
        return res.user;
      } catch (e) {
        const msg = getApiErrorMessage(e, 'Registration failed');
        setError(msg);
        throw new Error(msg);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      refreshUser,
      login,
      register,
      logout,
    }),
    [user, loading, error, refreshUser, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
