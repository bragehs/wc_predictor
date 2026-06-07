import type { AllPredictions, AllResults, ScoreBreakdown, TournamentConfig } from "../types/index";
import { SCORING, WinnerPoints } from "../config";
import {
  calcGroupStandings, getQualifiers, buildFirstKOBracket,
  FINAL_MATCH_ID, QUALIFICATION_ROUND_ID, THIRD_PLACE_COUNT,
} from "../bracketLogic";
import {
  groupIsComplete, playerGroupIsComplete, pointsForOutcome,
  getPredEffectiveOrder, buildPredFirstKOBracket,
} from "../helpers";

function calcPlayerBreakdown(
  pi: number,
  predictions: AllPredictions,
  results: AllResults,
  cfg: TournamentConfig,
): ScoreBreakdown {
  const { groups, groupMatches, bonusQuestions, knockoutRounds } = cfg;
  let outcomes = 0, table = 0, bonus = 0;
  const knockout: Record<string, number> = {};
  knockoutRounds.forEach(r => { knockout[r.id] = 0; });
  knockout["Winner"] = 0;

  groupMatches.forEach(m => {
    const pred = predictions[pi]?.matchPredictions[m.id];
    outcomes += pointsForOutcome(pred, results.matchResults[m.id]);
  });

  Object.entries(groups).forEach(([g, teams]) => {
    if (!groupIsComplete(g, results)) return;
    if (!playerGroupIsComplete(pi, g, predictions)) return;
    const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
    const actualS   = calcGroupStandings(g, teams, results);
    predOrder.forEach((team, idx) => {
      if (actualS[idx]?.team === team) table += SCORING.tablePosition;
    });
  });

  bonusQuestions.forEach(bq => {
    if (predictions[pi]?.bonusCorrect?.[bq.id] === true) bonus += bq.pts;
  });

  if (knockoutRounds.length > 0) {
    const koW    = predictions[pi]?.knockoutWinners ?? {};
    const actKoW = results.knockoutWinners ?? {};
    const koTeams  = (ids: string[], src: Record<string, string | null>) =>
      new Set(ids.map(id => src[id]).filter((t): t is string => !!t));
    const overlap = (a: Set<string>, b: Set<string>) => [...a].filter(t => b.has(t)).length;

    if (QUALIFICATION_ROUND_ID) {
      const qualRound = knockoutRounds.find(r => r.id === QUALIFICATION_ROUND_ID);
      if (qualRound) {
        const allGroupsPredicted = Object.keys(groups).every(g => playerGroupIsComplete(pi, g, predictions));
        const allGroupsComplete  = Object.keys(groups).every(g => groupIsComplete(g, results));
        const predThirdPlaces    = predictions[pi]?.thirdPlaces;
        const thirdPlaceReady    = THIRD_PLACE_COUNT === 0 || predThirdPlaces?.length === THIRD_PLACE_COUNT;
        if (allGroupsPredicted && allGroupsComplete && thirdPlaceReady) {
          const actualQualTeams = new Set(
            buildFirstKOBracket(getQualifiers(results), null, results.tiebreakers)
              .flatMap(m => [m.home, m.away])
              .filter(t => t !== "3rd TBD")
          );
          buildPredFirstKOBracket(pi, predictions).forEach(m => {
            if (m.home !== "3rd TBD" && actualQualTeams.has(m.home)) knockout[QUALIFICATION_ROUND_ID!] += qualRound.pts;
            if (m.away !== "3rd TBD" && actualQualTeams.has(m.away)) knockout[QUALIFICATION_ROUND_ID!] += qualRound.pts;
          });
        }
      }
    }

    for (let i = 0; i < knockoutRounds.length - 1; i++) {
      const cur  = knockoutRounds[i];
      const next = knockoutRounds[i + 1];
      knockout[next.id] = overlap(koTeams(cur.matchIds, koW), koTeams(cur.matchIds, actKoW)) * next.pts;
    }

    if (koW[FINAL_MATCH_ID] && actKoW[FINAL_MATCH_ID] && koW[FINAL_MATCH_ID] === actKoW[FINAL_MATCH_ID]) {
      knockout["Winner"] = WinnerPoints;
    }
  }

  return { outcomes, table, bonus, knockout };
}

function breakdownTotal(bd: ScoreBreakdown): number {
  return bd.outcomes + bd.table + bd.bonus + Object.values(bd.knockout).reduce((s, v) => s + v, 0);
}

export function useScoring(
  numPlayers: number,
  predictions: AllPredictions,
  results: AllResults,
  tournamentConfig: TournamentConfig,
) {
  function calcScoreBreakdown(pi: number): ScoreBreakdown {
    return calcPlayerBreakdown(pi, predictions, results, tournamentConfig);
  }

  const scores = Array.from({ length: numPlayers }, (_, i) =>
    breakdownTotal(calcPlayerBreakdown(i, predictions, results, tournamentConfig))
  );

  return { scores, calcScoreBreakdown };
}
