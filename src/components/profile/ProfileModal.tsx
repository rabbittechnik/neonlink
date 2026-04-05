import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  Mail,
  Phone,
  Shield,
  User,
  X,
  XCircle,
  Loader2,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ContactVisibility, PresenceKind } from "@/auth/AuthContext";
import { useAuth } from "@/auth/AuthContext";
import { fileToAvatarDataUrl } from "@/utils/fileToAvatarDataUrl";
import { maskPhoneDigits } from "@/utils/maskPhone";

const STATUS_OPTIONS: { value: PresenceKind; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "away", label: "Abwesend" },
  { value: "busy", label: "Beschäftigt" },
  { value: "offline", label: "Offline" },
  { value: "on_call", label: "Im Einsatz" },
];

const VIS_OPTIONS: { value: ContactVisibility; label: string; icon: React.ReactNode }[] = [
  { value: "private", label: "Nur ich", icon: <Lock className="h-3.5 w-3.5" /> },
  { value: "workspace", label: "Workspace-Mitglieder", icon: <Users className="h-3.5 w-3.5" /> },
  { value: "public", label: "Öffentlich", icon: <Globe className="h-3.5 w-3.5" /> },
];

type Props = {
  open: boolean;
  onClose: () => void;
  activeSectionId: string;
  activeSectionLabel: string;
};

export function ProfileModal({ open, onClose, activeSectionId, activeSectionLabel }: Props) {
  const {
    user,
    setAvatar,
    updateProfile,
    startEmailVerification,
    confirmEmailVerification,
    startPhoneVerification,
    confirmPhoneVerification,
  } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [globalStatus, setGlobalStatus] = useState<PresenceKind>("online");
  const [sectionStatus, setSectionStatus] = useState<PresenceKind>("online");
  const [contactEmail, setContactEmail] = useState("");
  const [emailVis, setEmailVis] = useState<ContactVisibility>("workspace");
  const [phoneVis, setPhoneVis] = useState<ContactVisibility>("workspace");
  const [phoneInput, setPhoneInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [emailCodeOpen, setEmailCodeOpen] = useState(false);
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setDisplayName(user.displayName);
    setBio(user.bio);
    setStatusMessage(user.statusMessage);
    setGlobalStatus(user.status);
    setSectionStatus(user.statusBySection[activeSectionId] ?? user.status);
    setContactEmail(user.contactEmail);
    setEmailVis(user.emailVisibility);
    setPhoneVis(user.phoneVisibility);
    setPhoneInput(user.phoneDigits ?? "");
    setHint(null);
    setError(null);
    setEmailCodeOpen(false);
    setPhoneCodeOpen(false);
    setEmailCode("");
    setPhoneCode("");
  }, [open, user, activeSectionId]);

  if (!user) return null;

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const nextSectionMap = { ...user.statusBySection, [activeSectionId]: sectionStatus };
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        statusMessage: statusMessage.trim(),
        status: globalStatus,
        statusBySection: nextSectionMap,
        contactEmail: contactEmail.trim(),
        emailVisibility: emailVis,
        phoneVisibility: phoneVis,
        ...(phoneInput.trim() ? { phone: phoneInput.trim() } : {}),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte ein Bild wählen.");
      return;
    }
    setAvatarBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file, 320, 0.85);
      await setAvatar(dataUrl);
      setHint("Profilbild aktualisiert.");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "avatar_too_large"
          ? "Bild zu groß."
          : code === "invalid_avatar_format"
            ? "Format nicht unterstützt."
            : "Upload fehlgeschlagen."
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const VerifiedIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <Check className="h-4 w-4 text-emerald-400" aria-label="Verifiziert" />
    ) : (
      <XCircle className="h-4 w-4 text-amber-400/90" aria-label="Nicht verifiziert" />
    );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            className="w-full max-w-lg max-h-[min(92vh,720px)] overflow-hidden rounded-3xl border border-white/12 bg-[#070d1c] shadow-2xl shadow-cyan-500/10 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
              <h2 id="profile-modal-title" className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-300" />
                Mein Profil
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="p-2 rounded-xl text-white/55 hover:text-white hover:bg-white/10"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              <div
                className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-white/[0.03] p-3"
                role="status"
                aria-label="Verifizierungsstatus Kontaktdaten"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Verifizierungsstatus</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div
                    className={`flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                      user.emailVerified
                        ? "border-emerald-400/35 bg-emerald-500/10"
                        : "border-amber-400/40 bg-amber-500/10"
                    }`}
                  >
                    <span className="text-xs text-white/75 flex items-center gap-2 min-w-0">
                      <Mail className="h-3.5 w-3.5 text-cyan-300/90 shrink-0" />
                      <span className="truncate">E-Mail (Profil)</span>
                    </span>
                    <span
                      className={`text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                        user.emailVerified ? "text-emerald-200" : "text-amber-100"
                      }`}
                    >
                      <VerifiedIcon ok={user.emailVerified} />
                      {user.emailVerified ? "Verifiziert" : "Noch offen"}
                    </span>
                  </div>
                  <div
                    className={`flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                      user.phoneVerified
                        ? "border-emerald-400/35 bg-emerald-500/10"
                        : "border-fuchsia-400/35 bg-fuchsia-950/20"
                    }`}
                  >
                    <span className="text-xs text-white/75 flex items-center gap-2 min-w-0">
                      <Phone className="h-3.5 w-3.5 text-fuchsia-300/90 shrink-0" />
                      <span className="truncate">Telefonnummer</span>
                    </span>
                    <span
                      className={`text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                        user.phoneVerified ? "text-emerald-200" : "text-fuchsia-100"
                      }`}
                    >
                      <VerifiedIcon ok={user.phoneVerified} />
                      {user.phoneVerified ? "Verifiziert" : "Noch offen"}
                    </span>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              {hint ? (
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  {hint}
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <Avatar className="h-28 w-28 border-2 border-cyan-400/35 ring-4 ring-cyan-500/10 overflow-hidden transition-transform group-hover:scale-[1.02]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback className="text-2xl bg-white/10 text-white">
                        {displayName.slice(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </span>
                  {avatarBusy ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <Loader2 className="h-8 w-8 text-cyan-300 animate-spin" />
                    </span>
                  ) : null}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarPick(e)} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="h-9 px-3 text-sm rounded-xl border border-white/15 bg-white/5 text-white/90"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarBusy}
                  >
                    Bild wählen
                  </Button>
                  {user.avatarUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 px-3 text-sm text-white/50 hover:text-white"
                      onClick={() => void setAvatar(null)}
                      disabled={avatarBusy}
                    >
                      Entfernen
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-white/40 text-center">Klick auf das Bild zum Hochladen · Vorschau sofort sichtbar</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                <div className="text-xs uppercase tracking-wider text-white/40">Identität</div>
                <label className="block text-xs text-white/50">Anzeigename</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white/5 border-white/12 rounded-xl text-white"
                />
                <label className="block text-xs text-white/50">Kurzstatus (für andere sichtbar)</label>
                <Input
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="z. B. In einer Besprechung"
                  className="bg-white/5 border-white/12 rounded-xl text-white placeholder:text-white/30"
                />
                <label className="block text-xs text-white/50">Bio / Beschreibung</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none"
                  placeholder="Erzähl etwas über dich…"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                <div className="text-xs uppercase tracking-wider text-white/40">Status</div>
                <label className="block text-xs text-white/50">Global (Standard)</label>
                <select
                  value={globalStatus}
                  onChange={(e) => setGlobalStatus(e.target.value as PresenceKind)}
                  className="w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#0a1020]">
                      {o.label}
                    </option>
                  ))}
                </select>
                <label className="block text-xs text-white/50 flex items-center gap-2">
                  In Bereich „{activeSectionLabel}“
                  {sectionStatus === "on_call" ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/25 text-red-200 animate-pulse">
                      Einsatz
                    </span>
                  ) : null}
                </label>
                <select
                  value={sectionStatus}
                  onChange={(e) => setSectionStatus(e.target.value as PresenceKind)}
                  className="w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#0a1020]">
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/45">
                  Überschreibt den globalen Status nur in diesem Bereich (z. B. Feuerwehr „Im Einsatz“).
                </p>
              </div>

              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-violet-200/80">
                  <Shield className="h-3.5 w-3.5" />
                  Kontakt & Sichtbarkeit
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-white/55 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-cyan-300/80" />
                      E-Mail (Profil)
                    </label>
                    <span className="flex items-center gap-1 text-[11px] text-white/50">
                      <VerifiedIcon ok={user.emailVerified} />
                      {user.emailVerified ? "verifiziert" : "offen"}
                    </span>
                  </div>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="bg-white/5 border-white/12 rounded-xl text-white"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-white/45">Sichtbarkeit:</span>
                    <select
                      value={emailVis}
                      onChange={(e) => setEmailVis(e.target.value as ContactVisibility)}
                      className="flex-1 min-w-[10rem] rounded-lg bg-white/5 border border-white/12 px-2 py-1.5 text-xs text-white"
                    >
                      {VIS_OPTIONS.map((v) => (
                        <option key={v.value} value={v.value} className="bg-[#0a1020]">
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-8 px-3 text-xs rounded-lg border border-cyan-400/30 bg-transparent text-cyan-100"
                      onClick={async () => {
                        setError(null);
                        try {
                          const v = await startEmailVerification();
                          setEmailCodeOpen(true);
                          if (v.sent) {
                            setHint("Code wurde an deine Profil-E-Mail gesendet (Postfach prüfen, ggf. Spam).");
                          } else if (v.demoHint) {
                            setHint(v.demoHint);
                          } else {
                            setHint("Prüfe dein E-Mail-Postfach.");
                          }
                        } catch (err) {
                          const code = err instanceof Error ? err.message : "";
                          setError(
                            code === "smtp_not_configured"
                              ? "E-Mail-Versand ist nicht eingerichtet (SMTP auf dem Server fehlt)."
                              : code === "email_delivery_failed"
                                ? "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen."
                                : code || "Fehler beim Senden des Codes."
                          );
                        }
                      }}
                    >
                      Verifizieren
                    </Button>
                    {emailCodeOpen ? (
                      <div className="flex gap-2 items-center flex-1 min-w-[12rem]">
                        <Input
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value)}
                          placeholder="Code"
                          className="h-8 text-sm bg-white/5 border-white/12 rounded-lg text-white"
                        />
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs rounded-lg bg-cyan-600/80 text-white shrink-0"
                          onClick={async () => {
                            try {
                              await confirmEmailVerification(emailCode.trim());
                              setEmailCodeOpen(false);
                              setHint("E-Mail verifiziert.");
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Code ungültig");
                            }
                          }}
                        >
                          OK
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-white/35">Login-E-Mail: {user.email} (Konto, getrennt von Profil-E-Mail möglich)</p>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-white/55 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-fuchsia-300/80" />
                      Telefon
                    </label>
                    <span className="flex items-center gap-1 text-[11px] text-white/50">
                      <VerifiedIcon ok={user.phoneVerified} />
                      {user.phoneVerified ? "verifiziert" : "offen"}
                    </span>
                  </div>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="z. B. 0176 12345678"
                    className="bg-white/5 border-white/12 rounded-xl text-white"
                  />
                  <p className="text-[11px] text-white/45">Vorschau (maskiert für andere): {maskPhoneDigits(phoneInput || user.phoneDigits || "")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-white/45">Sichtbarkeit:</span>
                    <select
                      value={phoneVis}
                      onChange={(e) => setPhoneVis(e.target.value as ContactVisibility)}
                      className="flex-1 min-w-[10rem] rounded-lg bg-white/5 border border-white/12 px-2 py-1.5 text-xs text-white"
                    >
                      {VIS_OPTIONS.map((v) => (
                        <option key={v.value} value={v.value} className="bg-[#0a1020]">
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-8 px-3 text-xs rounded-lg border border-fuchsia-400/30 bg-transparent text-fuchsia-100"
                      onClick={async () => {
                        setError(null);
                        try {
                          await startPhoneVerification();
                          setPhoneCodeOpen(true);
                          setHint("Demo: SMS-Code in der Server-Konsole.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Fehler");
                        }
                      }}
                    >
                      Verifizieren
                    </Button>
                    {phoneCodeOpen ? (
                      <div className="flex gap-2 items-center flex-1 min-w-[12rem]">
                        <Input
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          placeholder="Code"
                          className="h-8 text-sm bg-white/5 border-white/12 rounded-lg text-white"
                        />
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs rounded-lg bg-fuchsia-600/80 text-white shrink-0"
                          onClick={async () => {
                            try {
                              await confirmPhoneVerification(phoneCode.trim());
                              setPhoneCodeOpen(false);
                              setHint("Telefon verifiziert.");
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Code ungültig");
                            }
                          }}
                        >
                          OK
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end px-5 py-4 border-t border-white/10 shrink-0 bg-[#050a14]/90">
              <Button type="button" variant="ghost" className="text-white/70" onClick={onClose} disabled={busy}>
                Schließen
              </Button>
              <Button
                type="button"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6"
                onClick={() => void onSave()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
