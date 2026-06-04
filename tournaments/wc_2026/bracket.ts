import type { R32Match, Qualifiers, ThirdPlaceEntry, GroupStandingRow } from "../../types/index";
import { RAW_SCENARIOS } from "./third_place_combinations";

// ── WC 2026 — fixed R32 matchups ─────────────────────────────────────────────

export const FIXED_R32: R32Match[] = [
  { id:"M73", home:"A2", away:"B2" },
  { id:"M75", home:"F1", away:"C2" },
  { id:"M76", home:"C1", away:"F2" },
  { id:"M78", home:"E2", away:"I2" },
  { id:"M83", home:"K2", away:"L2" },
  { id:"M84", home:"H1", away:"J2" },
  { id:"M86", home:"J1", away:"H2" },
  { id:"M88", home:"D2", away:"G2" },
];

// Which group's 3rd-place team fills each variable R32 slot
export const VARIABLE_R32_WINNERS: Record<string, string> = {
  M74: "E", M77: "I", M79: "A", M80: "L",
  M81: "D", M82: "G", M85: "B", M87: "K",
};

// Processing order for mapping scenario array values to match slots
export const VAR_MATCH_ORDER = ["M79","M85","M81","M74","M82","M77","M87","M80"] as const;

// Bracket tree: each KO match → [feeder match A, feeder match B]
export const BRACKET_FEEDS: Record<string, [string, string]> = {
  M89:  ["M74","M77"],  M90:  ["M73","M75"],
  M91:  ["M76","M78"],  M92:  ["M79","M80"],
  M93:  ["M83","M84"],  M94:  ["M81","M82"],
  M95:  ["M86","M88"],  M96:  ["M85","M87"],
  M97:  ["M89","M90"],  M98:  ["M93","M94"],
  M99:  ["M91","M92"],  M100: ["M95","M96"],
  M101: ["M97","M98"],  M102: ["M99","M100"],
  M104: ["M101","M102"],
};

// Match IDs per round — pts come from DB (knockout_rounds table)
export const ROUND_MATCH_IDS: Record<string, string[]> = {
  R32:   ["M73","M74","M75","M76","M77","M78","M79","M80","M81","M82","M83","M84","M85","M86","M87","M88"],
  R16:   ["M89","M90","M91","M92","M93","M94","M95","M96"],
  QF:    ["M97","M98","M99","M100"],
  SF:    ["M101","M102"],
  Final: ["M104"],
};

// ── Tournament-specific bracket functions ─────────────────────────────────────

export function lookupScenario(qualifyingGroups: string[]): Record<string, string> | null {
  const key = [...qualifyingGroups].sort().join("");
  const vals = RAW_SCENARIOS[key];
  if (!vals) return null;
  const out: Record<string, string> = {};
  VAR_MATCH_ORDER.forEach((mid, i) => { out[mid] = vals[i]; });
  return out;
}

export function getBestThirdPlaces(qualifiers: Qualifiers): ThirdPlaceEntry[] {
  return Object.entries(qualifiers)
    .map(([g, q]) => {
      const row = q.row as GroupStandingRow | undefined;
      return { group: g, team: q.third, pts: row?.pts ?? 0, gd: row?.gd ?? 0, gf: row?.gf ?? 0 };
    })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8);
}

export function getKnockoutMatchup(
  matchId: string,
  r32Bracket: R32Match[],
  knockoutWinners: Record<string, string | null>,
): { home: string; away: string } {
  const r32 = r32Bracket.find(m => m.id === matchId);
  if (r32) return { home: r32.home, away: r32.away };
  const [fromA, fromB] = BRACKET_FEEDS[matchId] ?? [];
  return {
    home: (fromA && knockoutWinners[fromA]) || (fromA ? `W(${fromA})` : "TBD"),
    away: (fromB && knockoutWinners[fromB]) || (fromB ? `W(${fromB})` : "TBD"),
  };
}

export function buildR32Bracket(qualifiers: Qualifiers, qualifyingGroups?: string[] | null): R32Match[] {
  const q8 = qualifyingGroups ?? getBestThirdPlaces(qualifiers).map(t => t.group);
  const scenario = q8.length === 8 ? lookupScenario(q8) : null;

  const res1 = (g: string) => qualifiers[g]?.first  ?? `${g}1`;
  const res2 = (g: string) => qualifiers[g]?.second ?? `${g}2`;
  const res3 = (g: string) => qualifiers[g]?.third  ?? `3rd(${g})`;
  const var3 = (mid: string) => scenario ? res3(scenario[mid]) : "3rd TBD";

  return [
    { id:"M73", home:res2("A"), away:res2("B") },
    { id:"M74", home:res1("E"), away:var3("M74") },
    { id:"M75", home:res1("F"), away:res2("C") },
    { id:"M76", home:res1("C"), away:res2("F") },
    { id:"M77", home:res1("I"), away:var3("M77") },
    { id:"M78", home:res2("E"), away:res2("I") },
    { id:"M79", home:res1("A"), away:var3("M79") },
    { id:"M80", home:res1("L"), away:var3("M80") },
    { id:"M81", home:res1("D"), away:var3("M81") },
    { id:"M82", home:res1("G"), away:var3("M82") },
    { id:"M83", home:res2("K"), away:res2("L") },
    { id:"M84", home:res1("H"), away:res2("J") },
    { id:"M85", home:res1("B"), away:var3("M85") },
    { id:"M86", home:res1("J"), away:res2("H") },
    { id:"M87", home:res1("K"), away:var3("M87") },
    { id:"M88", home:res2("D"), away:res2("G") },
  ];
}
