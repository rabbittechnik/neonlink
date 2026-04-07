export function resolvePresenceForSection(globalStatus, _statusBySection, _sectionId) {
    return globalStatus === "online" ? "online" : "offline";
}
