import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const FRIENDSHIP_FLOW_KEYS = ["familie", "freunde", "arbeit", "feuerwehr"] as const;
export type FriendshipFlowKey = (typeof FRIENDSHIP_FLOW_KEYS)[number];

const OPTIONS: { key: FriendshipFlowKey; label: string; emoji: string }[] = [
  { key: "familie", label: "Familie", emoji: "👨‍👩‍👧" },
  { key: "freunde", label: "Freunde", emoji: "🤝" },
  { key: "arbeit", label: "Arbeit", emoji: "💼" },
  { key: "feuerwehr", label: "Feuerwehr", emoji: "🚒" },
];

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Wenn leer, Standard „freunde“ */
  initialSelected?: FriendshipFlowKey[];
  confirmLabel?: string;
  onConfirm: (keys: FriendshipFlowKey[]) => void;
  onCancel: () => void;
};

export function FriendCategoryModal({
  open,
  title,
  subtitle,
  initialSelected,
  confirmLabel = "Bestätigen",
  onConfirm,
  onCancel,
}: Props) {
  const [sel, setSel] = useState<Set<FriendshipFlowKey>>(
    () => new Set(initialSelected?.length ? initialSelected : ["freunde"])
  );

  useEffect(() => {
    if (open) {
      setSel(new Set(initialSelected?.length ? initialSelected : ["freunde"]));
    }
  }, [open, initialSelected]);

  if (!open) return null;

  const toggle = (k: FriendshipFlowKey) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Abbrechen" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/30 bg-[#0c1428] p-6 shadow-xl shadow-cyan-500/10">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="text-sm text-white/85 mt-2 leading-relaxed">{subtitle}</p> : null}
        <p className="text-[11px] text-cyan-200/90 mt-2">Mehrfachauswahl möglich — mindestens eine Kategorie.</p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((o) => (
            <label
              key={o.key}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <input
                type="checkbox"
                checked={sel.has(o.key)}
                onChange={() => toggle(o.key)}
                className="rounded border-cyan-400/50 w-4 h-4 accent-cyan-500"
              />
              <span className="text-white font-medium">
                {o.emoji} {o.label}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <Button type="button" variant="ghost" className="flex-1 text-white/90" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            type="button"
            className="flex-1 bg-cyan-500/25 border border-cyan-400/40 text-cyan-50 hover:bg-cyan-500/35"
            disabled={sel.size === 0}
            onClick={() => onConfirm([...sel])}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
