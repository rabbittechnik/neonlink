import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/auth/AuthContext";
import type { PresenceKind } from "@/auth/AuthContext";

export type PeerProfileData = {
  id: string;
  displayName: string;
  status: string;
  friendCode?: string;
  avatarUrl?: string | null;
  bio?: string;
  statusMessage?: string;
  statusBySection?: Record<string, string>;
  contactEmail?: string | null;
  phoneMasked?: string | null;
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
};

const STATUS_LABEL: Record<PresenceKind, string> = {
  online: "Online",
  away: "Abwesend",
  busy: "Beschäftigt",
  offline: "Offline",
  on_call: "Im Einsatz",
};

function statusLabel(s: string): string {
  if (s in STATUS_LABEL) return STATUS_LABEL[s as PresenceKind];
  return s;
}

type Props = {
  userId: string | null;
  onClose: () => void;
};

export function PeerProfileModal({ userId, onClose }: Props) {
  const { authFetch } = useAuth();
  const [data, setData] = useState<PeerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = Boolean(userId);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void authFetch(`/users/${userId}/profile`)
      .then(async (res) => {
        if (!res.ok) throw new Error("profile_failed");
        return res.json() as Promise<PeerProfileData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Profil konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, authFetch]);

  const isPrivate = data != null && !Object.prototype.hasOwnProperty.call(data, "bio");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Schließen"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="peer-profile-title"
            className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1020]/95 text-white shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h2 id="peer-profile-title" className="text-sm font-semibold tracking-wide text-white">
                Profil
              </h2>
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-9 rounded-full text-white hover:text-white hover:bg-white/10 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 max-h-[min(70vh,520px)] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-white">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <p className="text-sm">Lade Profil …</p>
                </div>
              ) : error ? (
                <p className="text-sm text-red-300/90 text-center py-8">{error}</p>
              ) : data ? (
                <div className="space-y-4">
                  {isPrivate ? (
                    <>
                      <div className="text-center text-base font-semibold text-white">{data.displayName}</div>
                      <p className="text-sm text-white text-center py-2 leading-relaxed">
                        Dieses Profil ist privat — du hast keinen Zugriff auf weitere Angaben.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 overflow-hidden rounded-2xl border border-white/15">
                          {data.avatarUrl ? (
                            <img src={data.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <AvatarFallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-500/20 text-lg">
                              {data.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-lg font-semibold truncate">{data.displayName}</div>
                          <div className="text-xs text-white/90 mt-0.5">{statusLabel(data.status)}</div>
                          {data.friendCode ? (
                            <div className="text-[11px] text-white/90 mt-1 font-mono">Code: {data.friendCode}</div>
                          ) : null}
                        </div>
                      </div>

                      {data.statusMessage?.trim() ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                          {data.statusMessage.trim()}
                        </div>
                      ) : null}

                      {data.bio?.trim() ? (
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/90 mb-1">Über mich</div>
                          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{data.bio.trim()}</p>
                        </div>
                      ) : null}

                      {data.contactEmail ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <Mail className="h-4 w-4 text-cyan-200 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="truncate text-white">{data.contactEmail}</div>
                            {data.emailVerified != null ? (
                              <div className="text-[11px] text-white/90">
                                E-Mail: {data.emailVerified ? "verifiziert" : "nicht verifiziert"}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {data.phoneMasked ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                          <Phone className="h-4 w-4 text-cyan-200 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-white">{data.phoneMasked}</div>
                            {data.phoneVerified != null ? (
                              <div className="text-[11px] text-white/90">
                                Telefon: {data.phoneVerified ? "verifiziert" : "nicht verifiziert"}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {data.statusBySection && Object.keys(data.statusBySection).length > 0 ? (
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/90 mb-1.5">
                            Status nach Bereich
                          </div>
                          <ul className="space-y-1 text-xs text-white">
                            {Object.entries(data.statusBySection).map(([k, v]) => (
                              <li key={k} className="flex justify-between gap-2 border-b border-white/5 pb-1">
                                <span className="text-white/90 truncate">{k}</span>
                                <span>{statusLabel(String(v))}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  )}

                  {isPrivate ? (
                    <div className="flex justify-center pt-2">
                      <User className="h-10 w-10 text-white/70" aria-hidden />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
