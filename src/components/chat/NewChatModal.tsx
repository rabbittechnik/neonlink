import React, { useState } from "react";
import { Globe, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type MemberOption = { id: string; displayName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  sectionLabel: string;
  membersExcludingSelf: MemberOption[];
  onCreatePrivate: (otherUserId: string) => Promise<void>;
  onCreateGroup: (name: string, participantUserIds: string[]) => Promise<void>;
};

type Step = "type" | "private" | "group";

export function NewChatModal({
  open,
  onClose,
  sectionLabel,
  membersExcludingSelf,
  onCreatePrivate,
  onCreateGroup,
}: Props) {
  const [step, setStep] = useState<Step>("type");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privatePick, setPrivatePick] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupPicks, setGroupPicks] = useState<Record<string, boolean>>({});

  const reset = () => {
    setStep("type");
    setError(null);
    setPrivatePick(null);
    setGroupName("");
    setGroupPicks({});
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  if (!open) return null;

  const toggleGroupMember = (id: string) => {
    setGroupPicks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submitPrivate = async () => {
    if (!privatePick) {
      setError("Bitte eine Person waehlen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreatePrivate(privatePick);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Privatchat fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const submitGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      setError("Bitte einen Gruppennamen eingeben.");
      return;
    }
    const ids = Object.entries(groupPicks)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      setError("Mindestens ein Mitglied auswaehlen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreateGroup(name, ids);
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gruppe konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-chat-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0a1020] shadow-2xl shadow-cyan-500/10 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <h2 id="new-chat-title" className="text-lg font-semibold text-white">
            Neuen Chat erstellen
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40"
            aria-label="Schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto">
          <p className="text-sm text-white/50">
            Bereich: <span className="text-cyan-200/90">{sectionLabel}</span>
          </p>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {step === "type" && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-white/40">Schritt 1 — Typ</div>
              <button
                type="button"
                onClick={() => {
                  setStep("private");
                  setError(null);
                }}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
              >
                <User className="h-5 w-5 text-fuchsia-300 shrink-0" />
                <div>
                  <div className="font-medium text-white">Privatchat</div>
                  <div className="text-xs text-white/50">1:1 mit einem Workspace-Mitglied</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("group");
                  setError(null);
                }}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
              >
                <Users className="h-5 w-5 text-cyan-300 shrink-0" />
                <div>
                  <div className="font-medium text-white">Gruppenchat</div>
                  <div className="text-xs text-white/50">Name und Mitglieder festlegen</div>
                </div>
              </button>
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3 text-white/35 text-sm">
                <Globe className="h-4 w-4 shrink-0" />
                <span>Hauptchat je Bereich ist fest — weitere oeffentliche Kanaele folgen spaeter.</span>
              </div>
            </div>
          )}

          {step === "private" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setStep("type");
                  setError(null);
                }}
                className="text-xs text-cyan-300 hover:underline"
              >
                Zurueck
              </button>
              <div className="text-xs uppercase tracking-wider text-white/40">Mitglied waehlen</div>
              {membersExcludingSelf.length === 0 ? (
                <p className="text-sm text-white/45">Keine anderen Mitglieder in diesem Workspace.</p>
              ) : (
                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {membersExcludingSelf.map((m) => (
                    <li key={m.id}>
                      <label className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/5">
                        <input
                          type="radio"
                          name="private-peer"
                          checked={privatePick === m.id}
                          onChange={() => setPrivatePick(m.id)}
                          className="accent-cyan-400"
                        />
                        <span className="text-sm text-white/90">{m.displayName}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                disabled={busy || membersExcludingSelf.length === 0}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                onClick={() => void submitPrivate()}
              >
                {busy ? "…" : "Chat oeffnen"}
              </Button>
            </div>
          )}

          {step === "group" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setStep("type");
                  setError(null);
                }}
                className="text-xs text-cyan-300 hover:underline"
              >
                Zurueck
              </button>
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Gruppenname</div>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z. B. Urlaub, Trupp 1"
                  className="bg-white/5 border-white/15 rounded-2xl text-white placeholder:text-white/35"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40 mb-1.5">Mitglieder</div>
                {membersExcludingSelf.length === 0 ? (
                  <p className="text-sm text-white/45">Keine anderen Mitglieder verfuegbar.</p>
                ) : (
                  <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {membersExcludingSelf.map((m) => (
                      <li key={m.id}>
                        <label className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={Boolean(groupPicks[m.id])}
                            onChange={() => toggleGroupMember(m.id)}
                            className="accent-cyan-400 rounded"
                          />
                          <span className="text-sm text-white/90">{m.displayName}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                disabled={busy || membersExcludingSelf.length === 0}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                onClick={() => void submitGroup()}
              >
                {busy ? "…" : "Gruppe erstellen"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
