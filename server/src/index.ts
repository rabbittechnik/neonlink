import cors from "cors";
import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { Server } from "socket.io";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  deleteSession,
  deleteSessionsForUser,
  getUserIdFromToken,
  toPrivateProfile,
  verifyPassword,
} from "./auth.js";
import type { ContactVisibility, FinanceCategory, PresenceStatus } from "./types.js";
import {
  addPersonalContact,
  attachmentRegistry,
  canViewContractBundle,
  canUserAccessRoom,
  canEditWorkSchedule,
  canViewFinanceRecord,
  canViewWorkSchedule,
  createGroupChatRoom,
  createContractBundle,
  createContractCustomCategory,
  createFinanceRecord,
  createFriendRequest,
  createEmployeeAbsencePeriod,
  createWorkplaceEmployee,
  createInvite,
  createMessage,
  deleteContractBundle,
  deleteContractCustomCategory,
  createCalendarEvent,
  createExtraMeetingRoom,
  createWorkspaceMeeting,
  deleteMeetingRoom,
  deleteCalendarEvent,
  deleteWorkspaceMeeting,
  deleteEmployeeAbsencePeriod,
  deleteEmployeeScheduleWish,
  deleteFinanceRecord,
  deletePersonalContact,
  deleteWorkplaceEmployee,
  findRoomById,
  findUserByEmail,
  formatUserForPeerView,
  getOrCreatePrivateChat,
  getContractBundle,
  getFinanceRecord,
  getMonthlyWorkPlan,
  getWorkScheduleViewersForEditor,
  getWorkScheduleRules,
  getWorkspaceMeeting,
  hasSharedWorkspace,
  isFriend,
  isWorkspaceMember,
  joinWorkspaceWithInvite,
  listCalendarEventsForViewer,
  listUpcomingCalendarEventsForUser,
  listRecentCalendarNewsForViewer,
  listMeetingRoomsForViewer,
  listMeetingsInRoom,
  listContractBundles,
  listContractCustomCategories,
  listFinanceRecords,
  listFriendRequests,
  listFriends,
  listFamilyCalendarSlots,
  listPersonalContactsEnriched,
  listRoomsForViewer,
  generateMonthlyWorkPlan,
  patchUserProfile,
  postWorkScheduleChatMessage,
  putWorkScheduleRules,
  renameMeetingRoom,
  regenerateFriendCodeForUser,
  listEmployeeAbsencePeriods,
  listEmployeeScheduleWishes,
  listMonthlyWorkPlans,
  listWorkScheduleChatMessages,
  listWorkScheduleContextsForUser,
  listWorkplaceEmployees,
  listWorkspacesForUser,
  lookupUserPublicByPhone,
  messages,
  registerUserWithPassword,
  replaceFamilyCalendarSlots,
  respondToFriendRequest,
  setChatMessageBroadcaster,
  setUserAvatarDataUrl,
  setUserPassword,
  setUserPhoneDigits,
  searchUsers,
  setFriendGroup,
  setWorkScheduleViewers,
  toContractSummary,
  toFinanceSummary,
  updateCalendarEvent,
  updateContractBundle,
  updateFinanceRecord,
  updateWorkplaceEmployee,
  upsertEmployeeScheduleWish,
  users,
  dedupeWorkspaceMembers,
  workspaceMembers,
  workspaces,
} from "./store.js";
import { isMailConfigured, sendEmailVerificationCode, sendPasswordResetEmail } from "./mail.js";
import { initPersistenceAsync } from "./persistence.js";

await initPersistenceAsync();
dedupeWorkspaceMembers();

/** gesetzt sobald Socket.IO steht — für HTTP-Handler (z. B. Freundschaftsanfragen live pushen) */
let socketIo: Server | undefined;

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" }));

function parseFinanceCategory(c: unknown): FinanceCategory {
  const allowed: FinanceCategory[] = [
    "strom",
    "miete",
    "telefon",
    "handy",
    "internet",
    "mode",
    "essen",
    "bankgebuehren",
    "versicherung",
    "kredit",
    "abos",
    "unterhalt",
    "lohn",
    "verkauf",
    "gesundheit",
    "auto",
    "oeffentlich",
    "streaming",
    "sparen",
    "steuern",
    "tanken",
    "schule",
    "tier",
    "reisen",
    "geschenke",
    "haushalt",
    "sport",
    "hobby",
    "sonstiges",
  ];
  if (typeof c === "string" && allowed.includes(c as FinanceCategory)) return c as FinanceCategory;
  return "sonstiges";
}

function bearerToken(req: express.Request): string | undefined {
  const raw = req.headers.authorization;
  if (!raw?.toLowerCase().startsWith("bearer ")) return undefined;
  return raw.slice(7).trim() || undefined;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = getUserIdFromToken(bearerToken(req));
  if (!userId) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.authUserId = userId;
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "neonlink-server" });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = findUserByEmail(email.trim());
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const token = createSession(user.id);
  return res.json({ token, user: toPrivateProfile(user) });
});

app.post("/auth/register", (req, res) => {
  const body = req.body as { displayName?: string; email?: string; password?: string; phone?: string };
  if (!body.displayName?.trim() || !body.email?.trim() || !body.password || !body.phone?.trim()) {
    return res.status(400).json({ error: "displayName, email, password and phone are required" });
  }
  if (body.password.length < 6) {
    return res.status(400).json({ error: "password_min_length_6" });
  }
  const result = registerUserWithPassword(
    body.displayName.trim(),
    body.email.trim(),
    body.password,
    body.phone.trim()
  );
  if (!result.ok) {
    const status = result.reason === "email_taken" ? 409 : 400;
    return res.status(status).json({ error: result.reason });
  }
  const token = createSession(result.user.id);
  return res.status(201).json({ token, user: toPrivateProfile(result.user) });
});

app.get("/auth/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  return res.json(toPrivateProfile(user));
});

const demoEmailCodes = new Map<string, { code: string; exp: number }>();
const demoPhoneCodes = new Map<string, { code: string; exp: number }>();

app.patch("/auth/me/profile", requireAuth, (req, res) => {
  const body = req.body as {
    avatarUrl?: string | null;
    phone?: string;
    displayName?: string;
    bio?: string;
    statusMessage?: string;
    status?: string;
    statusBySection?: Record<string, string>;
    contactEmail?: string;
    emailVisibility?: string;
    phoneVisibility?: string;
    chatTextColor?: string | null;
  };
  let updated = false;
  if (body.phone !== undefined) {
    const r = setUserPhoneDigits(req.authUserId!, String(body.phone));
    if (!r.ok) return res.status(400).json({ error: r.reason });
    updated = true;
  }
  if (body.avatarUrl !== undefined) {
    const raw = body.avatarUrl;
    if (raw !== null && typeof raw !== "string") {
      return res.status(400).json({ error: "invalid_avatar" });
    }
    const dataUrl = raw === null || raw === "" ? null : raw;
    const result = setUserAvatarDataUrl(req.authUserId!, dataUrl);
    if (!result.ok) {
      const code =
        result.reason === "avatar_too_large"
          ? "avatar_too_large"
          : result.reason === "invalid_avatar_format"
            ? "invalid_avatar_format"
            : "update_failed";
      return res.status(400).json({ error: code });
    }
    updated = true;
  }
  const profilePatch: Parameters<typeof patchUserProfile>[1] = {};
  if (body.displayName !== undefined) profilePatch.displayName = body.displayName;
  if (body.bio !== undefined) profilePatch.bio = body.bio;
  if (body.statusMessage !== undefined) profilePatch.statusMessage = body.statusMessage;
  if (body.status !== undefined) profilePatch.status = body.status as PresenceStatus;
  if (body.statusBySection !== undefined && typeof body.statusBySection === "object") {
    profilePatch.statusBySection = body.statusBySection as Record<string, PresenceStatus>;
  }
  if (body.contactEmail !== undefined) profilePatch.contactEmail = body.contactEmail;
  if (body.emailVisibility !== undefined) {
    profilePatch.emailVisibility = body.emailVisibility as ContactVisibility;
  }
  if (body.phoneVisibility !== undefined) {
    profilePatch.phoneVisibility = body.phoneVisibility as ContactVisibility;
  }
  if (body.chatTextColor !== undefined) {
    profilePatch.chatTextColor =
      body.chatTextColor === null || body.chatTextColor === ""
        ? null
        : String(body.chatTextColor);
  }
  if (Object.keys(profilePatch).length > 0) {
    const patchResult = patchUserProfile(req.authUserId!, profilePatch);
    if (!patchResult.ok) return res.status(400).json({ error: patchResult.reason });
    updated = true;
  }
  if (!updated) {
    return res.status(400).json({ error: "no_profile_fields" });
  }
  const user = users.find((u) => u.id === req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  return res.json(toPrivateProfile(user));
});

app.post("/auth/me/friend-code/regenerate", requireAuth, (_req, res) => {
  const r = regenerateFriendCodeForUser(_req.authUserId!);
  if (!r.ok) return res.status(404).json({ error: "not_found" });
  const user = users.find((u) => u.id === _req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  return res.json(toPrivateProfile(user));
});

app.post("/auth/me/verify/email/start", requireAuth, async (_req, res) => {
  const user = users.find((u) => u.id === _req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const to = user.contactEmail?.trim();
  if (!to) {
    return res.status(400).json({ error: "contact_email_required" });
  }
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  demoEmailCodes.set(user.id, { code, exp: Date.now() + 10 * 60 * 1000 });

  /** Wenn SMTP gesetzt ist, immer echten Versand (Railway setzt oft kein NODE_ENV=production). */
  if (isMailConfigured()) {
    try {
      await sendEmailVerificationCode(to, code, user.displayName);
      console.info("[neonlink] E-Mail-Verifizierung gesendet an", to);
      return res.json({ ok: true, sent: true });
    } catch (err) {
      console.error("[neonlink] sendEmailVerificationCode:", err);
      return res.status(503).json({ error: "email_delivery_failed" });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[NeonLink Demo] E-Mail-Verifizierung für ${to}: ${code}`);
    return res.json({
      ok: true,
      demoHint: "Code steht in der Server-Konsole (Development).",
    });
  }

  console.warn("[neonlink] SMTP_HOST nicht gesetzt – keine Verifizierungs-E-Mail.");
  return res.status(503).json({ error: "smtp_not_configured" });
});

app.post("/auth/me/verify/email/confirm", requireAuth, (req, res) => {
  const { code } = req.body as { code?: string };
  const row = demoEmailCodes.get(req.authUserId!);
  if (!row || row.exp < Date.now() || row.code !== String(code ?? "").trim()) {
    return res.status(400).json({ error: "invalid_or_expired_code" });
  }
  demoEmailCodes.delete(req.authUserId!);
  const user = users.find((u) => u.id === req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  user.emailVerified = true;
  return res.json(toPrivateProfile(user));
});

app.post("/auth/me/verify/phone/start", requireAuth, (_req, res) => {
  const user = users.find((u) => u.id === _req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  demoPhoneCodes.set(user.id, { code, exp: Date.now() + 10 * 60 * 1000 });
  console.log(`[NeonLink Demo] SMS-Code für ***${user.phoneDigits.slice(-2)}: ${code}`);
  return res.json({ ok: true, demoHint: "Code steht in der Server-Konsole (Demo, keine echte SMS)." });
});

app.post("/auth/me/verify/phone/confirm", requireAuth, (req, res) => {
  const { code } = req.body as { code?: string };
  const row = demoPhoneCodes.get(req.authUserId!);
  if (!row || row.exp < Date.now() || row.code !== String(code ?? "").trim()) {
    return res.status(400).json({ error: "invalid_or_expired_code" });
  }
  demoPhoneCodes.delete(req.authUserId!);
  const user = users.find((u) => u.id === req.authUserId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  user.phoneVerified = true;
  return res.json(toPrivateProfile(user));
});

app.get("/contacts", requireAuth, (req, res) => {
  return res.json(listPersonalContactsEnriched(req.authUserId!));
});

app.post("/contacts/lookup", requireAuth, (req, res) => {
  const { phone } = req.body as { phone?: string };
  const u = lookupUserPublicByPhone(phone);
  if (u && u.id === req.authUserId) return res.json({ user: null });
  return res.json({ user: u });
});

app.post("/contacts", requireAuth, (req, res) => {
  const { displayName, phone } = req.body as { displayName?: string; phone?: string };
  const result = addPersonalContact(req.authUserId!, displayName ?? "", phone ?? "");
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json(result.contact);
});

app.delete("/contacts/:id", requireAuth, (req, res) => {
  const result = deletePersonalContact(req.authUserId!, req.params.id);
  if (!result.ok) {
    return res.status(result.reason === "not_found" ? 404 : 400).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.post("/auth/logout", requireAuth, (req, res) => {
  const token = bearerToken(req);
  if (token) deleteSession(token);
  return res.json({ ok: true });
});

app.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    return res.status(400).json({ error: "email is required" });
  }
  const user = findUserByEmail(email.trim());
  if (!user) {
    return res.json({ ok: true });
  }
  const resetToken = createPasswordResetToken(user.id);
  const defaultOrigin = process.env.STATIC_DIST_PATH?.trim()
    ? `http://127.0.0.1:${Number(process.env.PORT ?? 4000)}`
    : "http://localhost:5173";
  const frontendOrigin = (process.env.FRONTEND_ORIGIN?.trim() || defaultOrigin).replace(/\/$/, "");
  const resetLink = `${frontendOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;

  if (process.env.NODE_ENV !== "production") {
    console.info("[neonlink] Password reset (dev):", resetLink);
    return res.json({ ok: true, devResetLink: resetLink });
  }

  if (!isMailConfigured()) {
    console.warn(
      "[neonlink] Production: SMTP_HOST nicht gesetzt – Passwort-Reset-E-Mail wird nicht versendet."
    );
    return res.json({ ok: true });
  }

  try {
    await sendPasswordResetEmail(user.email, resetLink, user.displayName);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[neonlink] sendPasswordResetEmail:", err);
    return res.status(503).json({ error: "email_delivery_failed" });
  }
});

app.post("/auth/reset-password", (req, res) => {
  const body = req.body as { token?: string; newPassword?: string };
  if (!body.token?.trim() || !body.newPassword) {
    return res.status(400).json({ error: "token and newPassword are required" });
  }
  if (body.newPassword.length < 6) {
    return res.status(400).json({ error: "password_min_length_6" });
  }
  const userId = consumePasswordResetToken(body.token.trim());
  if (!userId) {
    return res.status(400).json({ error: "invalid_or_expired_token" });
  }
  const updated = setUserPassword(userId, body.newPassword);
  if (!updated) {
    return res.status(400).json({ error: "user_not_found" });
  }
  deleteSessionsForUser(userId);
  return res.json({ ok: true });
});

app.get("/users", (_req, res) => {
  res.status(403).json({ error: "global user listing is disabled" });
});

app.get("/users/search", requireAuth, (req, res) => {
  const requesterUserId = String(req.query.requesterUserId ?? "");
  const query = String(req.query.q ?? "");
  if (requesterUserId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!query) {
    return res.status(400).json({ error: "q is required" });
  }
  return res.json(searchUsers(requesterUserId, query));
});

app.get("/users/:id/profile", requireAuth, (req, res) => {
  let requesterUserId = String(req.query.requesterUserId ?? req.authUserId);
  if (requesterUserId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) return res.status(404).json({ error: "user_not_found" });
  const isSelf = requesterUserId === user.id;
  const allowed =
    isSelf || isFriend(requesterUserId, user.id) || hasSharedWorkspace(requesterUserId, user.id);
  if (!allowed) {
    return res.json({
      id: user.id,
      displayName: "Privater Nutzer",
      status: "offline",
    });
  }
  return res.json(formatUserForPeerView(requesterUserId, user));
});

app.get("/workspaces", requireAuth, (req, res) => {
  const list = listWorkspacesForUser(req.authUserId!);
  const enriched = list.map((w) => ({
    ...w,
    memberCount: workspaceMembers.filter((m) => m.workspaceId === w.id).length,
  }));
  return res.json(enriched);
});

app.get("/workspaces/:id", requireAuth, (req, res) => {
  const workspace = workspaces.find((w) => w.id === req.params.id);
  if (!workspace) return res.status(404).json({ error: "workspace not found" });
  if (!isWorkspaceMember(req.authUserId!, req.params.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(workspace);
});

app.get("/workspaces/:id/rooms", requireAuth, (req, res) => {
  if (!isWorkspaceMember(req.authUserId!, req.params.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const workspaceRooms = listRoomsForViewer(req.authUserId!, req.params.id);
  return res.json(workspaceRooms);
});

app.post("/workspaces/:id/rooms", requireAuth, (req, res) => {
  const wsId = req.params.id;
  const userId = req.authUserId!;
  if (!isWorkspaceMember(userId, wsId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const body = req.body as {
    sectionId?: string;
    chatType?: "group" | "private";
    name?: string;
    participantUserIds?: string[];
    otherUserId?: string;
  };
  const sectionId = String(body.sectionId ?? "").trim();
  if (!sectionId) return res.status(400).json({ error: "sectionId_required" });

  if (body.chatType === "private") {
    const otherUserId = String(body.otherUserId ?? "").trim();
    if (!otherUserId) return res.status(400).json({ error: "otherUserId_required" });
    const result = getOrCreatePrivateChat({
      workspaceId: wsId,
      sectionId,
      callerUserId: userId,
      otherUserId,
    });
    if (!result.ok) return res.status(400).json({ error: result.reason });
    return res.status(result.created ? 201 : 200).json({ room: result.room, created: result.created });
  }

  if (body.chatType === "group") {
    const name = String(body.name ?? "");
    const participantUserIds = Array.isArray(body.participantUserIds)
      ? body.participantUserIds.map((x) => String(x))
      : [];
    const result = createGroupChatRoom({
      workspaceId: wsId,
      sectionId,
      creatorUserId: userId,
      name,
      participantUserIds,
    });
    if (!result.ok) return res.status(400).json({ error: result.reason });
    return res.status(201).json({ room: result.room });
  }

  return res.status(400).json({ error: "chatType_group_or_private_required" });
});

app.get("/workspaces/:id/members", requireAuth, (req, res) => {
  if (!isWorkspaceMember(req.authUserId!, req.params.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  dedupeWorkspaceMembers();
  const members = workspaceMembers
    .filter((member) => member.workspaceId === req.params.id)
    .map((member) => {
      const u = users.find((user) => user.id === member.userId);
      return {
        ...member,
        user: u ? formatUserForPeerView(req.authUserId!, u) : null,
      };
    });
  return res.json(members);
});

app.post("/workspaces/:id/invites", requireAuth, (req, res) => {
  const { createdBy, maxUses } = req.body as { createdBy?: string; maxUses?: number };
  if (!createdBy || createdBy !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const workspaceExists = workspaces.some((workspace) => workspace.id === req.params.id);
  if (!workspaceExists) return res.status(404).json({ error: "workspace not found" });
  if (!isWorkspaceMember(req.authUserId!, req.params.id)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const invite = createInvite(req.params.id, createdBy, maxUses);
  return res.status(201).json(invite);
});

app.post("/invites/join", requireAuth, (req, res) => {
  const { code, userId } = req.body as { code?: string; userId?: string };
  if (!code || !userId || userId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const joinResult = joinWorkspaceWithInvite(code, userId);
  if (!joinResult.ok) return res.status(400).json({ error: joinResult.reason });
  return res.status(200).json(joinResult);
});

app.get("/friends/:userId", requireAuth, (req, res) => {
  if (req.params.userId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listFriends(req.params.userId));
});

app.get("/friends/requests/:userId", requireAuth, (req, res) => {
  if (req.params.userId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const typeQuery = String(req.query.type ?? "incoming");
  const type = typeQuery === "outgoing" || typeQuery === "all" ? typeQuery : "incoming";
  return res.json(listFriendRequests(req.params.userId, type));
});

app.post("/friends/requests", requireAuth, (req, res) => {
  const { fromUserId, toUserId } = req.body as { fromUserId?: string; toUserId?: string };
  if (!fromUserId || !toUserId || fromUserId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const result = createFriendRequest(fromUserId, toUserId);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  const fromUser = users.find((u) => u.id === result.request.fromUserId);
  socketIo?.to(`user:${toUserId}`).emit("friends:incomingRequest", {
    ...result.request,
    fromDisplayName: fromUser?.displayName,
  });
  return res.status(201).json(result.request);
});

app.post("/friends/requests/:requestId/respond", requireAuth, (req, res) => {
  const { userId, action } = req.body as { userId?: string; action?: "accept" | "reject" };
  if (!userId || userId !== req.authUserId || (action !== "accept" && action !== "reject")) {
    return res.status(400).json({ error: "invalid_request" });
  }
  const result = respondToFriendRequest(req.params.requestId, userId, action);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  const r = result.request;
  socketIo?.to(`user:${r.fromUserId}`).emit("friends:changed");
  socketIo?.to(`user:${r.toUserId}`).emit("friends:changed");
  return res.status(200).json(result.request);
});

app.post("/friends/group", requireAuth, (req, res) => {
  const { ownerUserId, friendUserId, group } = req.body as {
    ownerUserId?: string;
    friendUserId?: string;
    group?:
      | "familie"
      | "freunde"
      | "verwandte"
      | "feuerwehr"
      | "arbeit"
      | "ideen"
      | "schule"
      | "verein"
      | "nachbarn"
      | "sonstiges";
  };
  if (!ownerUserId || !friendUserId || !group || ownerUserId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const result = setFriendGroup(ownerUserId, friendUserId, group);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(200).json({ ok: true });
});

app.get("/workspaces/:wsId/calendar/events", requireAuth, (req, res) => {
  const from = String(req.query.from ?? "").trim();
  const to = String(req.query.to ?? "").trim();
  if (!from || !to) return res.status(400).json({ error: "from_to_required" });
  if (!isWorkspaceMember(req.authUserId!, req.params.wsId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const rows = listCalendarEventsForViewer(req.authUserId!, req.params.wsId, from, to);
  return res.json(rows);
});

/** Nächste Termine über alle Workspaces des Nutzers (Sidebar „Nächste Termine“). */
app.get("/me/calendar/upcoming", requireAuth, (req, res) => {
  const rawLimit = parseInt(String(req.query.limit ?? "3"), 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(20, Math.max(1, rawLimit)) : 3;
  const from = String(req.query.from ?? "").trim();
  const to = String(req.query.to ?? "").trim();
  if (!from || !to) return res.status(400).json({ error: "from_to_required" });
  const rows = listUpcomingCalendarEventsForUser(req.authUserId!, from, to, limit);
  return res.json(rows);
});

/** Kalender-Neuigkeiten (fremde neue Termine/Urlaub/Ferien) für die Glocke. */
app.get("/me/calendar/recent-news", requireAuth, (req, res) => {
  const sinceParam = String(req.query.since ?? "").trim();
  const days = Math.min(30, Math.max(1, parseInt(String(req.query.days ?? "14"), 10) || 14));
  const sinceIso =
    sinceParam ||
    new Date(Date.now() - days * 86400000).toISOString();
  const rows = listRecentCalendarNewsForViewer(req.authUserId!, sinceIso);
  return res.json(rows);
});

app.post("/workspaces/:wsId/calendar/events", requireAuth, (req, res) => {
  const body = req.body as {
    sectionId?: string;
    kind?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string | null;
    allDay?: boolean;
    location?: string;
    visibilityUserIds?: string[];
    familySlotId?: string | null;
  };
  if (!body.sectionId || !body.startsAt) {
    return res.status(400).json({ error: "section_starts_required" });
  }
  const kind =
    body.kind === "vacation" ? "vacation" : body.kind === "ferien" ? "ferien" : "appointment";
  const result = createCalendarEvent({
    creatorId: req.authUserId!,
    workspaceId: req.params.wsId,
    sectionId: body.sectionId,
    kind,
    title: body.title ?? "",
    startsAt: body.startsAt,
    endsAt: body.endsAt ?? null,
    allDay: Boolean(body.allDay),
    location: body.location ?? "",
    visibilityUserIds: Array.isArray(body.visibilityUserIds) ? body.visibilityUserIds : [],
    familySlotId: body.familySlotId ?? null,
  });
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json(result.event);
});

app.patch("/calendar/events/:id", requireAuth, (req, res) => {
  const body = req.body as {
    sectionId?: string;
    kind?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string | null;
    allDay?: boolean;
    location?: string;
    visibilityUserIds?: string[];
    familySlotId?: string | null;
  };
  const patch: Parameters<typeof updateCalendarEvent>[2] = {};
  if (body.sectionId !== undefined) patch.sectionId = body.sectionId;
  if (body.title !== undefined) patch.title = body.title;
  if (body.startsAt !== undefined) patch.startsAt = body.startsAt;
  if (body.endsAt !== undefined) patch.endsAt = body.endsAt;
  if (body.allDay !== undefined) patch.allDay = body.allDay;
  if (body.location !== undefined) patch.location = body.location;
  if (body.visibilityUserIds !== undefined) patch.visibilityUserIds = body.visibilityUserIds;
  if (body.familySlotId !== undefined) patch.familySlotId = body.familySlotId;
  if (body.kind !== undefined) {
    patch.kind =
      body.kind === "vacation" ? "vacation" : body.kind === "ferien" ? "ferien" : "appointment";
  }
  const result = updateCalendarEvent(req.params.id, req.authUserId!, patch);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(result.event);
});

app.delete("/calendar/events/:id", requireAuth, (req, res) => {
  const result = deleteCalendarEvent(req.params.id, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/workspaces/:wsId/calendar/family-slots", requireAuth, (req, res) => {
  if (!isWorkspaceMember(req.authUserId!, req.params.wsId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listFamilyCalendarSlots(req.authUserId!, req.params.wsId));
});

app.put("/workspaces/:wsId/calendar/family-slots", requireAuth, (req, res) => {
  const body = req.body as { slots?: Array<{ label?: string }> };
  if (!Array.isArray(body.slots)) {
    return res.status(400).json({ error: "slots_array_required" });
  }
  const rows = body.slots.map((s) => ({
    label: String(s.label ?? ""),
  }));
  const result = replaceFamilyCalendarSlots(req.authUserId!, req.params.wsId, rows);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.json(listFamilyCalendarSlots(req.authUserId!, req.params.wsId));
});

app.get("/workspaces/:wsId/meeting-rooms", requireAuth, (req, res) => {
  if (!isWorkspaceMember(req.authUserId!, req.params.wsId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listMeetingRoomsForViewer(req.authUserId!, req.params.wsId));
});

app.patch("/workspaces/:wsId/meeting-rooms/:roomId", requireAuth, (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name_required" });
  const result = renameMeetingRoom(req.authUserId!, req.params.wsId, req.params.roomId, name);
  if (!result.ok) {
    const code =
      result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(result.room);
});

app.post("/workspaces/:wsId/meeting-rooms", requireAuth, (req, res) => {
  const name = String((req.body as { name?: string }).name ?? "Neuer Raum").trim();
  const result = createExtraMeetingRoom(req.authUserId!, req.params.wsId, name);
  if (!result.ok) return res.status(403).json({ error: result.reason });
  return res.status(201).json(result.room);
});

app.delete("/workspaces/:wsId/meeting-rooms/:roomId", requireAuth, (req, res) => {
  const result = deleteMeetingRoom(req.authUserId!, req.params.wsId, req.params.roomId);
  if (!result.ok) {
    const code =
      result.reason === "forbidden"
        ? 403
        : result.reason === "not_found"
          ? 404
          : result.reason === "cannot_delete_default_room" || result.reason === "room_has_meetings"
            ? 400
            : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/workspaces/:wsId/meeting-rooms/:roomId/meetings", requireAuth, (req, res) => {
  if (!isWorkspaceMember(req.authUserId!, req.params.wsId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listMeetingsInRoom(req.authUserId!, req.params.wsId, req.params.roomId));
});

app.post("/workspaces/:wsId/meetings", requireAuth, (req, res) => {
  const body = req.body as {
    meetingRoomId?: string;
    title?: string;
    description?: string;
    participantUserIds?: string[];
    startsAt?: string;
    endsAt?: string;
    sectionId?: string;
  };
  if (!body.meetingRoomId || !body.startsAt || !body.endsAt) {
    return res.status(400).json({ error: "room_time_required" });
  }
  const sectionId =
    body.sectionId && ["familie", "freunde", "verwandte", "feuerwehr", "arbeit", "ideen"].includes(body.sectionId)
      ? body.sectionId
      : "arbeit";
  const result = createWorkspaceMeeting(req.authUserId!, req.params.wsId, {
    meetingRoomId: body.meetingRoomId,
    title: body.title ?? "",
    description: body.description,
    participantUserIds: Array.isArray(body.participantUserIds) ? body.participantUserIds : [],
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    sectionId,
  });
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json({ meeting: result.meeting, calendarEvent: result.event });
});

app.get("/workspaces/:wsId/meetings/:meetingId", requireAuth, (req, res) => {
  const result = getWorkspaceMeeting(req.params.meetingId, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  if (result.meeting.workspaceId !== req.params.wsId) {
    return res.status(404).json({ error: "not_found" });
  }
  return res.json(result.meeting);
});

app.delete("/workspaces/:wsId/meetings/:meetingId", requireAuth, (req, res) => {
  const m = getWorkspaceMeeting(req.params.meetingId, req.authUserId!);
  if (!m.ok) {
    const code = m.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: m.reason });
  }
  if (m.meeting.workspaceId !== req.params.wsId) {
    return res.status(404).json({ error: "not_found" });
  }
  const del = deleteWorkspaceMeeting(req.params.meetingId, req.authUserId!);
  if (!del.ok) {
    const code = del.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: del.reason });
  }
  return res.json({ ok: true });
});

app.get("/rooms/:id/messages", requireAuth, (req, res) => {
  const room = findRoomById(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });
  if (!canUserAccessRoom(req.authUserId!, room)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const roomMessages = messages.filter((message) => message.roomId === req.params.id);
  return res.json(roomMessages);
});

app.post("/rooms/:id/messages", requireAuth, (req, res) => {
  const body = req.body as {
    senderUserId?: string;
    body?: string;
    replyToId?: string;
    attachments?: Array<{ fileName: string; mimeType: string; sizeBytes: number }>;
  };
  if (!body.senderUserId || body.senderUserId !== req.authUserId) {
    return res.status(403).json({ error: "forbidden" });
  }
  const text = body.body?.trim() ?? "";
  const hasAttachments = Boolean(body.attachments?.length);
  if (!text && !hasAttachments) {
    return res.status(400).json({ error: "body or attachments required" });
  }

  const room = findRoomById(req.params.id);
  if (!room) return res.status(404).json({ error: "room not found" });
  if (!canUserAccessRoom(req.authUserId!, room)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const message = createMessage(req.params.id, body.senderUserId, text || "(Anhang)", {
    replyToId: body.replyToId,
    attachments: body.attachments,
  });
  io.to(`room:${req.params.id}`).emit("chat:messageCreated", message);
  return res.status(201).json(message);
});

app.get("/finance/records", requireAuth, (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "").trim();
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });
  if (!isWorkspaceMember(req.authUserId!, workspaceId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const scopeRaw = req.query.scope;
  const kindRaw = req.query.kind;
  const ownerUserId = String(req.query.ownerUserId ?? "").trim() || undefined;
  const scope =
    scopeRaw === "personal" || scopeRaw === "family" ? scopeRaw : undefined;
  const kind = kindRaw === "expense" || kindRaw === "income" ? kindRaw : undefined;
  const rows = listFinanceRecords(req.authUserId!, workspaceId, {
    scope,
    kind,
    ownerUserId,
  });
  return res.json(rows.map(toFinanceSummary));
});

app.get("/finance/records/:id", requireAuth, (req, res) => {
  const r = getFinanceRecord(req.params.id);
  if (!r) return res.status(404).json({ error: "not_found" });
  if (!canViewFinanceRecord(req.authUserId!, r)) return res.status(403).json({ error: "forbidden" });
  return res.json(r);
});

app.post("/finance/records", requireAuth, (req, res) => {
  const body = req.body as {
    workspaceId?: string;
    scope?: string;
    kind?: string;
    category?: unknown;
    title?: string;
    amountCents?: number;
    currency?: string;
    dueDate?: string | null;
    paidAt?: string | null;
    payee?: string | null;
    notes?: string | null;
    imageDataUrl?: string;
    extraAttachmentDataUrl?: string | null;
    visibilityUserIds?: string[];
  };
  if (!body.workspaceId?.trim() || !body.imageDataUrl || !body.title?.trim()) {
    return res.status(400).json({ error: "workspaceId_title_image_required" });
  }
  const result = createFinanceRecord({
    ownerUserId: req.authUserId!,
    workspaceId: body.workspaceId.trim(),
    scope: body.scope === "family" ? "family" : "personal",
    kind: body.kind === "income" ? "income" : "expense",
    category: parseFinanceCategory(body.category),
    title: body.title,
    amountCents: Number(body.amountCents ?? 0),
    currency: body.currency ?? "EUR",
    dueDate: body.dueDate ?? null,
    paidAt: body.paidAt ?? null,
    payee: body.payee ?? null,
    notes: body.notes ?? null,
    imageDataUrl: body.imageDataUrl,
    extraAttachmentDataUrl: body.extraAttachmentDataUrl ?? null,
    visibilityUserIds: Array.isArray(body.visibilityUserIds) ? body.visibilityUserIds : [],
  });
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json(toFinanceSummary(result.record));
});

app.patch("/finance/records/:id", requireAuth, (req, res) => {
  const body = req.body as {
    title?: string;
    amountCents?: number;
    currency?: string;
    dueDate?: string | null;
    paidAt?: string | null;
    payee?: string | null;
    notes?: string | null;
    category?: unknown;
    scope?: string;
    kind?: string;
    visibilityUserIds?: string[];
    imageDataUrl?: string;
    extraAttachmentDataUrl?: string | null;
  };
  const patch: Parameters<typeof updateFinanceRecord>[2] = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.amountCents !== undefined) patch.amountCents = body.amountCents;
  if (body.currency !== undefined) patch.currency = body.currency;
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
  if (body.paidAt !== undefined) patch.paidAt = body.paidAt;
  if (body.payee !== undefined) patch.payee = body.payee;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.category !== undefined) patch.category = parseFinanceCategory(body.category);
  if (body.scope !== undefined) patch.scope = body.scope === "family" ? "family" : "personal";
  if (body.kind !== undefined) patch.kind = body.kind === "income" ? "income" : "expense";
  if (body.visibilityUserIds !== undefined) patch.visibilityUserIds = body.visibilityUserIds;
  if (body.imageDataUrl !== undefined) patch.imageDataUrl = body.imageDataUrl;
  if (body.extraAttachmentDataUrl !== undefined) patch.extraAttachmentDataUrl = body.extraAttachmentDataUrl;
  const result = updateFinanceRecord(req.params.id, req.authUserId!, patch);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(toFinanceSummary(result.record));
});

app.delete("/finance/records/:id", requireAuth, (req, res) => {
  const result = deleteFinanceRecord(req.params.id, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/work-schedule/my-contexts", requireAuth, (req, res) => {
  return res.json(listWorkScheduleContextsForUser(req.authUserId!));
});

app.get("/workspaces/:wsId/work-schedule/employees", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  return res.json(listWorkplaceEmployees(req.authUserId!, wsId));
});

app.post("/workspaces/:wsId/work-schedule/employees", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { name?: string; employmentType?: string };
  const et =
    body.employmentType === "vollzeit" || body.employmentType === "teilzeit" || body.employmentType === "aushilfe"
      ? body.employmentType
      : null;
  if (!et) return res.status(400).json({ error: "invalid_employment_type" });
  const result = createWorkplaceEmployee({
    editorId: req.authUserId!,
    workspaceId: wsId,
    name: body.name ?? "",
    employmentType: et,
  });
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.status(201).json(result.employee);
});

app.patch("/workspaces/:wsId/work-schedule/employees/:empId", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canEditWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const body = req.body as { name?: string; employmentType?: string };
  const patch: { name?: string; employmentType?: "vollzeit" | "teilzeit" | "aushilfe" } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.employmentType !== undefined) {
    if (body.employmentType !== "vollzeit" && body.employmentType !== "teilzeit" && body.employmentType !== "aushilfe") {
      return res.status(400).json({ error: "invalid_employment_type" });
    }
    patch.employmentType = body.employmentType;
  }
  const result = updateWorkplaceEmployee(req.params.empId, req.authUserId!, patch);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(result.employee);
});

app.delete("/workspaces/:wsId/work-schedule/employees/:empId", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canEditWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const result = deleteWorkplaceEmployee(req.params.empId, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/workspaces/:wsId/work-schedule/rules", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const rules = getWorkScheduleRules(req.authUserId!, wsId);
  if (!rules) return res.status(403).json({ error: "forbidden" });
  return res.json(rules);
});

app.put("/workspaces/:wsId/work-schedule/rules", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { slots?: unknown; dayPatterns?: Record<string, unknown> };
  const result = putWorkScheduleRules(req.authUserId!, wsId, {
    slots: body.slots,
    dayPatterns: body.dayPatterns as Parameters<typeof putWorkScheduleRules>[2]["dayPatterns"],
  });
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(result.rules);
});

app.get("/workspaces/:wsId/work-schedule/wishes", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  return res.json(listEmployeeScheduleWishes(req.authUserId!, wsId));
});

app.post("/workspaces/:wsId/work-schedule/wishes", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as {
    employeeId?: string;
    preferredWeekdays?: unknown;
    avoidWeekdays?: unknown;
    preferredShifts?: unknown;
    avoidShifts?: unknown;
    notes?: string;
  };
  if (!body.employeeId?.trim()) return res.status(400).json({ error: "employee_id_required" });
  const result = upsertEmployeeScheduleWish({
    editorId: req.authUserId!,
    workspaceId: wsId,
    employeeId: body.employeeId.trim(),
    preferredWeekdays: Array.isArray(body.preferredWeekdays) ? (body.preferredWeekdays as number[]) : [],
    avoidWeekdays: Array.isArray(body.avoidWeekdays) ? (body.avoidWeekdays as number[]) : [],
    preferredShifts: body.preferredShifts,
    avoidShifts: body.avoidShifts,
    notes: body.notes ?? "",
  });
  if (!result.ok) {
    const code =
      result.reason === "forbidden" ? 403 : result.reason === "employee_not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.status(201).json(result.wish);
});

app.delete("/workspaces/:wsId/work-schedule/wishes/:wishId", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canEditWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const result = deleteEmployeeScheduleWish(req.params.wishId, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/workspaces/:wsId/work-schedule/absences", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  return res.json(listEmployeeAbsencePeriods(req.authUserId!, wsId));
});

app.post("/workspaces/:wsId/work-schedule/absences", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { employeeId?: string; startDate?: unknown; endDate?: unknown; label?: unknown };
  if (!body.employeeId?.trim()) return res.status(400).json({ error: "employee_id_required" });
  const result = createEmployeeAbsencePeriod({
    editorId: req.authUserId!,
    workspaceId: wsId,
    employeeId: body.employeeId.trim(),
    startDate: body.startDate,
    endDate: body.endDate,
    label: body.label,
  });
  if (!result.ok) {
    const code =
      result.reason === "forbidden"
        ? 403
        : result.reason === "employee_not_found"
          ? 404
          : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.status(201).json(result.period);
});

app.delete("/workspaces/:wsId/work-schedule/absences/:absenceId", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canEditWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const result = deleteEmployeeAbsencePeriod(req.params.absenceId, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.post("/workspaces/:wsId/work-schedule/generate", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { yearMonth?: string };
  if (!body.yearMonth?.trim()) return res.status(400).json({ error: "year_month_required" });
  const result = generateMonthlyWorkPlan(req.authUserId!, wsId, body.yearMonth.trim());
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.status(201).json(result.plan);
});

app.get("/workspaces/:wsId/work-schedule/plans", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  return res.json(listMonthlyWorkPlans(req.authUserId!, wsId));
});

app.get("/workspaces/:wsId/work-schedule/plans/:planId", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const p = getMonthlyWorkPlan(req.authUserId!, req.params.planId);
  if (!p || p.workspaceId !== wsId) return res.status(404).json({ error: "not_found" });
  return res.json(p);
});

app.get("/workspaces/:wsId/work-schedule/viewers", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const result = getWorkScheduleViewersForEditor(req.authUserId!, wsId);
  if (!result.ok) return res.status(403).json({ error: result.reason });
  const viewers = result.viewerUserIds.map((userId) => {
    const u = users.find((x) => x.id === userId);
    return { userId, displayName: u?.displayName ?? userId };
  });
  return res.json({ viewerUserIds: result.viewerUserIds, viewers });
});

app.put("/workspaces/:wsId/work-schedule/viewers", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { viewerUserIds?: unknown };
  const raw = body.viewerUserIds;
  const viewerUserIds = Array.isArray(raw) ? raw.map((x) => String(x)) : [];
  const result = setWorkScheduleViewers({
    editorId: req.authUserId!,
    workspaceId: wsId,
    viewerUserIds,
  });
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.reason });
  }
  const viewers = result.viewerUserIds.map((userId) => {
    const u = users.find((x) => x.id === userId);
    return { userId, displayName: u?.displayName ?? userId };
  });
  return res.json({ viewerUserIds: result.viewerUserIds, viewers });
});

app.get("/workspaces/:wsId/work-schedule/chat", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  if (!canViewWorkSchedule(req.authUserId!, wsId)) return res.status(403).json({ error: "forbidden" });
  const rows = listWorkScheduleChatMessages(req.authUserId!, wsId);
  return res.json(
    rows.map((m) => ({
      ...m,
      authorDisplayName: users.find((u) => u.id === m.authorUserId)?.displayName ?? "Unbekannt",
    }))
  );
});

app.post("/workspaces/:wsId/work-schedule/chat", requireAuth, (req, res) => {
  const wsId = req.params.wsId;
  const body = req.body as { body?: string };
  const result = postWorkScheduleChatMessage({
    authorId: req.authUserId!,
    workspaceId: wsId,
    body: body.body ?? "",
  });
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 400;
    return res.status(code).json({ error: result.reason });
  }
  const m = result.message;
  return res.status(201).json({
    ...m,
    authorDisplayName: users.find((u) => u.id === m.authorUserId)?.displayName ?? "Unbekannt",
  });
});

app.get("/contracts/custom-categories", requireAuth, (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "").trim();
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });
  if (!isWorkspaceMember(req.authUserId!, workspaceId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listContractCustomCategories(req.authUserId!, workspaceId));
});

app.post("/contracts/custom-categories", requireAuth, (req, res) => {
  const body = req.body as { workspaceId?: string; label?: string };
  if (!body.workspaceId?.trim() || !body.label?.trim()) {
    return res.status(400).json({ error: "workspaceId_label_required" });
  }
  const result = createContractCustomCategory({
    ownerUserId: req.authUserId!,
    workspaceId: body.workspaceId.trim(),
    label: body.label,
  });
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json(result.cat);
});

app.delete("/contracts/custom-categories/:id", requireAuth, (req, res) => {
  const result = deleteContractCustomCategory(req.params.id, req.authUserId!);
  if (!result.ok) {
    const code =
      result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/contracts/bundles", requireAuth, (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "").trim();
  if (!workspaceId) return res.status(400).json({ error: "workspace_id_required" });
  if (!isWorkspaceMember(req.authUserId!, workspaceId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  const scopeRaw = req.query.scope;
  const categoryKey = String(req.query.categoryKey ?? "").trim() || undefined;
  const ownerUserId = String(req.query.ownerUserId ?? "").trim() || undefined;
  const scope =
    scopeRaw === "personal" || scopeRaw === "family" ? scopeRaw : undefined;
  const rows = listContractBundles(req.authUserId!, workspaceId, {
    scope,
    categoryKey,
    ownerUserId,
  });
  return res.json(rows.map(toContractSummary));
});

app.get("/contracts/bundles/:id", requireAuth, (req, res) => {
  const b = getContractBundle(req.params.id);
  if (!b) return res.status(404).json({ error: "not_found" });
  if (!canViewContractBundle(req.authUserId!, b)) return res.status(403).json({ error: "forbidden" });
  return res.json(b);
});

app.post("/contracts/bundles", requireAuth, (req, res) => {
  const body = req.body as {
    workspaceId?: string;
    scope?: string;
    categoryKey?: string;
    title?: string;
    pageDataUrls?: string[];
    visibilityUserIds?: string[];
  };
  if (!body.workspaceId?.trim() || !body.categoryKey?.trim() || !Array.isArray(body.pageDataUrls)) {
    return res.status(400).json({ error: "workspaceId_category_pages_required" });
  }
  const result = createContractBundle({
    ownerUserId: req.authUserId!,
    workspaceId: body.workspaceId.trim(),
    scope: body.scope === "family" ? "family" : "personal",
    categoryKey: body.categoryKey.trim(),
    title: body.title ?? "",
    pageDataUrls: body.pageDataUrls,
    visibilityUserIds: Array.isArray(body.visibilityUserIds) ? body.visibilityUserIds : [],
  });
  if (!result.ok) return res.status(400).json({ error: result.reason });
  return res.status(201).json(toContractSummary(result.bundle));
});

app.patch("/contracts/bundles/:id", requireAuth, (req, res) => {
  const body = req.body as {
    title?: string;
    visibilityUserIds?: string[];
    appendPageDataUrls?: string[];
  };
  const patch: Parameters<typeof updateContractBundle>[2] = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.visibilityUserIds !== undefined) patch.visibilityUserIds = body.visibilityUserIds;
  if (body.appendPageDataUrls !== undefined) patch.appendPageDataUrls = body.appendPageDataUrls;
  const result = updateContractBundle(req.params.id, req.authUserId!, patch);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : result.reason === "not_found" ? 404 : 400;
    return res.status(code).json({ error: result.reason });
  }
  return res.json(toContractSummary(result.bundle));
});

app.delete("/contracts/bundles/:id", requireAuth, (req, res) => {
  const result = deleteContractBundle(req.params.id, req.authUserId!);
  if (!result.ok) {
    const code = result.reason === "forbidden" ? 403 : 404;
    return res.status(code).json({ error: result.reason });
  }
  return res.json({ ok: true });
});

app.get("/attachments/:id/download", requireAuth, (req, res) => {
  const meta = attachmentRegistry.get(req.params.id);
  if (!meta) return res.status(404).json({ error: "attachment not found" });
  const safeName = meta.fileName.replace(/[^\w.\-]+/g, "_");
  res.setHeader("Content-Type", meta.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.send(
    `NeonLink Mock-Download\nDatei: ${meta.fileName}\nMIME: ${meta.mimeType}\n(In Produktion wäre hier der echte Inhalt.)\n`
  );
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
socketIo = io;

setChatMessageBroadcaster((roomId, message) => {
  io.to(`room:${roomId}`).emit("chat:messageCreated", message);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return next(new Error("unauthorized"));
  }
  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  const socketUserId = socket.data.userId as string;
  socket.join(`user:${socketUserId}`);

  socket.on("room:join", (roomId: string) => {
    const room = findRoomById(roomId);
    if (!room || !canUserAccessRoom(socketUserId, room)) return;
    socket.join(`room:${roomId}`);
  });

  socket.on("room:leave", (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  socket.on(
    "chat:sendMessage",
    (payload: {
      roomId: string;
      senderUserId: string;
      body: string;
      replyToId?: string;
      attachments?: Array<{ fileName: string; mimeType: string; sizeBytes: number }>;
    }) => {
      const { roomId, senderUserId, body } = payload;
      if (senderUserId !== socketUserId) return;
      const text = body?.trim() ?? "";
      const hasAttachments = Boolean(payload.attachments?.length);
      if (!roomId || !senderUserId || (!text && !hasAttachments)) return;

      const room = findRoomById(roomId);
      if (!room || !canUserAccessRoom(socketUserId, room)) return;

      const message = createMessage(roomId, senderUserId, text || "(Anhang)", {
        replyToId: payload.replyToId,
        attachments: payload.attachments,
      });
      io.to(`room:${roomId}`).emit("chat:messageCreated", message);
    }
  );

  socket.on(
    "chat:typing",
    (payload: { roomId: string; userId: string; displayName: string; isTyping: boolean }) => {
      if (payload.userId !== socketUserId) return;
      if (!payload.roomId || !payload.userId) return;
      const room = findRoomById(payload.roomId);
      if (!room || !canUserAccessRoom(socketUserId, room)) return;
      socket.to(`room:${payload.roomId}`).emit("chat:typing", payload);
    }
  );
});

const port = Number(process.env.PORT ?? 4000);

const staticDistRaw = process.env.STATIC_DIST_PATH?.trim();
/** Express sendFile/static brauchen absolute Pfade; ../dist relativ zu cwd (z. B. Railway: /app/server). */
const staticDist = staticDistRaw ? path.resolve(process.cwd(), staticDistRaw) : undefined;
if (staticDist && fs.existsSync(staticDist)) {
  const indexHtml = path.join(staticDist, "index.html");
  app.use(express.static(staticDist, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/socket.io")) return next();
    if (!fs.existsSync(indexHtml)) return next();
    res.sendFile(indexHtml);
  });
}

const listenHost =
  process.env.BIND_ADDRESS?.trim() ||
  (staticDist && fs.existsSync(staticDist) ? "127.0.0.1" : undefined);

function onListen() {
  const hostLabel = listenHost ?? "0.0.0.0";
  console.log(`NeonLink server listening on http://${hostLabel}:${port}`);
}

if (listenHost) {
  httpServer.listen(port, listenHost, onListen);
} else {
  httpServer.listen(port, onListen);
}
