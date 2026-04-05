export function resolvePresenceForSection(globalStatus, statusBySection, sectionId) {
    const s = statusBySection?.[sectionId];
    if (s === "online" || s === "away" || s === "busy" || s === "offline" || s === "on_call")
        return s;
    if (globalStatus === "online" || globalStatus === "away" || globalStatus === "busy" || globalStatus === "offline" || globalStatus === "on_call") {
        return globalStatus;
    }
    return "offline";
}
