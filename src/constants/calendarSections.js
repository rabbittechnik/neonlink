/** Rubriken für Kalender-Termine (Farben passend zur App). */
export const CALENDAR_SECTION_META = {
    familie: {
        label: "Familie",
        chip: "bg-cyan-500/20 text-cyan-100 border-cyan-400/35",
        dot: "bg-cyan-400",
        border: "border-cyan-400/40",
    },
    freunde: {
        label: "Freunde",
        chip: "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/35",
        dot: "bg-fuchsia-400",
        border: "border-fuchsia-400/40",
    },
    verwandte: {
        label: "Verwandte",
        chip: "bg-rose-500/20 text-rose-100 border-rose-400/35",
        dot: "bg-rose-400",
        border: "border-rose-400/40",
    },
    feuerwehr: {
        label: "Feuerwehr",
        chip: "bg-orange-500/20 text-orange-100 border-orange-400/35",
        dot: "bg-orange-400",
        border: "border-orange-400/40",
    },
    arbeit: {
        label: "Arbeit",
        chip: "bg-amber-500/20 text-amber-100 border-amber-400/35",
        dot: "bg-amber-400",
        border: "border-amber-400/40",
    },
    ideen: {
        label: "Ideen",
        chip: "bg-emerald-500/20 text-emerald-100 border-emerald-400/35",
        dot: "bg-emerald-400",
        border: "border-emerald-400/40",
    },
};
/** Karten in der Sidebar „Nächste Termine“ (Rubrik-Farben, Feuerwehr rot). */
export const CALENDAR_UPCOMING_CARD = {
    familie: {
        wrap: "border-cyan-400/45 bg-gradient-to-br from-cyan-500/18 to-blue-600/10",
        iconWrap: "bg-cyan-400/15 border-cyan-300/35",
        clockClass: "text-cyan-200",
    },
    freunde: {
        wrap: "border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-500/18 to-violet-600/10",
        iconWrap: "bg-fuchsia-400/15 border-fuchsia-300/35",
        clockClass: "text-fuchsia-200",
    },
    verwandte: {
        wrap: "border-rose-400/45 bg-gradient-to-br from-rose-500/18 to-pink-600/10",
        iconWrap: "bg-rose-400/15 border-rose-300/35",
        clockClass: "text-rose-200",
    },
    feuerwehr: {
        wrap: "border-red-400/50 bg-gradient-to-br from-red-600/24 to-orange-700/12",
        iconWrap: "bg-red-500/25 border-red-400/45",
        clockClass: "text-red-100",
    },
    arbeit: {
        wrap: "border-amber-400/50 bg-gradient-to-br from-amber-500/22 to-yellow-600/10",
        iconWrap: "bg-amber-400/20 border-amber-300/40",
        clockClass: "text-amber-100",
    },
    ideen: {
        wrap: "border-emerald-400/45 bg-gradient-to-br from-emerald-500/18 to-teal-600/10",
        iconWrap: "bg-emerald-400/15 border-emerald-300/35",
        clockClass: "text-emerald-200",
    },
};
export const CALENDAR_SECTION_IDS = Object.keys(CALENDAR_SECTION_META);
