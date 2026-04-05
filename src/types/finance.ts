export type FinanceScope = "personal" | "family";
export type FinanceKind = "expense" | "income";
export type FinanceStatus = "open" | "paid" | "overdue";

export type FinanceRecordSummary = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  scope: FinanceScope;
  kind: FinanceKind;
  category: string;
  title: string;
  amountCents: number;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  status: FinanceStatus;
  payee: string | null;
  notes: string | null;
  visibilityUserIds: string[];
  /** Optional: ID eines Haushalts aus dem Finanz-Haushaltsplan */
  linkedHouseholdId: string | null;
  createdAt: string;
  updatedAt: string;
  hasImage: boolean;
  hasExtraAttachment: boolean;
};

/** Vollständiger Datensatz inkl. Bilder (GET /finance/records/:id) */
export type FinanceRecordDetail = Omit<FinanceRecordSummary, "hasImage" | "hasExtraAttachment"> & {
  imageDataUrl: string;
  extraAttachmentDataUrl: string | null;
};
