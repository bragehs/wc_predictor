// ── Scoring ──────────────────────────────────────────────────────────────────
export const SCORING = {
  exactScore: 3,
  correctOutcome: 1,
  bonusQuestion: 5,
};

// ── Bonus Questions ───────────────────────────────────────────────────────────
export const BONUS_QUESTIONS = [
  { id: "winner",         label: "Tournament Winner" },
  { id: "golden_boot",   label: "Golden Boot (Top Scorer)" },
  { id: "best_player",   label: "Best Player (Golden Ball)" },
  { id: "top_upset",     label: "Biggest Surprise Qualifier (Group Stage)" },
  { id: "first_out",     label: "First Team Eliminated" },
  { id: "top_scorer",    label: "Number of goals by top scorer" },
];

// ── Players ───────────────────────────────────────────────────────────────────
export const MAX_PLAYERS = 15;

export const COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#10b981", // emerald
  "#a855f7", // purple
  "#f43f5e", // rose
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#14b8a6", // teal
  "#fb923c", // light orange
  "#818cf8", // indigo
  "#34d399", // light green
  "#c084fc", // light purple
  "#fb7185", // light rose
];

export const PLAYER_EMOJIS = [
  "🦁","🐉","🦊","🐺","🦅",
  "🐯","🦈","🐻","🦋","🦓",
  "🦏","🐘","🦒","🐆","🦬",
];

// ── Knockout scoring (pts per correct winner prediction, per round) ───────────
export const KNOCKOUT_SCORING = {
  R32:   2,
  R16:   4,
  QF:    6,
  SF:    10,
  Final: 15,
};

// ── UI ────────────────────────────────────────────────────────────────────────
export const TABS = ["Setup", "Predictions", "Results", "Bracket", "Standings"];

export const STORAGE_KEY = "wc2026_v3";
