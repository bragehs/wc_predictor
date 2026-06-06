import { useRef, useMemo } from "react";
import {
  saveMatchPrediction, saveTablePrediction, saveBonusAnswer,
  saveThirdPlacePicks, saveKnockoutPrediction,
  saveMatchScore, saveKnockoutWinner, saveTiebreaker,
} from "../db";

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: T) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function useDebouncedSavers() {
  const matchPredSavers   = useRef({} as Record<string, (outcome: string | null) => void>);
  const tablePredSavers   = useRef({} as Record<string, (teams: string[]) => void>);
  const bonusSavers       = useRef({} as Record<string, (answer: string) => void>);
  const thirdPlacesSavers = useRef({} as Record<string, (groups: string[]) => void>);
  const koPredSavers      = useRef({} as Record<string, (winner: string | null) => void>);
  const matchScoreSavers  = useRef({} as Record<string, (val: string) => void>);
  const koWinnerSavers    = useRef({} as Record<string, (winner: string | null) => void>);

  const tiebreakerSaver = useMemo(() => debounce(
    (g: string, t: string, team: string, val: number | undefined) =>
      saveTiebreaker(g, t, team, val).catch(console.error),
    1000
  ), []);

  function getMatchPredSaver(playerName: string, matchId: string) {
    const key = `${playerName}::${matchId}`;
    if (!matchPredSavers.current[key])
      matchPredSavers.current[key] = debounce(
        (outcome: string | null) => saveMatchPrediction(playerName, matchId, outcome).catch(console.error), 1200
      );
    return matchPredSavers.current[key];
  }

  function getTablePredSaver(playerName: string, groupId: string) {
    const key = `${playerName}::${groupId}`;
    if (!tablePredSavers.current[key])
      tablePredSavers.current[key] = debounce(
        (teams: string[]) => saveTablePrediction(playerName, groupId, teams).catch(console.error), 1200
      );
    return tablePredSavers.current[key];
  }

  function getBonusSaver(playerName: string, qid: string) {
    const key = `${playerName}::${qid}`;
    if (!bonusSavers.current[key])
      bonusSavers.current[key] = debounce(
        (answer: string) => saveBonusAnswer(playerName, qid, answer).catch(console.error), 1200
      );
    return bonusSavers.current[key];
  }

  function getThirdPlacesSaver(playerName: string) {
    if (!thirdPlacesSavers.current[playerName])
      thirdPlacesSavers.current[playerName] = debounce(
        (groups: string[]) => saveThirdPlacePicks(playerName, groups).catch(console.error), 1200
      );
    return thirdPlacesSavers.current[playerName];
  }

  function getKOPredSaver(playerName: string, matchId: string) {
    const key = `${playerName}::${matchId}`;
    if (!koPredSavers.current[key])
      koPredSavers.current[key] = debounce(
        (winner: string | null) => saveKnockoutPrediction(playerName, matchId, winner).catch(console.error), 1200
      );
    return koPredSavers.current[key];
  }

  function getMatchScoreSaver(matchId: string, side: "home" | "away") {
    const key = `${matchId}::${side}`;
    if (!matchScoreSavers.current[key])
      matchScoreSavers.current[key] = debounce(
        (val: string) => saveMatchScore(matchId, side, val).catch(console.error), 1000
      );
    return matchScoreSavers.current[key];
  }

  function getKOWinnerSaver(matchId: string) {
    if (!koWinnerSavers.current[matchId])
      koWinnerSavers.current[matchId] = debounce(
        (winner: string | null) => saveKnockoutWinner(matchId, winner).catch(console.error), 500
      );
    return koWinnerSavers.current[matchId];
  }

  return {
    tiebreakerSaver,
    getMatchPredSaver,
    getTablePredSaver,
    getBonusSaver,
    getThirdPlacesSaver,
    getKOPredSaver,
    getMatchScoreSaver,
    getKOWinnerSaver,
  };
}
