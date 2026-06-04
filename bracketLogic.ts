import type {
  GroupStandingRow,
  OutcomeStandingRow,
  Qualifiers,
  KnockoutRoundMeta,
  AllResults,
  TiebreakerData,
} from "./types/index";
import { GROUPS, GROUP_MATCHES } from "./tournamentStore";

export {
  buildFirstKOBracket,
  getBestThirdPlaces,
  getKnockoutMatchup,
  BRACKET_FEEDS,
  FINAL_MATCH_ID,
  QUALIFICATION_ROUND_ID,
  THIRD_PLACE_COUNT,
} from "./tournaments/active";

// ── Group Standings ───────────────────────────────────────────────────────────

export function calcGroupStandings(group: string, teams: string[], results: AllResults): GroupStandingRow[] {
  const pts: Record<string, number> = {};
  const gf:  Record<string, number> = {};
  const ga:  Record<string, number> = {};
  const w:   Record<string, number> = {};
  const d:   Record<string, number> = {};
  const l:   Record<string, number> = {};
  teams.forEach(t => { pts[t]=0; gf[t]=0; ga[t]=0; w[t]=0; d[t]=0; l[t]=0; });

  GROUP_MATCHES.filter(m => m.group === group).forEach(m => {
    const r = results[m.id] as { home?: string; away?: string } | undefined;
    if (!r || r.home === "" || r.away === "") return;
    const h = parseInt(String(r.home ?? ""));
    const a = parseInt(String(r.away ?? ""));
    if (isNaN(h) || isNaN(a)) return;
    gf[m.home] += h; ga[m.home] += a;
    gf[m.away] += a; ga[m.away] += h;
    if (h > a)      { pts[m.home] += 3; w[m.home]++; l[m.away]++; }
    else if (h < a) { pts[m.away] += 3; w[m.away]++; l[m.home]++; }
    else            { pts[m.home]++; pts[m.away]++; d[m.home]++; d[m.away]++; }
  });

  const tb = (results.tiebreakers as Record<string, TiebreakerData> | undefined)?.[group] ?? {};
  return teams
    .map(t => ({ team:t, pts:pts[t], gf:gf[t], ga:ga[t], gd:gf[t]-ga[t], w:w[t], d:d[t], l:l[t] }))
    .sort((a, b) =>
      b.pts - a.pts ||
      b.gd  - a.gd  ||
      b.gf  - a.gf  ||
      ((tb.yellowCards?.[a.team] ?? 999) - (tb.yellowCards?.[b.team] ?? 999)) ||
      ((tb.fifaRankings?.[a.team] ?? 999) - (tb.fifaRankings?.[b.team] ?? 999))
    );
}

export function calcGroupStandingsFromOutcomes(
  group: string,
  teams: string[],
  outcomes: Record<string, string | null>,
): OutcomeStandingRow[] {
  const pts: Record<string, number> = {};
  const w:   Record<string, number> = {};
  const d:   Record<string, number> = {};
  const l:   Record<string, number> = {};
  teams.forEach(t => { pts[t]=0; w[t]=0; d[t]=0; l[t]=0; });

  GROUP_MATCHES.filter(m => m.group === group).forEach(m => {
    const o = outcomes?.[m.id];
    if (!o) return;
    if (o === "H")      { pts[m.home]+=3; w[m.home]++; l[m.away]++; }
    else if (o === "A") { pts[m.away]+=3; w[m.away]++; l[m.home]++; }
    else if (o === "D") { pts[m.home]++; pts[m.away]++; d[m.home]++; d[m.away]++; }
  });

  return teams
    .map(t => ({ team:t, pts:pts[t], w:w[t], d:d[t], l:l[t] }))
    .sort((a, b) => b.pts - a.pts);
}

export function getQualifiers(results: AllResults): Qualifiers {
  const out: Qualifiers = {};
  Object.entries(GROUPS).forEach(([g, teams]) => {
    const s = calcGroupStandings(g, teams, results);
    out[g] = {
      first:  s[0]?.team ?? `${g}1`,
      second: s[1]?.team ?? `${g}2`,
      third:  s[2]?.team ?? `${g}3`,
      row:    s[2],
    };
  });
  return out;
}

export function getMatchRound(matchId: string, knockoutRounds: KnockoutRoundMeta[]): KnockoutRoundMeta | null {
  return knockoutRounds.find(r => r.matchIds?.includes(matchId)) ?? null;
}
