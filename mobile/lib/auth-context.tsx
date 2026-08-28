import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, getToken, setToken } from "@/lib/api";
import { googleAuthSessionUrls } from "@/lib/google-auth-url";
import { registerPushToken, unregisterPushToken } from "@/lib/push";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  preferredCurrency?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  kycStatus?: string;
  kycRequired?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
};

export type GoogleAuthPayload =
  | { idToken: string }
  | { code: string; codeVerifier: string; redirectUri: string };

type PhoneOtpStart = {
  mfaToken: string;
  phoneHint: string;
  isNew: boolean;
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
  requestPhoneOtp: (phone: string, country: string) => Promise<PhoneOtpStart>;
  verifyPhoneOtp: (
    mfaToken: string,
    code: string,
    displayName?: string
  ) => Promise<void>;
  resendPhoneOtp: (
    mfaToken: string
  ) => Promise<{ mfaToken?: string; phoneHint?: string }>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
    country?: string;
  }) => Promise<void>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<
    | { mfaRequired: false }
    | { mfaRequired: true; mfaToken: string; emailHint: string }
  >;
  finishGoogleTicket: (ticket: string) => Promise<
    | { mfaRequired: false }
    | { mfaRequired: true; mfaToken: string; emailHint: string }
  >;
  applyGooglePoll: (
    sid: string
  ) => Promise<
    | { pending: true }
    | { pending: false; error: string }
    | { pending: false; mfaRequired: true; mfaToken: string; emailHint: string }
    | { pending: false; mfaRequired: false }
  >;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionGen = useRef(0);

  const applySession = useCallback(async (token: string, nextUser: AuthUser) => {
    const gen = sessionGen.current;
    await setToken(token);
    if (gen !== sessionGen.current) return;
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    const gen = sessionGen.current;
    const token = await getToken();
    if (!token) {
      if (gen === sessionGen.current) {
        setUser(null);
        setLoading(false);
      }
      return;
    }
    try {
      const data = await api<{ user: AuthUser | null }>("/api/auth/me");
      if (gen !== sessionGen.current) return;
      setUser(data.user);
    } catch {
      if (gen !== sessionGen.current) return;
      await setToken(null);
      setUser(null);
    } finally {
      if (gen === sessionGen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (user) void registerPushToken();
  }, [user]);

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
    await applySession(data.token, data.user);
    return { mfaRequired: false as const };
  }, [applySession]);

  const verifyLoginOtp = useCallback(
    async (mfaToken: string, code: string) => {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/login/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({ mfaToken, code }),
        }
      );
      await applySession(data.token, data.user);
    },
    [applySession]
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

  const requestPhoneOtp = useCallback(async (phone: string, country: string) => {
    const data = await api<{
      mfaToken: string;
      phoneHint?: string;
      isNew?: boolean;
    }>("/api/auth/phone/request", {
      method: "POST",
      body: JSON.stringify({ phone, country }),
    });
    return {
      mfaToken: data.mfaToken,
      phoneHint: data.phoneHint || phone,
      isNew: Boolean(data.isNew),
    };
  }, []);

  const verifyPhoneOtp = useCallback(
    async (mfaToken: string, code: string, displayName?: string) => {
      const data = await api<{ token: string; user: AuthUser }>(
        "/api/auth/phone/verify",
        {
          method: "POST",
          body: JSON.stringify({
            mfaToken,
            code,
            displayName: displayName || undefined,
            role: "BOTH",
          }),
        }
      );
      await applySession(data.token, data.user);
    },
    [applySession]
  );

  const resendPhoneOtp = useCallback(async (mfaToken: string) => {
    return api<{ mfaToken?: string; phoneHint?: string }>(
      "/api/auth/phone/resend",
      {
        method: "POST",
        body: JSON.stringify({ mfaToken }),
      }
    );
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
      await applySession(data.token, data.user);
    },
    [applySession]
  );

  const loginWithGoogle = useCallback(async (payload: GoogleAuthPayload) => {
    const data = await api<{
      token?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      mfaToken?: string;
      emailHint?: string;
    }>("/api/auth/google/mobile", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data.mfaRequired && data.mfaToken) {
      return {
        mfaRequired: true as const,
        mfaToken: data.mfaToken,
        emailHint: data.emailHint || "",
      };
    }

    if (!data.token || !data.user) {
      throw new Error("Connexion Google impossible");
    }
    await applySession(data.token, data.user);
    return { mfaRequired: false as const };
  }, [applySession]);

  const finishGoogleTicket = useCallback(async (ticket: string) => {
    const data = await api<{
      token?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      mfaToken?: string;
      emailHint?: string;
    }>("/api/auth/google/mobile", {
      method: "POST",
      body: JSON.stringify({ ticket }),
    });

    if (data.mfaRequired && data.mfaToken) {
      return {
        mfaRequired: true as const,
        mfaToken: data.mfaToken,
        emailHint: data.emailHint || "",
      };
    }

    if (!data.token || !data.user) {
      throw new Error("Connexion Google impossible");
    }
    await applySession(data.token, data.user);
    return { mfaRequired: false as const };
  }, [applySession]);

  const applyGooglePoll = useCallback(async (sid: string) => {
    const { poll } = googleAuthSessionUrls();
    const res = await fetch(`${poll}?sid=${encodeURIComponent(sid)}`);
    const data = (await res.json().catch(() => ({}))) as {
      pending?: boolean;
      error?: string;
      token?: string;
      user?: AuthUser;
      mfaRequired?: boolean;
      mfaToken?: string;
      emailHint?: string;
    };
    if (data.pending || (!data.error && !data.token && !data.mfaToken)) {
      return { pending: true as const };
    }
    if (data.error) {
      return { pending: false as const, error: data.error };
    }
    if (data.mfaRequired && data.mfaToken) {
      return {
        pending: false as const,
        mfaRequired: true as const,
        mfaToken: data.mfaToken,
        emailHint: data.emailHint || "",
      };
    }
    if (!data.token || !data.user) {
      return { pending: false as const, error: "Connexion Google impossible" };
    }
    await applySession(data.token, data.user);
    return { pending: false as const, mfaRequired: false as const };
  }, [applySession]);

  const logout = useCallback(async () => {
    sessionGen.current += 1;
    setUser(null);
    setLoading(false);
    try {
      await Promise.race([
        unregisterPushToken(),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      /* Expo Go has no push token */
    }
    try {
      await setToken(null);
    } catch {
      /* still logged out in memory */
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      verifyLoginOtp,
      resendLoginOtp,
      requestPhoneOtp,
      verifyPhoneOtp,
      resendPhoneOtp,
      register,
      loginWithGoogle,
      finishGoogleTicket,
      applyGooglePoll,
      logout,
      refresh,
    }),
    [user, loading, login, verifyLoginOtp, resendLoginOtp, requestPhoneOtp, verifyPhoneOtp, resendPhoneOtp, register, loginWithGoogle, finishGoogleTicket, applyGooglePoll, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
