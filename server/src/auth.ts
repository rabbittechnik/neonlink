import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { User } from "./types.js";

const SESSION_MS = 1000 * 60 * 60 * 24 * 14; // 14 Tage
const PASSWORD_RESET_MS = 1000 * 60 * 60; // 1 Stunde

const sessions = new Map<string, { userId: string; expiresAt: number }>();
const passwordResets = new Map<string, { userId: string; expiresAt: number }>();

export function hashPassword(plain: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64);
  return { salt, hash: derived.toString("hex") };
}

export function verifyPassword(plain: string, salt: string, hashHex: string): boolean {
  try {
    const derived = scryptSync(plain, salt, 64);
    const stored = Buffer.from(hashHex, "hex");
    return derived.length === stored.length && timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_MS });
  return token;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

export function deleteSessionsForUser(userId: string): void {
  const toDelete: string[] = [];
  for (const [t, row] of sessions) {
    if (row.userId === userId) toDelete.push(t);
  }
  for (const t of toDelete) sessions.delete(t);
}

export function createPasswordResetToken(userId: string): string {
  const stale: string[] = [];
  for (const [t, row] of passwordResets) {
    if (row.userId === userId) stale.push(t);
  }
  for (const t of stale) passwordResets.delete(t);
  const token = randomBytes(32).toString("hex");
  passwordResets.set(token, { userId, expiresAt: Date.now() + PASSWORD_RESET_MS });
  return token;
}

export function consumePasswordResetToken(token: string): string | null {
  const row = passwordResets.get(token);
  if (!row || row.expiresAt < Date.now()) {
    passwordResets.delete(token);
    return null;
  }
  passwordResets.delete(token);
  return row.userId;
}

export function getUserIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const row = sessions.get(token);
  if (!row || row.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return row.userId;
}

export type AuthPersistV1 = {
  sessions: [string, { userId: string; expiresAt: number }][];
  passwordResets: [string, { userId: string; expiresAt: number }][];
};

export function captureAuthState(): AuthPersistV1 {
  return {
    sessions: [...sessions.entries()],
    passwordResets: [...passwordResets.entries()],
  };
}

export function restoreAuthState(data: AuthPersistV1 | null | undefined): void {
  sessions.clear();
  passwordResets.clear();
  if (!data) return;
  const nowMs = Date.now();
  for (const [t, row] of data.sessions) {
    if (row.expiresAt > nowMs) sessions.set(t, row);
  }
  for (const [t, row] of data.passwordResets) {
    if (row.expiresAt > nowMs) passwordResets.set(t, row);
  }
}

/** Antwort-DTO ohne sensible Felder (Kontext: generisch). */
export function toPublicUser(user: User) {
  const c = user.chatTextColor;
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    friendCode: user.friendCode,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio.trim().slice(0, 2000),
    statusMessage: user.statusMessage.trim().slice(0, 280),
    statusBySection: user.statusBySection,
    chatTextColor: typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : null,
  };
}

/** Eigenes Profil inkl. Telefon und Kontakt-Sichtbarkeit (nur für /auth/me und Login-Response). */
export function toPrivateProfile(user: User) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    contactEmail: user.contactEmail,
    phoneDigits: user.phoneDigits,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    emailVisibility: user.emailVisibility,
    phoneVisibility: user.phoneVisibility,
    status: user.status,
    statusBySection: user.statusBySection,
    bio: user.bio,
    statusMessage: user.statusMessage,
    friendCode: user.friendCode,
    avatarUrl: user.avatarUrl ?? null,
    chatTextColor:
      typeof user.chatTextColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(user.chatTextColor)
        ? user.chatTextColor
        : null,
  };
}
