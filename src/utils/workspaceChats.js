export function displayChatTitle(room, currentUserId, userNames) {
    if (room.chatType === "private") {
        const other = room.participants.find((id) => id !== currentUserId);
        return (other && userNames[other]) || "Privatchat";
    }
    const n = room.name.trim();
    return n || "Chat";
}
export function roomsForSection(rooms, sectionId) {
    return rooms.filter((r) => r.sectionId === sectionId);
}
export function sortGlobalsMainFirst(a, b) {
    if (a.chatType !== "global" || b.chatType !== "global")
        return 0;
    if (Boolean(a.isMain) !== Boolean(b.isMain))
        return a.isMain ? -1 : 1;
    return a.name.localeCompare(b.name, "de");
}
export function sortByActivity(rooms, lastActivityMs) {
    return [...rooms].sort((a, b) => {
        const ta = lastActivityMs[a.id] ?? new Date(a.createdAt).getTime();
        const tb = lastActivityMs[b.id] ?? new Date(b.createdAt).getTime();
        return tb - ta;
    });
}
export function enrichOfflineRooms(rooms, workspaceId) {
    const mainSeen = new Set();
    return rooms.map((r) => {
        const isFirstText = r.kind === "text" && !mainSeen.has(r.sectionId);
        if (isFirstText)
            mainSeen.add(r.sectionId);
        return {
            id: r.id,
            workspaceId,
            sectionId: r.sectionId,
            name: r.name,
            kind: r.kind,
            chatType: "global",
            participants: [],
            isMain: isFirstText,
            createdAt: new Date(0).toISOString(),
        };
    });
}
export function pickDefaultRoomForSection(rooms) {
    if (rooms.length === 0)
        return null;
    const main = rooms.find((r) => r.chatType === "global" && r.isMain);
    if (main)
        return main.id;
    const firstGlobal = rooms.find((r) => r.chatType === "global");
    return (firstGlobal ?? rooms[0]).id;
}
export function lastRoomStorageKey(workspaceId, sectionId) {
    return `neonlink:lastRoom:${workspaceId}:${sectionId}`;
}
