/** Jitsi-Raumnamen müssen stabil und URL-freundlich sein (gleiche Logik wie bisher im Meeting-Panel). */

export function jitsiRoomForPlannedMeeting(workspaceId: string, meetingId: string): string {
  return `NeonLink-${workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}-${meetingId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24)}`;
}

export function jitsiRoomForWorkspaceRoom(workspaceId: string, meetingRoomId: string): string {
  return `NeonLink-Room-${workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}-${meetingRoomId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24)}`;
}

export function buildJitsiMeetIframeSrc(roomName: string): string {
  const safe = roomName.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "NeonLinkMeet";
  return `https://meet.jit.si/${encodeURIComponent(safe)}#config.prejoinPageEnabled=false`;
}

export function videoMeetingPath(args: {
  workspaceId: string;
  meetingId?: string;
  roomId?: string;
  title: string;
}): string {
  const q = new URLSearchParams();
  q.set("ws", args.workspaceId);
  if (args.meetingId) q.set("mid", args.meetingId);
  if (args.roomId) q.set("rid", args.roomId);
  q.set("title", args.title);
  return `/meet/video?${q.toString()}`;
}
