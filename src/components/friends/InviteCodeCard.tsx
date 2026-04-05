import React, { useState } from "react";
import { Copy, Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  friendCode: string;
  onCopyFriendCode: () => void;
  onRegenerateFriendCode: () => Promise<void>;
  activeWorkspaceId: string | null;
  workspaceInviteCode: string;
  onWorkspaceInviteCodeChange: (v: string) => void;
  onJoinWorkspace: () => void;
  generatedWorkspaceInviteCode: string;
  onCreateWorkspaceInvite: () => void;
  copyHint: string | null;
};

export function InviteCodeCard({
  friendCode,
  onCopyFriendCode,
  onRegenerateFriendCode,
  activeWorkspaceId,
  workspaceInviteCode,
  onWorkspaceInviteCodeChange,
  onJoinWorkspace,
  generatedWorkspaceInviteCode,
  onCreateWorkspaceInvite,
  copyHint,
}: Props) {
  const [regenBusy, setRegenBusy] = useState(false);

  return (
    <Card className="rounded-3xl border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white backdrop-blur-xl shadow-lg shadow-black/25">
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
          <span className="text-base" aria-hidden>
            🔗
          </span>
          Dein Freundescode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-3 shadow-inner shadow-black/20">
          <div className="text-[10px] uppercase tracking-wider text-cyan-200/70 mb-1.5">Code teilen</div>
          <div className="font-mono text-sm sm:text-base font-medium tracking-wide text-cyan-50 break-all">
            {friendCode || "—"}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              type="button"
              onClick={onCopyFriendCode}
              disabled={!friendCode}
              className="h-8 rounded-xl border border-cyan-300/35 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 text-xs gap-1.5 px-3"
            >
              <Copy className="h-3.5 w-3.5" />
              Kopieren
            </Button>
            <Button
              type="button"
              disabled={regenBusy}
              onClick={() => {
                setRegenBusy(true);
                void onRegenerateFriendCode().finally(() => setRegenBusy(false));
              }}
              className="h-8 rounded-xl border border-violet-400/35 bg-violet-500/20 text-violet-50 hover:bg-violet-500/30 text-xs gap-1.5 px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenBusy ? "animate-spin" : ""}`} />
              Neu generieren
            </Button>
          </div>
          {copyHint ? <p className="text-[11px] font-medium text-emerald-200 mt-2">{copyHint}</p> : null}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Link2 className="h-4 w-4 text-white/90 shrink-0" />
            <span className="text-xs font-semibold">Team-Workspace</span>
          </div>
          {!activeWorkspaceId ? (
            <p className="text-[11px] font-medium text-amber-100 leading-snug">
              Workspace wird geladen — Team-Einladungen sind danach verfügbar.
            </p>
          ) : null}
          <Button
            type="button"
            disabled={!activeWorkspaceId}
            onClick={() => onCreateWorkspaceInvite()}
            className="w-full h-9 rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 text-xs"
          >
            Neue Team-Einladung erzeugen
          </Button>
          {generatedWorkspaceInviteCode ? (
            <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 font-mono text-xs text-violet-100 break-all">
              {generatedWorkspaceInviteCode}
            </div>
          ) : null}
          <label className="sr-only" htmlFor="friends-workspace-invite-input">
            Workspace-Einladungscode
          </label>
          <Input
            id="friends-workspace-invite-input"
            value={workspaceInviteCode}
            onChange={(e) => onWorkspaceInviteCodeChange(e.target.value)}
            placeholder="Team-Code (z. B. NL-ABC123)"
            className="w-full min-w-0 bg-white/5 border-white/10 rounded-xl h-10 text-sm placeholder:text-white/55"
          />
          <Button
            type="button"
            onClick={() => onJoinWorkspace()}
            className="w-full h-9 rounded-xl border border-emerald-400/35 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30 text-xs"
          >
            Mit Team-Code beitreten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
