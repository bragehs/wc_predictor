import type {
  MatchPrediction,
  AllPredictions,
  AllResults,
  OutcomeStandingRow,
  Qualifiers,
  GroupQualifier,
} from "./types/index";
import { SCORING } from "./config";
import { GROUPS, GROUP_MATCHES } from "./data";
import {
  calcGroupStandingsFromOutcomes,
  buildR32Bracket,
} from "./bracketLogic";

export function groupIsComplete(g: string, results: AllResults): boolean {
  return GROUP_MATCHES.filter(m => m.group === g).every(m => {
    const r = results[m.id] as { home?: unknown; away?: unknown } | undefined;
    return r && r.home !== "" && r.away !== "" && r.home != null && r.away != null;
  });
}

export function playerGroupIsComplete(pi: number, g: string, predictions: AllPredictions): boolean {
  const pred = predictions[pi] ?? {};
  return GROUP_MATCHES.filter(m => m.group === g).every(m => {
    const mp = pred[m.id] as MatchPrediction | undefined;
    return mp?.outcome != null;
  });
}

export function pointsForOutcome(pred: MatchPrediction | undefined, actual: unknown): number {
  if (!pred?.outcome) return 0;
  const r = actual as { home?: unknown; away?: unknown } | undefined;
  const h = parseInt(String(r?.home ?? ""));
  const a = parseInt(String(r?.away ?? ""));
  if (isNaN(h) || isNaN(a)) return 0;
  const actualOutcome = h > a ? "H" : h < a ? "A" : "D";
  return pred.outcome === actualOutcome ? SCORING.correctOutcome : 0;
}

export function applyManualOrder(
  standings: OutcomeStandingRow[],
  storedOrder: string[] | undefined,
): OutcomeStandingRow[] {
  if (!storedOrder || storedOrder.length === 0) return standings;
  const result: OutcomeStandingRow[] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i;
    while (j < standings.length - 1 && standings[j + 1].pts === standings[j].pts) j++;
    const group = standings.slice(i, j + 1);
    if (group.length <= 1) {
      result.push(...group);
    } else {
      result.push(...[...group].sort((a, b) => {
        const ia = storedOrder.indexOf(a.team);
        const ib = storedOrder.indexOf(b.team);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }));
    }
    i = j + 1;
  }
  return result;
}

export function getPredEffectiveOrder(
  pi: number,
  g: string,
  predictions: AllPredictions,
): OutcomeStandingRow[] {
  const preds = predictions[pi] ?? {};
  const tableOrder = preds.tableOrder as Record<string, string[]> | undefined;
  const outcomes: Record<string, string | null> = Object.fromEntries(
    GROUP_MATCHES.filter(m => m.group === g).map(m => {
      const mp = preds[m.id] as MatchPrediction | undefined;
      return [m.id, mp?.outcome ?? null];
    })
  );
  const standings = calcGroupStandingsFromOutcomes(g, GROUPS[g], outcomes);
  return applyManualOrder(standings, tableOrder?.[g]);
}

export function buildPredQualifiers(pi: number, predictions: AllPredictions): Qualifiers {
  const qualifiers: Qualifiers = {};
  Object.entries(GROUPS).forEach(([g]) => {
    const ordered = getPredEffectiveOrder(pi, g, predictions);
    qualifiers[g] = {
      first:  ordered[0]?.team ?? `${g}1`,
      second: ordered[1]?.team ?? `${g}2`,
      third:  ordered[2]?.team ?? `${g}3`,
      row:    ordered[2] ?? { team: `${g}3`, pts: 0, w: 0, d: 0, l: 0 },
    } satisfies GroupQualifier;
  });
  return qualifiers;
}

export function buildPredR32(pi: number, predictions: AllPredictions) {
  const q = buildPredQualifiers(pi, predictions);
  const thirdPlaces = predictions[pi]?.thirdPlaces as string[] | undefined;
  return buildR32Bracket(q, thirdPlaces?.length === 8 ? thirdPlaces : null);
}
