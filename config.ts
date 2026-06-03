import type { ScoringConfig, BonusQuestion, TabName } from "./types/index";

export const SCORING: ScoringConfig = {
  correctOutcome: 1,
  tablePosition: 2,
};

export const BONUS_QUESTIONS: BonusQuestion[] = [
  { id: "top_scorer", label: "Top Scorer (Toppscorer)",     pts: 10 },
];

export const MAX_PLAYERS = 15;

export const COLORS: string[] = [
  "#f97316",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#f43f5e",
  "#eab308",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#14b8a6",
  "#fb923c",
  "#818cf8",
  "#34d399",
  "#c084fc",
  "#fb7185",
];

export const KNOCKOUT_SCORING: Record<string, number> = {
  R32:   2,
  R16:   2,
  QF:    5,
  SF:    10,
  Final: 20
};

export const WinnerPoints = 30;

export const TABS: TabName[] = ["Rules", "Predictions", "Results", "Bracket", "Standings"];

export const STORAGE_KEY = "wc2026_v4";
