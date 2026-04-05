export type MietePaidBy = "person1" | "person2" | "household";

export type HouseholdMonthlyFixedCosts = {
  mieteCents: number;
  mietePaidBy: MietePaidBy;
  internetCents: number;
  versicherungenCents: number;
  autoCents: number;
  stromCents: number;
  wasserCents: number;
  heizungCents: number;
  handyCents: number;
  streamingCents: number;
  krediteCents: number;
  lebensmittelCents: number;
};

export type FinanceHouseholdEntry = {
  id: string;
  name: string;
  costs: HouseholdMonthlyFixedCosts;
};

export type FinanceHouseholdPlan = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  memberUserIds: string[];
  households: FinanceHouseholdEntry[];
  createdAt: string;
  updatedAt: string;
};
