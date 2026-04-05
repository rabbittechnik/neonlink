export type ContractScope = "personal" | "family";

export type ContractCustomCategory = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  key: string;
  label: string;
  createdAt: string;
};

export type ContractBundleSummary = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  scope: ContractScope;
  categoryKey: string;
  title: string;
  pageCount: number;
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** GET /contracts/bundles/:id */
export type ContractBundleDetail = Omit<ContractBundleSummary, "pageCount"> & {
  pageDataUrls: string[];
};
