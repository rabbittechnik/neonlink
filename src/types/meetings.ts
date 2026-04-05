export type ApiMeetingRoom = {
  id: string;
  workspaceId: string;
  name: string;
  lockedName: boolean;
  sortOrder: number;
  isDefault: boolean;
};

export type ApiMeeting = {
  id: string;
  workspaceId: string;
  meetingRoomId: string;
  title: string;
  description: string;
  createdByUserId: string;
  participantUserIds: string[];
  startsAt: string;
  endsAt: string;
  calendarEventId: string;
  createdAt: string;
};
