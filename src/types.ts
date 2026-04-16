export interface PanelData {
  id: string;
  code: string;
  name: string;
  project: string;
  progress: Record<string, number>; // Dynamic teams: { "FABRIKASI": 100, "WIRING": 50, ... }
  position: { x: number; y: number };
  warehouse: "Warehouse 1" | "Warehouse 2";
}

export interface ProjectState {
  panels: PanelData[];
  layout: {
    width: number;
    height: number;
  };
}

export type HistoryItem = PanelData[];
