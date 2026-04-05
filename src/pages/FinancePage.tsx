import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceRecordDetail, FinanceRecordSummary } from "@/types/finance";
import { FINANCE_CATEGORY_LABELS, FINANCE_CATEGORY_OPTIONS } from "@/constants/financeCategories";
import { fileToAvatarDataUrl } from "@/utils/fileToAvatarDataUrl";
import { readFilesFromFileInputEvent } from "@/utils/readFileInputFiles";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(
    cents / 100
  );
}

function statusLabel(s: FinanceRecordSummary["status"]) {
  switch (s) {
    case "paid":
      return "Bezahlt";
    case "overdue":
      return "Offen / überfällig";
    default:
      return "Noch zu zahlen";
  }
}

export default function FinancePage() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; ownerUserId: string }>>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [scope, setScope] = useState<"personal" | "family">("personal");
  const [ownerFilter, setOwnerFilter] = useState<string>(""); // "" = alle sichtbaren
  const [records, setRecords] = useState<FinanceRecordSummary[]>([]);
  const [members, setMembers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("strom");
  const [formPayee, setFormPayee] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formPaid, setFormPaid] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formExtra, setFormExtra] = useState<string | null>(null);
  const [formImageError, setFormImageError] = useState<string | null>(null);
  const [formImageProcessing, setFormImageProcessing] = useState(false);
  const [formVisibility, setFormVisibility] = useState<Record<string, boolean>>({});

  const fetchJson = useCallback(
    async <T,>(path: string): Promise<T> => {
      const res = await authFetch(path);
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        throw new Error("unauthorized");
      }
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<T>;
    },
    [authFetch, logout, navigate]
  );

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const list = await fetchJson<Array<{ id: string; name: string; ownerUserId: string }>>("/workspaces");
        if (c) return;
        setWorkspaces(list);
        const own = list.find((w) => w.ownerUserId === user?.id);
        setWorkspaceId(own?.id ?? list[0]?.id ?? null);
      } catch {
        setWorkspaceId(null);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [fetchJson, user?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    let c = false;
    void (async () => {
      try {
        const m = await fetchJson<
          Array<{ userId: string; user: { id: string; displayName: string } | null }>
        >(`/workspaces/${workspaceId}/members`);
        if (c) return;
        setMembers(
          m
            .filter((x) => x.user)
            .map((x) => ({ userId: x.user!.id, displayName: x.user!.displayName }))
        );
      } catch {
        setMembers([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [workspaceId, fetchJson]);

  const reloadRecords = useCallback(async () => {
    if (!workspaceId) return;
    setListError(null);
    try {
      const qs = new URLSearchParams({ workspaceId, scope, kind });
      if (ownerFilter) qs.set("ownerUserId", ownerFilter);
      const rows = await fetchJson<FinanceRecordSummary[]>(`/finance/records?${qs.toString()}`);
      setRecords(rows);
    } catch {
      setListError("Konnte Einträge nicht laden.");
    }
  }, [workspaceId, scope, kind, ownerFilter, fetchJson]);

  useEffect(() => {
    void reloadRecords();
  }, [reloadRecords]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await fetchJson<FinanceRecordDetail>(`/finance/records/${id}`);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormAmount("");
    setFormCategory("strom");
    setFormPayee("");
    setFormDue("");
    setFormPaid(false);
    setFormNotes("");
    setFormImage(null);
    setFormExtra(null);
    setFormImageError(null);
    setFormImageProcessing(false);
    setFormVisibility({});
  };

  const submitCreate = async () => {
    if (!workspaceId || !user || !formImage || !formTitle.trim()) return;
    const euros = formAmount.replace(",", ".").trim();
    const cents = Math.round((Number.parseFloat(euros) || 0) * 100);
    const vis = Object.entries(formVisibility)
      .filter(([, v]) => v)
      .map(([id]) => id);
    setSaving(true);
    try {
      const res = await authFetch("/finance/records", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          scope,
          kind,
          category: formCategory,
          title: formTitle.trim(),
          amountCents: cents,
          currency: "EUR",
          dueDate: formDue ? new Date(formDue).toISOString() : null,
          paidAt: formPaid ? new Date().toISOString() : null,
          payee: formPayee.trim() || null,
          notes: formNotes.trim() || null,
          imageDataUrl: formImage,
          extraAttachmentDataUrl: formExtra,
          visibilityUserIds: vis,
        }),
      });
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setListError(e.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setCreateOpen(false);
      resetForm();
      await reloadRecords();
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (id: string) => {
    try {
      const res = await authFetch(`/finance/records/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ paidAt: new Date().toISOString() }),
      });
      if (!res.ok) return;
      if (detail?.id === id) {
        await openDetail(id);
      }
      await reloadRecords();
    } catch {
      /* ignore */
    }
  };

  const removeRecord = async (id: string) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    try {
      const res = await authFetch(`/finance/records/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDetail(null);
      await reloadRecords();
    } catch {
      /* ignore */
    }
  };

  const mine = useMemo(() => user?.id ?? "", [user?.id]);

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.15),transparent_30%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur App
          </Link>
          <Link
            to="/vertraege"
            className="inline-flex items-center gap-2 text-sm text-violet-300/90 hover:text-violet-100"
          >
            Zu Verträgen
          </Link>
          <div className="flex items-center gap-2 text-emerald-300">
            <Banknote className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Finanzen</h1>
          </div>
        </div>

        <p className="text-sm text-white/60 max-w-3xl mb-6 leading-relaxed">
          Dein privater Bereich für <span className="text-white/85">Rechnungen</span> und{" "}
          <span className="text-white/85">Einnahmen</span> (Lohn, Verkäufe, …). Nach dem Fotografieren der
          Beleg bitte Betrag, Fälligkeit und Empfänger eintragen — automatische Texterkennung (OCR) können wir
          später anbinden.{" "}
          <span className="text-amber-200/90">
            Sichtbarkeit: nur du, bis du Workspace-Mitglieder auswählst. Pro Person filterbar, damit nichts
            vermischt.
          </span>
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-cyan-200/80">
            <Loader2 className="h-5 w-5 animate-spin" /> Lade Workspaces…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-6 items-end">
              <div>
                <label className="block text-xs text-white/50 mb-1">Workspace</label>
                <select
                  className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
                  value={workspaceId ?? ""}
                  onChange={(e) => setWorkspaceId(e.target.value || null)}
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-xl border border-white/15 p-1 bg-black/20">
                <button
                  type="button"
                  onClick={() => setKind("expense")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    kind === "expense" ? "bg-rose-500/25 text-rose-100" : "text-white/55"
                  }`}
                >
                  Ausgaben
                </button>
                <button
                  type="button"
                  onClick={() => setKind("income")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    kind === "income" ? "bg-emerald-500/25 text-emerald-100" : "text-white/55"
                  }`}
                >
                  Einnahmen
                </button>
              </div>
              <div className="flex rounded-xl border border-white/15 p-1 bg-black/20">
                <button
                  type="button"
                  onClick={() => setScope("personal")}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    scope === "personal" ? "bg-cyan-500/20 text-cyan-100" : "text-white/55"
                  }`}
                >
                  Privat
                </button>
                <button
                  type="button"
                  onClick={() => setScope("family")}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    scope === "family" ? "bg-fuchsia-500/20 text-fuchsia-100" : "text-white/55"
                  }`}
                >
                  Familie
                </button>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Einträge von</label>
                <select
                  className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm max-w-[14rem]"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="">Alle (die ich sehen darf)</option>
                  <option value={mine}>Nur meine</option>
                  {members
                    .filter((m) => m.userId !== mine)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                  setCreateOpen(true);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 border border-emerald-400/30 text-white ml-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neuer Eintrag
              </Button>
            </div>

            {listError ? <p className="text-sm text-red-300 mb-4">{listError}</p> : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55">
                  Noch keine Einträge in dieser Ansicht.
                </div>
              ) : (
                records.map((r) => (
                  <motion.button
                    type="button"
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => void openDetail(r.id)}
                    className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-colors"
                  >
                    <div className="flex justify-between gap-2 items-start">
                      <div>
                        <div className="text-xs text-white/45 uppercase tracking-wide">
                          {FINANCE_CATEGORY_LABELS[r.category] ?? r.category}
                          {r.ownerUserId === mine ? "" : ` · ${members.find((m) => m.userId === r.ownerUserId)?.displayName ?? "Mitglied"}`}
                        </div>
                        <div className="font-semibold text-lg mt-1">{r.title}</div>
                        <div className="text-emerald-200/90 text-xl mt-1">
                          {formatMoney(r.amountCents, r.currency)}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                          r.status === "paid"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : r.status === "overdue"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-amber-500/20 text-amber-100"
                        }`}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                    {r.dueDate ? (
                      <div className="text-xs text-white/50 mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fällig: {new Date(r.dueDate).toLocaleDateString("de-DE")}
                      </div>
                    ) : null}
                  </motion.button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-cyan-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-cyan-300" />
                {kind === "expense" ? "Ausgabe" : "Einnahme"} erfassen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-400/20 rounded-lg p-2">
                Automatische Erkennung von Betrag / Fälligkeit folgt später (OCR/KI). Bitte jetzt ausfüllen, was auf
                dem Beleg steht.
              </p>
              <p className="text-xs text-cyan-200/70 border border-cyan-400/15 rounded-lg px-2 py-1.5">
                Beleg wählen — die Vorschau erscheint darunter. Anschließend <strong>Titel</strong> ausfüllen und{" "}
                <strong>Speichern</strong> drücken, sonst wird nichts hochgeladen.
              </p>
              {formImageError ? (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2">
                  {formImageError}
                </p>
              ) : null}
              <div>
                <label className="text-xs text-white/55">Beleg-Foto *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 text-sm w-full"
                  disabled={formImageProcessing}
                  onChange={(e) => {
                    const list = readFilesFromFileInputEvent(e);
                    const f = list[0];
                    if (!f) return;
                    setFormImageError(null);
                    setListError(null);
                    setFormImageProcessing(true);
                    void (async () => {
                      try {
                        const url = await fileToAvatarDataUrl(f, 1600, 0.85);
                        setFormImage(url);
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "";
                        if (msg === "image_load_failed") {
                          setFormImageError(
                            "Dieses Bild kann der Browser nicht öffnen (oft: iPhone-HEIC). Bitte als JPEG/PNG speichern oder mit der Kamera „Kompatibel“ nutzen."
                          );
                        } else {
                          setFormImageError("Bild konnte nicht verarbeitet werden. Bitte JPEG oder PNG versuchen.");
                        }
                      } finally {
                        setFormImageProcessing(false);
                      }
                    })();
                  }}
                />
                {formImageProcessing ? (
                  <p className="text-xs text-cyan-200/80 mt-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Bild wird vorbereitet…
                  </p>
                ) : null}
                {formImage ? (
                  <div className="mt-3 rounded-xl border border-white/10 overflow-hidden max-h-48 bg-black/30">
                    <img src={formImage} alt="Belegvorschau" className="w-full max-h-48 object-contain" />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-xs text-white/55">Optional: Vertrag / zweites Bild</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 text-sm w-full"
                  onChange={(e) => {
                    const list = readFilesFromFileInputEvent(e);
                    const f = list[0];
                    if (!f) return;
                    void (async () => {
                      try {
                        setFormExtra(await fileToAvatarDataUrl(f, 1600, 0.85));
                      } catch {
                        /* ignore */
                      }
                    })();
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-white/55">Titel *</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1 bg-white/5 border-white/15"
                  placeholder="z. B. Strom Oktober"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/55">Betrag (EUR)</label>
                  <Input
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="mt-1 bg-white/5 border-white/15"
                    placeholder="82,50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/55">Kategorie</label>
                  <select
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {FINANCE_CATEGORY_OPTIONS.map(([k, lab]) => (
                      <option key={k} value={k}>
                        {lab}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/55">An wen zahlen / von wem</label>
                <Input
                  value={formPayee}
                  onChange={(e) => setFormPayee(e.target.value)}
                  className="mt-1 bg-white/5 border-white/15"
                  placeholder="z. B. Stadtwerke, Arbeitgeber"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/55">Fällig am</label>
                  <Input
                    type="date"
                    value={formDue}
                    onChange={(e) => setFormDue(e.target.value)}
                    className="mt-1 bg-white/5 border-white/15"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPaid}
                      onChange={(e) => setFormPaid(e.target.checked)}
                      className="rounded"
                    />
                    Bereits bezahlt / eingegangen
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/55">Notizen</label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 bg-white/5 border-white/15"
                  placeholder="Vertragsnummer, IBAN, …"
                />
              </div>
              <div>
                <label className="text-xs text-white/55 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Mit Workspace-Mitgliedern teilen (Lesen)
                </label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {members
                    .filter((m) => m.userId !== mine)
                    .map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(formVisibility[m.userId])}
                          onChange={(e) =>
                            setFormVisibility((prev) => ({ ...prev, [m.userId]: e.target.checked }))
                          }
                        />
                        {m.displayName}
                      </label>
                    ))}
                  {members.filter((m) => m.userId !== mine).length === 0 ? (
                    <span className="text-xs text-white/45">Keine weiteren Mitglieder im Workspace.</span>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  disabled={saving || !formImage || !formTitle.trim()}
                  onClick={() => void submitCreate()}
                  className="flex-1 rounded-xl bg-cyan-500/25 border border-cyan-400/35"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl"
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-violet-400/25 bg-[#0a1020] text-white">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{detailLoading ? "…" : detail?.title}</CardTitle>
                {detail ? (
                  <p className="text-sm text-white/55 mt-1">
                    {FINANCE_CATEGORY_LABELS[detail.category] ?? detail.category} ·{" "}
                    {formatMoney(detail.amountCents, detail.currency)}
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" onClick={() => setDetail(null)} className="shrink-0">
                Schließen
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              ) : detail ? (
                <>
                  {detail.imageDataUrl ? (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img src={detail.imageDataUrl} alt="" className="w-full max-h-80 object-contain bg-black/40" />
                    </div>
                  ) : null}
                  {detail.extraAttachmentDataUrl ? (
                    <div>
                      <div className="text-xs text-white/50 mb-1">Zweites Dokument</div>
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img
                          src={detail.extraAttachmentDataUrl}
                          alt=""
                          className="w-full max-h-64 object-contain bg-black/40"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-white/45">Status:</span> {statusLabel(detail.status)}
                    </div>
                    {detail.payee ? (
                      <div>
                        <span className="text-white/45">Empfänger:</span> {detail.payee}
                      </div>
                    ) : null}
                    {detail.dueDate ? (
                      <div>
                        <span className="text-white/45">Fällig:</span>{" "}
                        {new Date(detail.dueDate).toLocaleDateString("de-DE")}
                      </div>
                    ) : null}
                    {detail.paidAt ? (
                      <div>
                        <span className="text-white/45">Bezahlt am:</span>{" "}
                        {new Date(detail.paidAt).toLocaleDateString("de-DE")}
                      </div>
                    ) : null}
                  </div>
                  {detail.notes ? (
                    <p className="text-sm text-white/75 whitespace-pre-wrap">{detail.notes}</p>
                  ) : null}
                  {detail.ownerUserId === mine ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {detail.status !== "paid" && detail.kind === "expense" ? (
                        <Button
                          type="button"
                          onClick={() => void markPaid(detail.id)}
                          className="rounded-xl bg-emerald-500/25 border border-emerald-400/35"
                        >
                          <Check className="h-4 w-4 mr-2" /> Als bezahlt markieren
                        </Button>
                      ) : null}
                      {detail.status !== "paid" && detail.kind === "income" ? (
                        <Button
                          type="button"
                          onClick={() => void markPaid(detail.id)}
                          className="rounded-xl bg-emerald-500/25 border border-emerald-400/35"
                        >
                          <Check className="h-4 w-4 mr-2" /> Als eingegangen markieren
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void removeRecord(detail.id)}
                        className="text-red-300 hover:text-red-100 hover:bg-red-500/15"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Löschen
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-white/45">Nur der Besitzer kann ändern oder löschen.</p>
                  )}
                </>
              ) : (
                <p className="text-red-300">Konnte Details nicht laden.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
