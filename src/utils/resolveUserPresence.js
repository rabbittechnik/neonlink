export function resolvePresenceForSection(globalStatus, _statusBySection, _sectionId) {
    // Presence must reflect real connection only, no manual section overrides.
    return globalStatus === "online" ? "online" : "offline";
}
