import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, setAuthToken, setCompatAuth, merchant } from '@/lib/api';
import type { MerchantProfile } from '@/types/domain';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  profile: MerchantProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const { profile: p } = await merchant.getMyProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await authApi.session();
        if (session) {
          setUserId(session.user_id);
          setEmail(session.email);
          setCompatAuth(session.user_id, session.email);
          await refreshProfile();
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setAuthToken(result.token);
    setUserId(result.user_id);
    setEmail(email);
    setCompatAuth(result.user_id, email);
    await refreshProfile();
  }, [refreshProfile]);

  const signup = useCallback(async (email: string, password: string) => {
    await authApi.signup(email, password);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    setAuthToken(null);
    setUserId(null);
    setEmail(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoading,
      isAuthenticated: !!userId,
      userId,
      email,
      profile,
      login,
      signup,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
