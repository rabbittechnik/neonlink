export type EmploymentKind = "vollzeit" | "teilzeit" | "aushilfe";

export type WorkShiftSlotDef = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export type WorkScheduleDayPatterns = {
  vollzeitWeekdays: number[];
  teilzeitWeekdays: number[];
  aushilfeWeekdays: number[];
};

export type WorkScheduleRulesDoc = {
  workspaceId: string;
  slots: WorkShiftSlotDef[];
  dayPatterns: WorkScheduleDayPatterns;
  updatedAt: string;
};

export type WorkplaceEmployee = {
  id: string;
  workspaceId: string;
  name: string;
  employmentType: EmploymentKind;
  createdAt: string;
};

export type ShiftWishEntry = {
  weekday: number;
  slotId: string;
};

export type EmployeeScheduleWish = {
  id: string;
  workspaceId: string;
  employeeId: string;
  preferredWeekdays: number[];
  avoidWeekdays: number[];
  preferredShifts: ShiftWishEntry[];
  avoidShifts: ShiftWishEntry[];
  notes: string;
  updatedAt: string;
};

export type EmployeeAbsencePeriod = {
  id: string;
  workspaceId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  label: string;
  createdAt: string;
};

export type WorkPlanAssignment = {
  date: string;
  slotId: string;
  employeeId: string | null;
};

export type MonthlyWorkPlan = {
  id: string;
  workspaceId: string;
  yearMonth: string;
  assignments: WorkPlanAssignment[];
  generatedAt: string;
};
