import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTRACT_PRESET_BUTTONS } from "@/constants/contractPresets";
import type { ContractBundleDetail, ContractBundleSummary, ContractCustomCategory } from "@/types/contracts";
import {
  downloadDataUrl,
  downloadDataUrlsStaggered,
  isPdfDataUrl,
  mediaExtFromDataUrl,
  slugifyDownloadBase,
} from "@/utils/downloadDataUrl";
import { fileToContractDataUrl } from "@/utils/fileToContractDataUrl";
import { readFilesFromFileInputEvent } from "@/utils/readFileInputFiles";

function categoryLabel(key: string, custom: ContractCustomCategory[]) {
  const p = CONTRACT_PRESET_BUTTONS.find((x) => x.key === key);
  if (p) return p.label;
  return custom.find((c) => c.key === key)?.label ?? key;
}

export default function ContractsPage() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; ownerUserId: string }>>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [scope, setScope] = useState<"personal" | "family">("personal");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [members, setMembers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [customCats, setCustomCats] = useState<ContractCustomCategory[]>([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [bundles, setBundles] = useState<ContractBundleSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<ContractBundleDetail | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFiles, setNewFiles] = useState<File[] | null>(null);
  const [newVisibility, setNewVisibility] = useState<Record<string, boolean>>({});
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [appending, setAppending] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedForZip, setSelectedForZip] = useState<Record<string, boolean>>({});
  const [zipping, setZipping] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

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

  const mine = useMemo(() => user?.id ?? "", [user?.id]);

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

  const reloadCustomCats = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const rows = await fetchJson<ContractCustomCategory[]>(
        `/contracts/custom-categories?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      setCustomCats(rows);
    } catch {
      setCustomCats([]);
    }
  }, [workspaceId, fetchJson]);

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

  useEffect(() => {
    void reloadCustomCats();
  }, [reloadCustomCats]);

  const reloadBundles = useCallback(async () => {
    if (!workspaceId || !selectedCategoryKey) return;
    setListError(null);
    try {
      const qs = new URLSearchParams({
        workspaceId,
        scope,
        categoryKey: selectedCategoryKey,
      });
      if (ownerFilter) qs.set("ownerUserId", ownerFilter);
      const rows = await fetchJson<ContractBundleSummary[]>(`/contracts/bundles?${qs.toString()}`);
      setBundles(rows);
    } catch {
      setListError("Konnte Verträge nicht laden.");
    }
  }, [workspaceId, scope, selectedCategoryKey, ownerFilter, fetchJson]);

  useEffect(() => {
    void reloadBundles();
  }, [reloadBundles]);

  useEffect(() => {
    const ids = new Set(bundles.map((b) => b.id));
    setSelectedForZip((prev) => {
      const next: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (ids.has(k) && v) next[k] = true;
      }
      return next;
    });
  }, [bundles]);

  const selectedZipIds = useMemo(
    () => Object.entries(selectedForZip).filter(([, v]) => v).map(([k]) => k),
    [selectedForZip]
  );

  const openViewer = async (id: string) => {
    setViewerLoading(true);
    setViewer(null);
    setPageIndex(0);
    try {
      const d = await fetchJson<ContractBundleDetail>(`/contracts/bundles/${id}`);
      setViewer(d);
    } catch {
      setViewer(null);
    } finally {
      setViewerLoading(false);
    }
  };

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setPageIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setPageIndex((i) => Math.min((viewer.pageDataUrls?.length ?? 1) - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  useEffect(() => {
    const urls = newFiles?.length ? newFiles.map((f) => URL.createObjectURL(f)) : [];
    setFilePreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newFiles]);

  const submitCreate = async () => {
    if (!workspaceId || !user || !selectedCategoryKey || !newFiles?.length) return;
    setSaving(true);
    setListError(null);
    setCreateModalError(null);
    try {
      const pageDataUrls = await Promise.all(newFiles.map((f) => fileToContractDataUrl(f)));
      const vis = Object.entries(newVisibility)
        .filter(([, v]) => v)
        .map(([id]) => id);
      const res = await authFetch("/contracts/bundles", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          scope,
          categoryKey: selectedCategoryKey,
          title: newTitle.trim() || "Vertrag",
          pageDataUrls,
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
        const msg = e.error ?? "Speichern fehlgeschlagen.";
        setListError(msg);
        setCreateModalError(msg);
        return;
      }
      setCreateOpen(false);
      setNewTitle("");
      setNewFiles(null);
      setNewVisibility({});
      await reloadBundles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      let friendly = "Dateien konnten nicht verarbeitet werden.";
      if (msg === "pdf_too_large") friendly = "PDF zu groß (max. ca. 6 MB pro Datei).";
      else if (msg === "image_load_failed")
        friendly =
          "Dieses Bild kann der Browser nicht öffnen (häufig: iPhone-„HEIC“). Bitte Foto als JPEG exportieren oder erneut als JPEG aufnehmen.";
      else if (msg === "no_canvas" || msg === "canvas_failed")
        friendly = "Bild konnte nicht verarbeitet werden. Bitte anderes Format (JPEG/PNG) versuchen.";
      setListError(friendly);
      setCreateModalError(friendly);
    } finally {
      setSaving(false);
    }
  };

  const appendPages = async (files: File[]) => {
    if (!viewer || !files.length) return;
    setAppending(true);
    setListError(null);
    try {
      const appendPageDataUrls = await Promise.all(
        files.map((f) => fileToContractDataUrl(f))
      );
      const res = await authFetch(`/contracts/bundles/${viewer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ appendPageDataUrls }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setListError(e.error ?? "Anhängen fehlgeschlagen.");
        return;
      }
      const updated = await fetchJson<ContractBundleDetail>(`/contracts/bundles/${viewer.id}`);
      setViewer(updated);
      setPageIndex(Math.max(0, updated.pageDataUrls.length - 1));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "pdf_too_large") {
        setListError("PDF zu groß (max. ca. 6 MB pro Datei).");
      } else {
        setListError("Seiten konnten nicht angehängt werden.");
      }
    } finally {
      setAppending(false);
    }
  };

  const downloadSelectedZip = async () => {
    if (!selectedCategoryKey || selectedZipIds.length === 0) return;
    setZipping(true);
    setListError(null);
    try {
      const details = await Promise.all(
        selectedZipIds.map((id) => fetchJson<ContractBundleDetail>(`/contracts/bundles/${id}`))
      );
      const cat = categoryLabel(selectedCategoryKey, customCats);
      const { downloadBundlesAsZip } = await import("@/utils/contractBundlesZip");
      await downloadBundlesAsZip(details, `${cat}_Export`);
    } catch {
      setListError("ZIP konnte nicht erstellt werden.");
    } finally {
      setZipping(false);
    }
  };

  const downloadBundleFromList = async (id: string, title: string) => {
    setDownloadingId(id);
    setListError(null);
    try {
      const d = await fetchJson<ContractBundleDetail>(`/contracts/bundles/${id}`);
      const base = slugifyDownloadBase(title);
      const ext = (i: number) => mediaExtFromDataUrl(d.pageDataUrls[i] ?? "");
      const items = d.pageDataUrls.map((url, i) => ({
        dataUrl: url,
        filename:
          d.pageDataUrls.length > 1
            ? `${base}_Seite_${i + 1}.${ext(i)}`
            : `${base}.${ext(0)}`,
      }));
      await downloadDataUrlsStaggered(items);
    } catch {
      setListError("Download fehlgeschlagen.");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadViewerCurrentPage = () => {
    if (!viewer || !pages[safePage]) return;
    const base = slugifyDownloadBase(viewer.title);
    const ext = mediaExtFromDataUrl(pages[safePage]);
    const name =
      pages.length > 1 ? `${base}_Seite_${safePage + 1}.${ext}` : `${base}.${ext}`;
    downloadDataUrl(pages[safePage], name);
  };

  const downloadViewerAllPages = async () => {
    if (!viewer || !pages.length) return;
    const base = slugifyDownloadBase(viewer.title);
    const items = pages.map((url, i) => ({
      dataUrl: url,
      filename:
        pages.length > 1
          ? `${base}_Seite_${i + 1}.${mediaExtFromDataUrl(url)}`
          : `${base}.${mediaExtFromDataUrl(url)}`,
    }));
    await downloadDataUrlsStaggered(items);
  };

  const removeBundle = async (id: string) => {
    if (!confirm("Diesen Vertrag mit allen Seiten löschen?")) return;
    try {
      const res = await authFetch(`/contracts/bundles/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setViewer(null);
      await reloadBundles();
    } catch {
      /* ignore */
    }
  };

  const submitCustomCategory = async () => {
    if (!workspaceId || !newCatLabel.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/contracts/custom-categories", {
        method: "POST",
        body: JSON.stringify({ workspaceId, label: newCatLabel.trim() }),
      });
      if (!res.ok) return;
      setAddCatOpen(false);
      setNewCatLabel("");
      await reloadCustomCats();
    } finally {
      setSaving(false);
    }
  };

  const removeCustomCategory = async (id: string) => {
    if (!confirm("Kategorie entfernen? (Nur möglich, wenn keine Dokumente darin liegen.)")) return;
    try {
      const res = await authFetch(`/contracts/custom-categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setListError(e.error ?? "Löschen nicht möglich.");
        return;
      }
      await reloadCustomCats();
    } catch {
      /* ignore */
    }
  };

  const allCategoryButtons = useMemo(() => {
    const custom = customCats.map((c) => ({ key: c.key, label: c.label, customId: c.id }));
    return { presets: CONTRACT_PRESET_BUTTONS, custom };
  }, [customCats]);

  const pages = viewer?.pageDataUrls ?? [];
  const safePage = Math.min(pageIndex, Math.max(0, pages.length - 1));

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" />
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
            to="/finance"
            className="inline-flex items-center gap-2 text-sm text-emerald-300/90 hover:text-emerald-100"
          >
            Zu Finanzen
          </Link>
          <div className="flex items-center gap-2 text-violet-200">
            <FileText className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Verträge & Dokumente</h1>
          </div>
        </div>

        <p className="text-sm text-white/60 max-w-3xl mb-6 leading-relaxed">
          Eigene Rubrik neben den Finanzen: Verträge und Nachweise nach Thema —{" "}
          <span className="text-white/80">Fotos (JPEG)</span> oder{" "}
          <span className="text-white/80">PDFs</span> (bis ca. 6 MB pro Datei), mehrere Dateien = mehrere Seiten.
          In der Liste kannst du mehrere Einträge markieren und als{" "}
          <span className="text-white/80">eine ZIP-Datei</span> speichern.{" "}
          <span className="text-amber-200/90">
            „Privat“ / „Familie“ und Filter „Dokumente von“ wie bei Finanzen.
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
                  onChange={(e) => {
                    setWorkspaceId(e.target.value || null);
                    setSelectedCategoryKey(null);
                  }}
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
                <label className="block text-xs text-white/50 mb-1">Dokumente von</label>
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
            </div>

            {listError ? <p className="text-sm text-red-300 mb-4">{listError}</p> : null}

            {!selectedCategoryKey ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-medium text-white/90">Kategorie wählen</h2>
                  <Button
                    type="button"
                    onClick={() => setAddCatOpen(true)}
                    className="rounded-xl bg-violet-500/25 border border-violet-400/35"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Eigene Kategorie
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {allCategoryButtons.presets.map((p) => (
                    <motion.button
                      key={p.key}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedCategoryKey(p.key)}
                      className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-4 text-left min-h-[4.5rem]"
                    >
                      <FileText className="h-5 w-5 text-violet-300 mb-2" />
                      <span className="text-sm font-medium leading-snug">{p.label}</span>
                    </motion.button>
                  ))}
                  {allCategoryButtons.custom.map((c) => (
                    <motion.div
                      key={c.key}
                      className="relative rounded-2xl border border-violet-400/25 bg-violet-500/10"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryKey(c.key)}
                        className="w-full text-left px-4 py-4 pr-10 min-h-[4.5rem]"
                      >
                        <FileText className="h-5 w-5 text-violet-200 mb-2" />
                        <span className="text-sm font-medium leading-snug">{c.label}</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Kategorie löschen"
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/30 hover:bg-red-500/30 text-white/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeCustomCategory(c.customId);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-cyan-300"
                    onClick={() => {
                      setSelectedCategoryKey(null);
                      setBundles([]);
                      setSelectedForZip({});
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Alle Kategorien
                  </Button>
                  <h2 className="text-lg font-medium text-white/90">
                    {categoryLabel(selectedCategoryKey, customCats)}
                  </h2>
                  <Button
                    type="button"
                    onClick={() => {
                    setNewTitle("");
                    setNewFiles(null);
                    setNewVisibility({});
                    setCreateModalError(null);
                    setCreateOpen(true);
                  }}
                    className="rounded-xl bg-gradient-to-r from-violet-500/30 to-cyan-500/25 border border-violet-400/30 ml-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Vertrag / Seiten hochladen
                  </Button>
                </div>

                {bundles.length > 0 ? (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 text-white/70"
                      onClick={() =>
                        setSelectedForZip(Object.fromEntries(bundles.map((x) => [x.id, true])))
                      }
                    >
                      Alle auswählen
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 text-white/70"
                      onClick={() => setSelectedForZip({})}
                    >
                      Keine
                    </Button>
                    <Button
                      type="button"
                      disabled={selectedZipIds.length === 0 || zipping}
                      onClick={() => void downloadSelectedZip()}
                      className="h-9 rounded-xl bg-amber-500/20 border border-amber-400/35 text-amber-100"
                    >
                      {zipping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4 mr-2" />
                      )}
                      ZIP ({selectedZipIds.length})
                    </Button>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bundles.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55 sm:col-span-2">
                      Noch keine Dokumente. „Vertrag / Seiten hochladen“: mehrere Bilder oder PDFs auf einmal = mehrere
                      Seiten.
                    </div>
                  ) : (
                    bundles.map((b) => (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors overflow-hidden min-w-0"
                      >
                        <label
                          className="shrink-0 flex items-center px-3 cursor-pointer border-r border-white/10 hover:bg-white/5"
                          title="Für ZIP markieren"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-white/30"
                            checked={Boolean(selectedForZip[b.id])}
                            onChange={() =>
                              setSelectedForZip((p) => ({ ...p, [b.id]: !p[b.id] }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void openViewer(b.id)}
                          className="flex-1 text-left p-4 min-w-0"
                        >
                          <div className="text-xs text-white/45 uppercase tracking-wide mb-1">
                            {b.pageCount} {b.pageCount === 1 ? "Seite" : "Seiten"}
                            {b.ownerUserId === mine
                              ? ""
                              : ` · ${members.find((m) => m.userId === b.ownerUserId)?.displayName ?? "Mitglied"}`}
                          </div>
                          <div className="font-semibold text-lg">{b.title}</div>
                          <div className="text-xs text-white/45 mt-2">
                            {new Date(b.updatedAt).toLocaleString("de-DE")}
                          </div>
                        </button>
                        <button
                          type="button"
                          title="Herunterladen"
                          aria-label={`${b.title} herunterladen`}
                          disabled={downloadingId === b.id}
                          onClick={() => void downloadBundleFromList(b.id, b.title)}
                          className="shrink-0 w-14 flex flex-col items-center justify-center gap-1 border-l border-white/10 hover:bg-cyan-500/15 text-cyan-200/90 disabled:opacity-50"
                        >
                          {downloadingId === b.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Download className="h-5 w-5" />
                          )}
                          <span className="text-[10px] leading-none text-white/55">Speichern</span>
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {addCatOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-violet-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle>Eigene Kategorie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-white/55">
                Erscheint als eigener Button in der Übersicht (nur für dich in diesem Workspace).
              </p>
              <Input
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                placeholder="z. B. Fitnessstudio"
                className="bg-white/5 border-white/15"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={saving || !newCatLabel.trim()}
                  onClick={() => void submitCustomCategory()}
                  className="flex-1 rounded-xl bg-violet-500/25 border border-violet-400/35"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anlegen"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAddCatOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {createOpen && selectedCategoryKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-violet-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle>Neuer Vertrag / Dokument</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-400/25 rounded-lg p-2.5">
                <strong className="text-amber-100">Wichtig:</strong> Nach „Öffnen“ erscheint die Vorschau unten. Zum
                Hochladen unbedingt <strong>Speichern</strong> drücken — erst dann landet das Dokument in der Liste.
              </p>
              {createModalError ? (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2">
                  {createModalError}
                </p>
              ) : null}
              <div>
                <label className="text-xs text-white/55">Titel</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z. B. Mietvertrag Wohnung 2024"
                  className="mt-1 bg-white/5 border-white/15"
                />
              </div>
              <div>
                <label className="text-xs text-white/55">Bilder oder PDF (mehrere = mehrere Seiten)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  multiple
                  className="mt-1 text-sm w-full"
                  disabled={saving}
                  onChange={(e) => {
                    const list = readFilesFromFileInputEvent(e);
                    setCreateModalError(null);
                    if (list.length) setNewFiles(list);
                  }}
                />
                {newFiles?.length ? (
                  <p className="text-xs text-cyan-200/80 mt-1">{newFiles.length} Datei(en) ausgewählt</p>
                ) : null}
                {filePreviewUrls.length > 0 && newFiles ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filePreviewUrls.map((src, i) => {
                      const f = newFiles[i];
                      const isPdf =
                        f &&
                        (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
                      return (
                        <div
                          key={`${src}-${i}`}
                          className="h-20 w-20 rounded-lg border border-white/15 overflow-hidden bg-black/40 shrink-0 flex items-center justify-center"
                        >
                          {isPdf ? (
                            <span className="text-[10px] text-violet-200 px-1 text-center leading-tight">
                              PDF
                            </span>
                          ) : (
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-xs text-white/55 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Mit Workspace-Mitgliedern teilen (Lesen)
                </label>
                <div className="mt-2 space-y-2 max-h-28 overflow-y-auto">
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
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  disabled={saving || !newFiles?.length}
                  onClick={() => void submitCreate()}
                  className="flex-1 rounded-xl bg-violet-500/25 border border-violet-400/35"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCreateOpen(false);
                    setNewFiles(null);
                    setCreateModalError(null);
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {viewer || viewerLoading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[94vh] overflow-hidden flex flex-col border border-violet-400/25 bg-[#0a1020] text-white">
            <CardHeader className="flex flex-row items-start justify-between gap-4 shrink-0">
              <div>
                <CardTitle>{viewerLoading ? "…" : viewer?.title}</CardTitle>
                {viewer && pages.length > 0 ? (
                  <p className="text-sm text-white/55 mt-1">
                    Seite {safePage + 1} von {pages.length} · Pfeiltasten zum Blättern
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" onClick={() => setViewer(null)} className="shrink-0">
                Schließen
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
              {viewerLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              ) : viewer && pages.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => downloadViewerCurrentPage()}
                      className="h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-100"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Diese Seite speichern
                    </Button>
                    {pages.length > 1 ? (
                      <Button
                        type="button"
                        onClick={() => void downloadViewerAllPages()}
                        className="h-9 rounded-xl bg-white/10 border border-white/15"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Alle {pages.length} Seiten
                      </Button>
                    ) : null}
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/50 min-h-[200px] flex items-center justify-center">
                    {isPdfDataUrl(pages[safePage]) ? (
                      <iframe
                        title={`Seite ${safePage + 1}`}
                        src={pages[safePage]}
                        className="w-full h-[min(70vh,520px)] bg-white"
                      />
                    ) : (
                      <img
                        src={pages[safePage]}
                        alt=""
                        className="max-h-[min(70vh,520px)] w-full object-contain"
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Vorherige Seite"
                      disabled={safePage <= 0}
                      onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 border border-white/20 text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      aria-label="Nächste Seite"
                      disabled={safePage >= pages.length - 1}
                      onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 border border-white/20 text-white disabled:opacity-30"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                  {viewer.ownerUserId === mine ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="text-sm rounded-xl bg-white/10 border border-white/15 px-3 py-2 cursor-pointer hover:bg-white/15">
                        <input
                          type="file"
                          accept="image/*,application/pdf,.pdf"
                          multiple
                          className="hidden"
                          disabled={appending}
                          onChange={(e) => {
                            void appendPages(readFilesFromFileInputEvent(e));
                          }}
                        />
                        {appending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Füge Seiten hinzu…
                          </span>
                        ) : (
                          "Weitere Seiten anhängen"
                        )}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-300 hover:text-red-200"
                        onClick={() => void removeBundle(viewer.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Gesamten Vertrag löschen
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-white/55">Keine Seiten vorhanden.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
