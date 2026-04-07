import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE_URL } from "@/config";

const TOKEN_KEY = "neonlink_session_token";

export type ContactVisibility = "private" | "workspace" | "public";

export type PresenceKind = "online" | "away" | "busy" | "offline" | "on_call";

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  contactEmail: string;
  phoneDigits?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVisibility: ContactVisibility;
  phoneVisibility: ContactVisibility;
  status: PresenceKind;
  statusBySection: Record<string, PresenceKind>;
  bio: string;
  statusMessage: string;
  friendCode: string;
  avatarUrl?: string | null;
  /** Hex #RRGGBB oder null = Standardfarbe im Chat */
  chatTextColor: string | null;
};

export type ProfilePatch = Partial<{
  displayName: string;
  bio: string;
  statusMessage: string;
  status: PresenceKind;
  statusBySection: Record<string, PresenceKind>;
  contactEmail: string;
  emailVisibility: ContactVisibility;
  phoneVisibility: ContactVisibility;
  phone: string;
  avatarUrl: string | null;
  chatTextColor: string | null;
}>;

function normalizeAuthUser(raw: Record<string, unknown>): AuthUser {
  const status = String(raw.status ?? "offline");
  const st = ["online", "away", "busy", "offline", "on_call"].includes(status) ? (status as PresenceKind) : "offline";
  const email = String(raw.email ?? "");
  return {
    id: String(raw.id ?? ""),
    displayName: String(raw.displayName ?? ""),
    email,
    contactEmail: String(raw.contactEmail ?? email),
    phoneDigits: raw.phoneDigits != null ? String(raw.phoneDigits) : undefined,
    emailVerified: Boolean(raw.emailVerified),
    phoneVerified: Boolean(raw.phoneVerified),
    emailVisibility: (["private", "workspace", "public"].includes(String(raw.emailVisibility))
      ? raw.emailVisibility
      : "workspace") as ContactVisibility,
    phoneVisibility: (["private", "workspace", "public"].includes(String(raw.phoneVisibility))
      ? raw.phoneVisibility
      : "workspace") as ContactVisibility,
    status: st,
    statusBySection: (raw.statusBySection && typeof raw.statusBySection === "object"
      ? raw.statusBySection
      : {}) as Record<string, PresenceKind>,
    bio: String(raw.bio ?? ""),
    statusMessage: String(raw.statusMessage ?? ""),
    friendCode: String(raw.friendCode ?? ""),
    avatarUrl: raw.avatarUrl === null || raw.avatarUrl === undefined ? null : String(raw.avatarUrl),
    chatTextColor: (() => {
      const c = raw.chatTextColor;
      if (c === null || c === undefined || c === "") return null;
      const s = String(c).trim();
      return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : null;
    })(),
  };
}

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  setAvatar: (avatarDataUrl: string | null) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  startEmailVerification: () => Promise<{ demoHint?: string; sent?: boolean }>;
  confirmEmailVerification: (code: string) => Promise<void>;
  startPhoneVerification: () => Promise<{ demoHint?: string }>;
  confirmPhoneVerification: (code: string) => Promise<void>;
  regenerateFriendCode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const fromSession = sessionStorage.getItem(TOKEN_KEY);
    if (fromSession) return fromSession;
    // Migrate away from persistent login on shared PCs.
    const fromLocal = localStorage.getItem(TOKEN_KEY);
    if (fromLocal) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const authFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
        headers.set("Content-Type", "application/json");
      }
      return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!token) {
        setUser(null);
        setReady(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          sessionStorage.removeItem(TOKEN_KEY);
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
        } else {
          const data = (await res.json()) as Record<string, unknown>;
          if (!cancelled) setUser(normalizeAuthUser(data));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
    } catch {
      throw new Error("network_error");
    }
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new Error(res.ok ? "invalid_response" : "login_failed");
    }
    if (!res.ok) {
      const err = payload as { error?: string };
      throw new Error(typeof err.error === "string" && err.error ? err.error : "login_failed");
    }
    const data = payload as { token?: string; user?: Record<string, unknown> };
    if (!data.token || !data.user) {
      throw new Error("invalid_response");
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(normalizeAuthUser(data.user));
  }, []);

  const register = useCallback(async (displayName: string, email: string, password: string, phone: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
        }),
      });
    } catch {
      throw new Error("network_error");
    }
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new Error(res.ok ? "invalid_response" : "register_failed");
    }
    if (!res.ok) {
      const err = payload as { error?: string };
      throw new Error(typeof err.error === "string" && err.error ? err.error : "register_failed");
    }
    // Registration is successful, but no automatic login.
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        });
      } catch {
        // ignorieren
      }
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const setAvatar = useCallback(
    async (avatarDataUrl: string | null) => {
      const res = await authFetch("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: avatarDataUrl }),
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        throw new Error("unauthorized");
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "avatar_update_failed");
      }
      const next = (await res.json()) as Record<string, unknown>;
      setUser(normalizeAuthUser(next));
    },
    [authFetch]
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const res = await authFetch("/auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        throw new Error("unauthorized");
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "profile_update_failed");
      }
      const next = (await res.json()) as Record<string, unknown>;
      setUser(normalizeAuthUser(next));
    },
    [authFetch]
  );

  const startEmailVerification = useCallback(async () => {
    const res = await authFetch("/auth/me/verify/email/start", { method: "POST" });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "verify_start_failed");
    }
    return (await res.json()) as { demoHint?: string; sent?: boolean };
  }, [authFetch]);

  const confirmEmailVerification = useCallback(
    async (code: string) => {
      const res = await authFetch("/auth/me/verify/email/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "verify_confirm_failed");
      }
      const next = (await res.json()) as Record<string, unknown>;
      setUser(normalizeAuthUser(next));
    },
    [authFetch]
  );

  const startPhoneVerification = useCallback(async () => {
    const res = await authFetch("/auth/me/verify/phone/start", { method: "POST" });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "verify_start_failed");
    }
    return (await res.json()) as { demoHint?: string };
  }, [authFetch]);

  const confirmPhoneVerification = useCallback(
    async (code: string) => {
      const res = await authFetch("/auth/me/verify/phone/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "verify_confirm_failed");
      }
      const next = (await res.json()) as Record<string, unknown>;
      setUser(normalizeAuthUser(next));
    },
    [authFetch]
  );

  const regenerateFriendCode = useCallback(async () => {
    const res = await authFetch("/auth/me/friend-code/regenerate", { method: "POST" });
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "friend_code_regenerate_failed");
    }
    const next = (await res.json()) as Record<string, unknown>;
    setUser(normalizeAuthUser(next));
  }, [authFetch]);

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      login,
      register,
      logout,
      authFetch,
      setAvatar,
      updateProfile,
      startEmailVerification,
      confirmEmailVerification,
      startPhoneVerification,
      confirmPhoneVerification,
      regenerateFriendCode,
    }),
    [
      token,
      user,
      ready,
      login,
      register,
      logout,
      authFetch,
      setAvatar,
      updateProfile,
      startEmailVerification,
      confirmEmailVerification,
      startPhoneVerification,
      confirmPhoneVerification,
      regenerateFriendCode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
