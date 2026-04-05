export type ContactListItem = {
  id: string;
  displayName: string;
  phoneDigits: string;
  linkedUserId: string | null;
  createdAt: string;
  isNeonLinkUser: boolean;
  avatarUrl: string | null;
  neonLinkDisplayName: string | null;
};
