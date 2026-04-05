import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactListItem } from "@/types/contacts";

function formatPhoneDisplay(digits: string): string {
  if (digits.startsWith("49") && digits.length >= 10) {
    const rest = digits.slice(2);
    return `+49 ${rest.replace(/(\d{3,4})(?=\d)/g, "$1 ").trim()}`;
  }
  return `+${digits}`;
}

export default function ContactsPage() {
  const { authFetch, logout, user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [lookupUser, setLookupUser] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch("/contacts");
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) throw new Error("load_failed");
      setRows((await res.json()) as ContactListItem[]);
    } catch {
      setError("Kontakte konnten nicht geladen werden.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, logout, navigate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!modalOpen || !addPhone.trim()) {
      setLookupUser(null);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setLookupBusy(true);
        try {
          const res = await authFetch("/contacts/lookup", {
            method: "POST",
            body: JSON.stringify({ phone: addPhone.trim() }),
          });
          if (!res.ok) {
            setLookupUser(null);
            return;
          }
          const data = (await res.json()) as {
            user: { id: string; displayName: string; avatarUrl: string | null } | null;
          };
          setLookupUser(data.user);
        } catch {
          setLookupUser(null);
        } finally {
          setLookupBusy(false);
        }
      })();
    }, 400);
    return () => window.clearTimeout(t);
  }, [addPhone, modalOpen, authFetch]);

  const openAdd = () => {
    setError(null);
    setAddName("");
    setAddPhone("");
    setLookupUser(null);
    setModalOpen(true);
  };

  const submitAdd = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({ displayName: addName.trim(), phone: addPhone.trim() }),
      });
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          e.error === "contact_exists"
            ? "Diese Nummer ist schon in deiner Liste."
            : e.error === "cannot_add_self"
              ? "Du kannst deine eigene Nummer nicht als Kontakt speichern."
              : e.error === "phone_invalid"
                ? "Ungültige Telefonnummer."
                : "Speichern fehlgeschlagen."
        );
        return;
      }
      setModalOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Kontakt wirklich löschen?")) return;
    const res = await authFetch(`/contacts/${id}`, { method: "DELETE" });
    if (res.ok) await reload();
  };

  const forwardContact = async (c: ContactListItem) => {
    const lines = [
      `Kontakt: ${c.displayName}`,
      `Telefon: ${formatPhoneDisplay(c.phoneDigits)}`,
      c.isNeonLinkUser
        ? `NeonLink-Nutzer: ${c.neonLinkDisplayName ?? "ja"}`
        : "NeonLink: nicht registriert",
    ];
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Kontakt ${c.displayName}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Kontaktdaten in die Zwischenablage kopiert.");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        alert("Kontaktdaten in die Zwischenablage kopiert.");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur App
          </Link>
          <div className="flex items-center gap-2 text-sky-200">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Meine Kontakte</h1>
          </div>
        </div>

        <p className="text-sm text-white/60 mb-6">
          Deine Kontaktliste ist <strong>nur für dich</strong> sichtbar — andere Nutzer sehen weder deine Einträge noch
          deine Freundes-Gruppen hier. Bei einer Nummer, die in NeonLink registriert ist, wird das{" "}
          <strong>Profilbild</strong> automatisch angezeigt.
        </p>

        <Button
          type="button"
          onClick={openAdd}
          className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500/30 to-violet-500/25 border border-cyan-400/30"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Kontakt hinzufügen
        </Button>

        {error ? (
          <p className="text-sm text-red-300 mb-4" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            Noch keine Kontakte. Nummer eingeben — wir prüfen, ob der Kontakt bei NeonLink registriert ist.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex gap-3 items-start"
              >
                <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/15">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-medium text-white/70">
                      {c.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex flex-wrap items-center gap-2">
                    {c.displayName}
                    {c.isNeonLinkUser ? (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        NeonLink
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-white/55 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {formatPhoneDisplay(c.phoneDigits)}
                  </div>
                  {c.isNeonLinkUser && c.neonLinkDisplayName && c.neonLinkDisplayName !== c.displayName ? (
                    <div className="text-xs text-white/40 mt-1">Profil: {c.neonLinkDisplayName}</div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-cyan-300"
                    onClick={() => void forwardContact(c)}
                    title="Weiterleiten"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-red-300"
                    onClick={() => void remove(c.id)}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {user?.phoneDigits ? (
          <p className="text-xs text-white/35 mt-8">
            Deine hinterlegte Nummer (nur für dich sichtbar): {formatPhoneDisplay(user.phoneDigits)}
          </p>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-cyan-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-300" />
                Kontakt hinzufügen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/50">
                Gib die Handynummer ein — wir gleichen mit registrierten NeonLink-Nutzern ab (ohne E-Mail oder weitere
                Daten zu zeigen).
              </p>
              <div>
                <label className="text-xs text-white/55">Name in deiner Liste</label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="z. B. Oma"
                  className="mt-1 bg-white/5 border-white/15"
                />
              </div>
              <div>
                <label className="text-xs text-white/55">Handynummer</label>
                <Input
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="z. B. 0171 1234567 oder +49 …"
                  className="mt-1 bg-white/5 border-white/15"
                  inputMode="tel"
                />
                {lookupBusy ? (
                  <p className="text-[11px] text-white/40 mt-1">Suche…</p>
                ) : lookupUser ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2">
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 shrink-0">
                      {lookupUser.avatarUrl ? (
                        <img src={lookupUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs">
                          {lookupUser.displayName.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-emerald-200">
                      Registriert: <strong>{lookupUser.displayName}</strong> — Foto wird übernommen.
                    </span>
                  </div>
                ) : addPhone.replace(/\D/g, "").length >= 8 ? (
                  <p className="text-[11px] text-white/40 mt-1">Kein NeonLink-Konto mit dieser Nummer.</p>
                ) : null}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  disabled={saving || !addName.trim() || addPhone.replace(/\D/g, "").length < 8}
                  onClick={() => void submitAdd()}
                  className="flex-1 rounded-xl bg-cyan-500/25 border border-cyan-400/35"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
