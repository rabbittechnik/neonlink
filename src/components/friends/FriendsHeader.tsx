import React from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onAddFriend: () => void;
  onSearch: () => void;
  searchActive: boolean;
};

export function FriendsHeader({ onAddFriend, onSearch, searchActive }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/25 text-cyan-100">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-white truncate">Freunde</h2>
          <p className="text-[10px] font-medium text-white/90 truncate">Social · nur für dich sichtbar</p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          type="button"
          onClick={onAddFriend}
          aria-label="Freund hinzufügen"
          title="Freund hinzufügen"
          className="h-8 rounded-xl border border-cyan-400/35 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 px-2.5 text-[11px] gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Freund hinzufügen</span>
        </Button>
        <Button
          type="button"
          onClick={onSearch}
          aria-pressed={searchActive}
          aria-label="Freunde suchen"
          title="Suchen"
          className={`h-8 rounded-xl border px-2.5 text-[11px] gap-1 ${
            searchActive
              ? "border-fuchsia-400/45 bg-fuchsia-500/25 text-fuchsia-50"
              : "border-white/15 bg-white/5 text-white font-medium hover:bg-white/10"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Suchen</span>
        </Button>
      </div>
    </div>
  );
}
