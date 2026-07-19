import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  preferredCurrency?: string;
  avatarUrl?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<
    | { mfaRequired: false }
    | { mfaRequired: true; mfaToken: string; emailHint: string }
  >;
  verifyLoginOtp: (mfaToken: string, code: string) => Promise<void>;
  resendLoginOtp: (mfaToken: string) => Promise<string>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
    country?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: AuthUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{
      token?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      mfaToken?: string;
      emailHint?: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.mfaRequired && data.mfaToken) {
      return {
        mfaRequired: true as const,
        mfaToken: data.mfaToken,
        emailHint: data.emailHint || email,
      };
    }

    if (!data.token || !data.user) {
      throw new Error("Connexion impossible");
    }
    await setToken(data.token);
    setUser(data.user);
    return { mfaRequired: false as const };
  }, []);

  const verifyLoginOtp = useCallback(
    async (mfaToken: string, code: string) => {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/login/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ mfaToken, code }),
        }
      );
      await setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const resendLoginOtp = useCallback(async (mfaToken: string) => {
    const data = await api<{ emailHint?: string }>(
      "/api/auth/login/resend-otp",
      {
        method: "POST",
        body: JSON.stringify({ mfaToken }),
      }
    );
    return data.emailHint || "";
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      role?: string;
      country?: string;
    }) => {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
      await setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      verifyLoginOtp,
      resendLoginOtp,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, verifyLoginOtp, resendLoginOtp, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
