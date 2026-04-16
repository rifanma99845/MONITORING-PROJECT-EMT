import { PanelData } from "../types";

export function calculateTotalProgress(panel: PanelData): number {
  const teams = Object.keys(panel.progress);
  if (teams.length === 0) return 0;
  const total = teams.reduce((acc, team) => acc + (panel.progress[team] || 0), 0);
  return Math.round(total / teams.length);
}

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
