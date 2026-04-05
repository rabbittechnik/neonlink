import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { API_BASE_URL } from "@/config";
const TOKEN_KEY = "neonlink_session_token";
function normalizeAuthUser(raw) {
    const status = String(raw.status ?? "offline");
    const st = ["online", "away", "busy", "offline", "on_call"].includes(status) ? status : "offline";
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
            : "workspace"),
        phoneVisibility: (["private", "workspace", "public"].includes(String(raw.phoneVisibility))
            ? raw.phoneVisibility
            : "workspace"),
        status: st,
        statusBySection: (raw.statusBySection && typeof raw.statusBySection === "object"
            ? raw.statusBySection
            : {}),
        bio: String(raw.bio ?? ""),
        statusMessage: String(raw.statusMessage ?? ""),
        friendCode: String(raw.friendCode ?? ""),
        avatarUrl: raw.avatarUrl === null || raw.avatarUrl === undefined ? null : String(raw.avatarUrl),
    };
}
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);
    const authFetch = useCallback(async (path, init) => {
        const headers = new Headers(init?.headers);
        if (token)
            headers.set("Authorization", `Bearer ${token}`);
        if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
            headers.set("Content-Type", "application/json");
        }
        return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    }, [token]);
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
                    localStorage.removeItem(TOKEN_KEY);
                    if (!cancelled) {
                        setToken(null);
                        setUser(null);
                    }
                }
                else {
                    const data = (await res.json());
                    if (!cancelled)
                        setUser(normalizeAuthUser(data));
                }
            }
            catch {
                if (!cancelled) {
                    setUser(null);
                }
            }
            finally {
                if (!cancelled)
                    setReady(true);
            }
        };
        void hydrate();
        return () => {
            cancelled = true;
        };
    }, [token]);
    const login = useCallback(async (email, password) => {
        let res;
        try {
            res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
        }
        catch {
            throw new Error("network_error");
        }
        let payload;
        try {
            payload = await res.json();
        }
        catch {
            throw new Error(res.ok ? "invalid_response" : "login_failed");
        }
        if (!res.ok) {
            const err = payload;
            throw new Error(typeof err.error === "string" && err.error ? err.error : "login_failed");
        }
        const data = payload;
        if (!data.token || !data.user) {
            throw new Error("invalid_response");
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(normalizeAuthUser(data.user));
    }, []);
    const register = useCallback(async (displayName, email, password, phone) => {
        let res;
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
        }
        catch {
            throw new Error("network_error");
        }
        let payload;
        try {
            payload = await res.json();
        }
        catch {
            throw new Error(res.ok ? "invalid_response" : "register_failed");
        }
        if (!res.ok) {
            const err = payload;
            throw new Error(typeof err.error === "string" && err.error ? err.error : "register_failed");
        }
        const data = payload;
        if (!data.token || !data.user) {
            throw new Error("invalid_response");
        }
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(normalizeAuthUser(data.user));
    }, []);
    const logout = useCallback(async () => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (t) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${t}` },
                });
            }
            catch {
                // ignorieren
            }
        }
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);
    const setAvatar = useCallback(async (avatarDataUrl) => {
        const res = await authFetch("/auth/me/profile", {
            method: "PATCH",
            body: JSON.stringify({ avatarUrl: avatarDataUrl }),
        });
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
            throw new Error("unauthorized");
        }
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "avatar_update_failed");
        }
        const next = (await res.json());
        setUser(normalizeAuthUser(next));
    }, [authFetch]);
    const updateProfile = useCallback(async (patch) => {
        const res = await authFetch("/auth/me/profile", {
            method: "PATCH",
            body: JSON.stringify(patch),
        });
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
            throw new Error("unauthorized");
        }
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "profile_update_failed");
        }
        const next = (await res.json());
        setUser(normalizeAuthUser(next));
    }, [authFetch]);
    const startEmailVerification = useCallback(async () => {
        const res = await authFetch("/auth/me/verify/email/start", { method: "POST" });
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "verify_start_failed");
        }
        return (await res.json());
    }, [authFetch]);
    const confirmEmailVerification = useCallback(async (code) => {
        const res = await authFetch("/auth/me/verify/email/confirm", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "verify_confirm_failed");
        }
        const next = (await res.json());
        setUser(normalizeAuthUser(next));
    }, [authFetch]);
    const startPhoneVerification = useCallback(async () => {
        const res = await authFetch("/auth/me/verify/phone/start", { method: "POST" });
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "verify_start_failed");
        }
        return (await res.json());
    }, [authFetch]);
    const confirmPhoneVerification = useCallback(async (code) => {
        const res = await authFetch("/auth/me/verify/phone/confirm", {
            method: "POST",
            body: JSON.stringify({ code }),
        });
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "verify_confirm_failed");
        }
        const next = (await res.json());
        setUser(normalizeAuthUser(next));
    }, [authFetch]);
    const regenerateFriendCode = useCallback(async () => {
        const res = await authFetch("/auth/me/friend-code/regenerate", { method: "POST" });
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
            throw new Error("unauthorized");
        }
        if (!res.ok) {
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error ?? "friend_code_regenerate_failed");
        }
        const next = (await res.json());
        setUser(normalizeAuthUser(next));
    }, [authFetch]);
    const value = useMemo(() => ({
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
    }), [
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
    ]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
