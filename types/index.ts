// ── Domain primitives ─────────────────────────────────────────────────────────

export type MatchOutcome = "H" | "D" | "A";
export type GroupLetter = string;
export type TabName = "Rules" | "Predictions" | "Results" | "Standings" | "Setup";

// ── Static data shapes ────────────────────────────────────────────────────────

export interface GroupMatch {
  id: string;
  group: string;
  home: string;
  away: string;
  date: string;
}

export interface BonusQuestion {
  id: string;
  label: string;
  pts: number;
}

export interface KnockoutRoundMeta {
  id: string;
  label: string;
  pts: number;
  matchIds: string[];
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface ScoringConfig {
  correctOutcome: number;
  tablePosition: number;
}

// ── Bracket logic shapes ──────────────────────────────────────────────────────

export interface R32Match {
  id: string;
  home: string;
  away: string;
}

export interface GroupStandingRow {
  team: string;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  w: number;
  d: number;
  l: number;
}

export interface OutcomeStandingRow {
  team: string;
  pts: number;
  w: number;
  d: number;
  l: number;
}

export interface GroupQualifier {
  first: string;
  second: string;
  third: string;
  row?: GroupStandingRow | OutcomeStandingRow;
}

export type Qualifiers = Record<string, GroupQualifier>;

export interface ThirdPlaceEntry {
  group: string;
  team: string;
  pts: number;
  gd: number;
  gf: number;
}

// ── Predictions ───────────────────────────────────────────────────────────────

export interface MatchPrediction {
  outcome?: MatchOutcome | null;
}

export interface PlayerPredictions {
  matchPredictions: Record<string, MatchPrediction>;
  tableOrder?: Record<string, string[]>;
  bonus?: Record<string, string>;
  bonusCorrect?: Record<string, boolean>;
  thirdPlaces?: string[];
  knockoutWinners?: Record<string, string | null>;
}

export type AllPredictions = Record<number, PlayerPredictions>;

// ── Results ───────────────────────────────────────────────────────────────────

export interface MatchResult {
  home?: string | number;
  away?: string | number;
}

export interface TiebreakerData {
  yellowCards?: Record<string, number>;
  fifaRankings?: Record<string, number>;
}

export interface AllResults {
  matchResults: Record<string, MatchResult>;
  knockoutWinners?: Record<string, string | null>;
  tiebreakers?: Record<string, TiebreakerData>;
  bonusAnswers?: Record<string, string>;
}

// ── Score breakdown ───────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  outcomes: number;
  table: number;
  bonus: number;
  knockout: Record<string, number>;
}
