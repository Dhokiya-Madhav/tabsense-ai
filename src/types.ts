export type GroupColor = "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";

export interface TabInfo {
  title: string;
  site: string;
  icon: string;
}

export interface PlanGroup {
  key: string;
  name: string;
  color: GroupColor;
  existingGroupId: number | null;
  tabIds: number[];
  selected: boolean;
}

export interface Plan {
  windowId: number;
  groups: PlanGroup[];
  ungrouped: number[];
  info: Record<number, TabInfo>;
}

export interface HistoryTab {
  url: string;
  title: string;
  site: string;
}

export interface HistoryGroup {
  name: string;
  color: GroupColor;
  existing: boolean;
  tabs: HistoryTab[];
}

export interface HistoryEntry {
  id: string;
  at: number;
  groups: HistoryGroup[];
}

export type View = "home" | "loading" | "preview" | "history";
export type ToastType = "" | "error" | "success";
