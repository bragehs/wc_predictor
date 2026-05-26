// ── Scoring ──────────────────────────────────────────────────────────────────
export const SCORING = {
  correctOutcome: 1,   // per group match (H/U/B)
  tablePosition: 2,    // per correct group table position
};

// ── Bonus Questions (each has own pts) ───────────────────────────────────────
export const BONUS_QUESTIONS = [
  { id: "winner",     label: "Tournament Winner (Vir)",     pts: 30 },
  { id: "top_scorer", label: "Top Scorer (Toppscorer)",     pts: 10 },
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
  R16:   2,
  QF:    5,
  SF:    10,
  Final: 20,
};

// ── UI ────────────────────────────────────────────────────────────────────────
export const TABS = ["Setup", "Predictions", "Results", "Bracket", "Standings"];

export const STORAGE_KEY = "wc2026_v4";
