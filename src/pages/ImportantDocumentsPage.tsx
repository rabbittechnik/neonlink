import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileBadge2, Loader2, Search, Trash2, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { readFilesFromFileInputEvent } from "@/utils/readFileInputFiles";
import { fileToContractDataUrl } from "@/utils/fileToContractDataUrl";
import type { ContractBundleDetail, ContractBundleSummary } from "@/types/contracts";

const DOC_CATEGORIES = [
  "geburtsurkunde",
  "heiratsurkunde",
  "meldebestaetigung",
  "personalausweis",
  "reisepass",
  "krankenkasse",
  "kfz_versicherung",
  "versicherungsschein",
  "lohnabrechnung",
  "rentenunterlagen",
  "steuer",
  "schule_kita",
  "sonstiges",
] as const;

type DocCategory = (typeof DOC_CATEGORIES)[number];

const DOC_LABELS: Record<DocCategory, string> = {
  geburtsurkunde: "Geburtsurkunde",
  heiratsurkunde: "Heiratsurkunde",
  meldebestaetigung: "Meldebestätigung",
  personalausweis: "Personalausweis",
  reisepass: "Reisepass",
  krankenkasse: "Krankenkasse",
  kfz_versicherung: "Kfz-Versicherung",
  versicherungsschein: "Versicherungsschein",
  lohnabrechnung: "Lohnabrechnung",
  rentenunterlagen: "Rentenunterlagen",
  steuer: "Steuer",
  schule_kita: "Schule / Kita",
  sonstiges: "Sonstiges",
};

export default function ImportantDocumentsPage() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; ownerUserId: string }>>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [records, setRecords] = useState<ContractBundleSummary[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocCategory | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocCategory>("geburtsurkunde");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newVisibility, setNewVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContractBundleDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const mine = useMemo(() => user?.id ?? "", [user?.id]);

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
        if (!c) setWorkspaceId(null);
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
        const m = await fetchJson<Array<{ userId: string; user: { id: string; displayName: string } | null }>>(
          `/workspaces/${workspaceId}/members`
        );
        if (c) return;
        setMembers(
          m
            .filter((x) => x.user)
            .map((x) => ({ userId: x.user!.id, displayName: x.user!.displayName }))
        );
      } catch {
        if (!c) setMembers([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [workspaceId, fetchJson]);

  const reloadRecords = useCallback(async () => {
    if (!workspaceId) return;
    setError(null);
    try {
      const rows: ContractBundleSummary[] = [];
      const cats = activeCategory === "all" ? DOC_CATEGORIES : [activeCategory];
      for (const cat of cats) {
        const qs = new URLSearchParams({ workspaceId, scope: "family", categoryKey: cat });
        if (ownerFilter) qs.set("ownerUserId", ownerFilter);
        const batch = await fetchJson<ContractBundleSummary[]>(`/contracts/bundles?${qs.toString()}`);
        rows.push(...batch);
      }
      rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setRecords(rows);
    } catch {
      setError("Konnte Unterlagen nicht laden.");
      setRecords([]);
    }
  }, [workspaceId, activeCategory, ownerFilter, fetchJson]);

  useEffect(() => {
    void reloadRecords();
  }, [reloadRecords]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setSelectedLoading(true);
    void (async () => {
      try {
        const d = await fetchJson<ContractBundleDetail>(`/contracts/bundles/${selectedId}`);
        if (!cancelled) setSelected(d);
      } catch {
        if (!cancelled) setSelected(null);
      } finally {
        if (!cancelled) setSelectedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, fetchJson]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((doc) => {
        if (!q) return true;
        return (
          doc.title.toLowerCase().includes(q) ||
          DOC_LABELS[doc.categoryKey as DocCategory]?.toLowerCase().includes(q)
        );
      });
  }, [records, activeCategory, search]);

  const uploadDoc = async () => {
    if (!workspaceId || !title.trim() || newFiles.length === 0) return;
    setSaving(true);
    try {
      const pages = await Promise.all(newFiles.map((f) => fileToContractDataUrl(f)));
      const visibilityUserIds = Object.entries(newVisibility)
        .filter(([, v]) => v)
        .map(([id]) => id);
      const res = await authFetch("/contracts/bundles", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          scope: "family",
          categoryKey: category,
          title: title.trim(),
          pageDataUrls: pages,
          visibilityUserIds,
        }),
      });
      if (!res.ok) {
        setError("Speichern fehlgeschlagen.");
        return;
      }
      setTitle("");
      setCategory("geburtsurkunde");
      setNewFiles([]);
      setNewVisibility({});
      await reloadRecords();
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = (id: string) => {
    void (async () => {
      if (!confirm("Unterlage wirklich löschen?")) return;
      const res = await authFetch(`/contracts/bundles/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setSelected(null);
      setSelectedId(null);
      await reloadRecords();
    })();
  };

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.16),transparent_30%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur App
          </Link>
          <div className="flex items-center gap-2 text-emerald-300">
            <FileBadge2 className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Wichtige Unterlagen</h1>
          </div>
        </div>

        <p className="text-sm text-white/65 max-w-3xl mb-6">
          Pro Upload wählst du, welche Workspace-Mitglieder Zugriff erhalten. Ohne Auswahl bleibt die Unterlage nur
          für dich sichtbar. Über Rubriken wie <span className="text-white/90">Geburtsurkunde</span> findest du alles
          schneller wieder.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4 border border-emerald-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle>Neue Unterlage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <div>
                  <label className="text-xs text-white/55">Workspace</label>
                  <select
                    value={workspaceId ?? ""}
                    onChange={(e) => setWorkspaceId(e.target.value || null)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              <div>
                  <label className="text-xs text-white/55">Datei(en) (Bild/PDF) *</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="mt-1 text-sm w-full"
                    onChange={(e) => {
                      setError(null);
                      setNewFiles(readFilesFromFileInputEvent(e));
                    }}
                  />
                </div>
              <div>
                <label className="text-xs text-white/55">Titel *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-white/5 border-white/15"
                  placeholder="z. B. Max Mustermann Geburtsurkunde"
                />
              </div>
              <div>
                <label className="text-xs text-white/55">Rubrik</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocCategory)}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
                >
                  {DOC_CATEGORIES.map((key) => (
                    <option key={key} value={key}>
                      {DOC_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/55 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Sichtbar für Mitglieder (optional)
                </label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {members
                    .filter((m) => m.userId !== mine)
                    .map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(newVisibility[m.userId])}
                          onChange={(e) =>
                            setNewVisibility((prev) => ({ ...prev, [m.userId]: e.target.checked }))
                          }
                        />
                        {m.displayName}
                      </label>
                    ))}
                </div>
              </div>
              <Button
                type="button"
                disabled={!workspaceId || newFiles.length === 0 || !title.trim() || saving}
                onClick={() => void uploadDoc()}
                className="w-full rounded-xl bg-emerald-500/25 border border-emerald-400/35"
              >
                <Upload className="h-4 w-4 mr-2" />
                {saving ? "Speichern…" : "Unterlage speichern"}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-8 space-y-4">
            <Card className="border border-white/10 bg-white/5 text-white">
              <CardContent className="pt-5 space-y-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/15"
                    placeholder="Schnellsuche nach Titel, Datei, Rubrik…"
                  />
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      activeCategory === "all"
                        ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100"
                        : "bg-white/5 border-white/10 text-white/70"
                    }`}
                  >
                    Alle
                  </button>
                  {DOC_CATEGORIES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveCategory(key)}
                      className={`px-3 py-1.5 rounded-full text-xs border ${
                        activeCategory === key
                          ? "bg-emerald-500/25 border-emerald-300/40 text-emerald-100"
                          : "bg-white/5 border-white/10 text-white/70"
                      }`}
                    >
                      {DOC_LABELS[key]}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Lade Unterlagen…
                </div>
              ) : filtered.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55">
                  Keine Unterlagen für diese Auswahl gefunden.
                </div>
              ) : (
                filtered.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-colors"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-white/55">
                      {DOC_LABELS[(doc.categoryKey as DocCategory) ?? "sonstiges"] ?? doc.categoryKey}
                    </div>
                    <div className="text-base font-semibold mt-1">{doc.title}</div>
                    <div className="text-xs text-white/60 mt-1 truncate">{doc.pageCount} Seite(n)</div>
                    <div className="text-xs text-white/45 mt-2">
                      {new Date(doc.createdAt).toLocaleDateString("de-DE")}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selected || selectedLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-emerald-400/25 bg-[#0a1020] text-white">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{selectedLoading ? "Lädt…" : selected?.title}</CardTitle>
                {selected ? (
                  <p className="text-sm text-white/60 mt-1">
                    {DOC_LABELS[(selected.categoryKey as DocCategory) ?? "sonstiges"] ?? selected.categoryKey}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => selected && removeDoc(selected.id)}
                  className="text-red-300"
                  disabled={!selected}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Löschen
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedId(null);
                    setSelected(null);
                  }}
                >
                  Schließen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedLoading ? <Loader2 className="h-6 w-6 animate-spin text-cyan-200" /> : null}
              {selected?.pageDataUrls?.map((url, idx) => (
                <div key={`${selected.id}-${idx}`} className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  {url.startsWith("data:application/pdf") ? (
                    <a
                      href={url}
                      download={`${selected.title}-seite-${idx + 1}.pdf`}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 m-3"
                    >
                      PDF Seite {idx + 1} herunterladen
                    </a>
                  ) : (
                    <img src={url} alt={`${selected.title} ${idx + 1}`} className="w-full max-h-[70vh] object-contain" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
