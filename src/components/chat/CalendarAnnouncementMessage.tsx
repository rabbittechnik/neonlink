import React from "react";
import { CalendarDays } from "lucide-react";
import type { ChatCalendarAnnouncement } from "@/types/collab";

type Props = { payload: ChatCalendarAnnouncement };

export function CalendarAnnouncementMessage({ payload: c }: Props) {
  return (
    <div className="min-w-0 rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/40 to-slate-950/50 px-3.5 py-3 space-y-2.5 break-words [overflow-wrap:anywhere]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-cyan-200/80">
        <CalendarDays className="h-3.5 w-3.5 text-cyan-300" />
        Neuer Kalendereintrag
      </div>
      <p className="text-[13px] leading-relaxed text-white/90">
        <span className="text-white/55">Von </span>
        <span className="text-fuchsia-300 font-semibold">{c.creatorName}</span>
      </p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
        <span className="text-white/50">Datum:</span>
        <span className="text-sky-300 font-medium">{c.dateLabel || "—"}</span>
        <span className="text-white/35">·</span>
        <span className="text-white/50">Uhrzeit:</span>
        <span className="text-cyan-300 font-medium">{c.timeLabel || "—"}</span>
      </div>
      <p className="text-[13px] leading-relaxed">
        <span className="text-white/50">Termin: </span>
        <span className="text-amber-200 font-semibold">„{c.title}“</span>
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        <span>
          <span className="text-white/50">Rubrik: </span>
          <span className="text-emerald-300 font-medium">{c.rubrik}</span>
        </span>
        <span>
          <span className="text-white/50">Art: </span>
          <span className="text-violet-300 font-medium">{c.art}</span>
        </span>
      </div>
      {c.location ? (
        <p className="text-[13px]">
          <span className="text-white/50">Ort: </span>
          <span className="text-orange-300 font-medium">{c.location}</span>
        </p>
      ) : null}
    </div>
  );
}
