import React from "react";
import { CalendarDays } from "lucide-react";
import type { ChatCalendarAnnouncement } from "@/types/collab";

type Props = { payload: ChatCalendarAnnouncement };

export function CalendarAnnouncementMessage({ payload: c }: Props) {
  return (
    <div className="min-w-0 rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-950/40 to-slate-950/50 px-3.5 py-3 space-y-2.5 break-words [overflow-wrap:anywhere]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-100">
        <CalendarDays className="h-3.5 w-3.5 text-cyan-300" />
        Neuer Kalendereintrag
      </div>
      <p className="text-[13px] font-medium leading-relaxed text-white">
        <span className="text-white/90 font-semibold">Von </span>
        <span className="text-fuchsia-300 font-semibold">{c.creatorName}</span>
      </p>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
        <span className="text-white/90 font-semibold">Datum:</span>
        <span className="text-sky-200 font-semibold">{c.dateLabel || "—"}</span>
        <span className="text-white/70">·</span>
        <span className="text-white/90 font-semibold">Uhrzeit:</span>
        <span className="text-cyan-200 font-semibold">{c.timeLabel || "—"}</span>
      </div>
      <p className="text-[13px] leading-relaxed">
        <span className="text-white/90 font-semibold">Termin: </span>
        <span className="text-amber-200 font-semibold">„{c.title}“</span>
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        <span>
          <span className="text-white/90 font-semibold">Rubrik: </span>
          <span className="text-emerald-200 font-semibold">{c.rubrik}</span>
        </span>
        <span>
          <span className="text-white/90 font-semibold">Art: </span>
          <span className="text-violet-200 font-semibold">{c.art}</span>
        </span>
      </div>
      {c.location ? (
        <p className="text-[13px]">
          <span className="text-white/90 font-semibold">Ort: </span>
          <span className="text-orange-200 font-semibold">{c.location}</span>
        </p>
      ) : null}
    </div>
  );
}
