import { GROUPS, GROUP_MATCHES } from "./data.js";
import { RAW_SCENARIOS } from "./third_place_combinations.js";

// ── Group Standings ───────────────────────────────────────────────────────────
export function calcGroupStandings(group, teams, results) {
  const pts={}, gf={}, ga={}, w={}, d={}, l={};
  teams.forEach(t => { pts[t]=0; gf[t]=0; ga[t]=0; w[t]=0; d[t]=0; l[t]=0; });
  GROUP_MATCHES.filter(m => m.group === group).forEach(m => {
    const r = results[m.id];
    if (!r || r.home === "" || r.away === "") return;
    const h = parseInt(r.home), a = parseInt(r.away);
    if (isNaN(h) || isNaN(a)) return;
    gf[m.home] += h; ga[m.home] += a;
    gf[m.away] += a; ga[m.away] += h;
    if (h > a)      { pts[m.home] += 3; w[m.home]++; l[m.away]++; }
    else if (h < a) { pts[m.away] += 3; w[m.away]++; l[m.home]++; }
    else            { pts[m.home]++; pts[m.away]++; d[m.home]++; d[m.away]++; }
  });
  return teams
    .map(t => ({ team:t, pts:pts[t], gf:gf[t], ga:ga[t], gd:gf[t]-ga[t], w:w[t], d:d[t], l:l[t] }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

// Returns { A: { first, second, third }, B: ... }
export function getQualifiers(results) {
  const out = {};
  Object.entries(GROUPS).forEach(([g, teams]) => {
    const s = calcGroupStandings(g, teams, results);
    out[g] = { first: s[0].team, second: s[1].team, third: s[2].team, row: s[2] };
  });
  return out;
}

// Returns sorted array of the 8 best 3rd-place teams with their group letter
export function getBestThirdPlaces(qualifiers) {
  return Object.entries(qualifiers)
    .map(([g, q]) => ({ group: g, team: q.third, ...q.row }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8);
}

// ── Round of 32 Structure ─────────────────────────────────────────────────────
//
// 16 matches total (M73–M88). 8 are FIXED (group 1st/2nd only).
// 8 are VARIABLE — a group winner faces a 3rd-place team whose origin
// depends on which 8 of the 12 groups qualified a 3rd-place team.
// FIFA pre-published all 495 combinations in Annex C of the regulations.
//
// Fixed matchups (always the same):
//   M73: A2 vs B2  |  M75: F1 vs C2  |  M76: C1 vs F2  |  M78: E2 vs I2
//   M83: K2 vs L2  |  M84: H1 vs J2  |  M86: J1 vs H2  |  M88: D2 vs G2
//
// Variable matchups (which group's 3rd fills the slot depends on the scenario):
//   M74: E1 vs 3rd  |  M77: I1 vs 3rd  |  M79: A1 vs 3rd  |  M80: L1 vs 3rd
//   M81: D1 vs 3rd  |  M82: G1 vs 3rd  |  M85: B1 vs 3rd  |  M87: K1 vs 3rd

export const FIXED_R32 = [
  { id:"M73", home:"A2", away:"B2" },
  { id:"M75", home:"F1", away:"C2" },
  { id:"M76", home:"C1", away:"F2" },
  { id:"M78", home:"E2", away:"I2" },
  { id:"M83", home:"K2", away:"L2" },
  { id:"M84", home:"H1", away:"J2" },
  { id:"M86", home:"J1", away:"H2" },
  { id:"M88", home:"D2", away:"G2" },
];

// Group winner in each variable match (always the same group):
// [matchId, groupWinner]
export const VARIABLE_R32_WINNERS = {
  M74: "E", M77: "I", M79: "A", M80: "L",
  M81: "D", M82: "G", M85: "B", M87: "K",
};

// The 8 variable match IDs in the order the scenario array values map to:
const VAR_MATCH_ORDER = ["M79","M85","M81","M74","M82","M77","M87","M80"];

// Look up the 3rd-place slot assignments for a given set of qualifying groups.
// qualifyingGroups: array of 8 group letters whose 3rd-place team advances
// Returns: { M74:"E", M77:"J", ... } or null if scenario not found
export function lookupScenario(qualifyingGroups) {
  const key = [...qualifyingGroups].sort().join("");
  const vals = RAW_SCENARIOS[key];
  if (!vals) return null;
  const out = {};
  VAR_MATCH_ORDER.forEach((mid, i) => { out[mid] = vals[i]; });
  return out;
}

// ── Knockout bracket structure ────────────────────────────────────────────────
// Which two R32/R16/QF/SF matches feed into each subsequent match
export const BRACKET_FEEDS = {
  M89:  ["M73","M74"],  M90: ["M75","M76"],
  M91:  ["M77","M78"],  M92: ["M79","M80"],
  M93:  ["M81","M82"],  M94: ["M83","M84"],
  M95:  ["M85","M86"],  M96: ["M87","M88"],
  M97:  ["M89","M90"],  M98: ["M91","M92"],
  M99:  ["M93","M94"],  M100:["M95","M96"],
  M101: ["M97","M98"],  M102:["M99","M100"],
  M104: ["M101","M102"],
};

export const KNOCKOUT_ROUNDS_META = [
  { id:"R32",   label:"Round of 32",    pts:2,  matchIds:["M73","M74","M75","M76","M77","M78","M79","M80","M81","M82","M83","M84","M85","M86","M87","M88"] },
  { id:"R16",   label:"Round of 16",    pts:4,  matchIds:["M89","M90","M91","M92","M93","M94","M95","M96"] },
  { id:"QF",    label:"Quarter-finals", pts:6,  matchIds:["M97","M98","M99","M100"] },
  { id:"SF",    label:"Semi-finals",    pts:10, matchIds:["M101","M102"] },
  { id:"Final", label:"Final",          pts:15, matchIds:["M104"] },
];

export function getMatchRound(matchId) {
  return KNOCKOUT_ROUNDS_META.find(r => r.matchIds.includes(matchId)) || null;
}

// Get teams in any knockout match given the R32 bracket + all known winners so far
export function getKnockoutMatchup(matchId, r32Bracket, knockoutWinners) {
  const r32 = r32Bracket?.find(m => m.id === matchId);
  if (r32) return { home: r32.home, away: r32.away };
  const [fromA, fromB] = BRACKET_FEEDS[matchId] || [];
  return {
    home: (fromA && knockoutWinners?.[fromA]) || (fromA ? `W(${fromA})` : "TBD"),
    away: (fromB && knockoutWinners?.[fromB]) || (fromB ? `W(${fromB})` : "TBD"),
  };
}

// ── Build R32 bracket ─────────────────────────────────────────────────────────
// qualifiers: { A:{first,second,third}, ... }
// qualifyingGroups: array of 8 group letters whose 3rd-place team advances
//   (pass null to auto-derive from qualifiers using best-8 logic)
export function buildR32Bracket(qualifiers, qualifyingGroups) {
  const q8 = qualifyingGroups ?? getBestThirdPlaces(qualifiers).map(t => t.group);
  const scenario = q8.length === 8 ? lookupScenario(q8) : null;

  const res1  = g => qualifiers[g]?.first   || `${g}1`;
  const res2  = g => qualifiers[g]?.second  || `${g}2`;
  const res3  = g => qualifiers[g]?.third   || `3rd(${g})`;
  const var3  = (mid) => scenario ? res3(scenario[mid]) : "3rd TBD";

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
