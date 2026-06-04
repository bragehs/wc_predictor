import { supabase } from "./supabase";
import type { AllPredictions, AllResults } from "./types/index";

const TOURNAMENT_ID = "wc_2026";

export interface AppData {
  players: string[];
  predictions: AllPredictions;
  results: AllResults;
  lockDate: Date | null;
  resultsLocked: boolean;
}

export async function loadAllData(): Promise<AppData> {
  const [
    { data: playerRows },
    { data: settingsRows },
    { data: matchPredRows },
    { data: tablePredRows },
    { data: bonusAnswerRows },
    { data: koPredRows },
    { data: thirdPlaceRows },
    { data: matchRows },
    { data: tiebreakerRows },
    { data: bonusQRows },
  ] = await Promise.all([
    supabase.from("players").select("name"),
    supabase.from("settings").select("key, value").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("match_predictions").select("player_name, match_id, outcome").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("table_predictions").select("player_name, group_id, position, team").eq("tournament_id", TOURNAMENT_ID).order("position"),
    supabase.from("bonus_answers").select("player_name, question_id, answer, is_correct").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("knockout_predictions").select("player_name, match_id, predicted_winner").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("third_place_picks").select("player_name, group_id").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("matches").select("id, round, score_home, score_away, ko_winner").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("tiebreakers").select("group_id, type, team, value").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("bonus_questions").select("question_id, correct_answer").eq("tournament_id", TOURNAMENT_ID),
  ]);

  const playersList = ((playerRows ?? []) as Array<{ name: string }>).map(r => r.name);

  const sm = Object.fromEntries(
    ((settingsRows ?? []) as Array<{ key: string; value: unknown }>).map(r => [r.key, r.value])
  );
  const ld = sm["predictions_lock_date"] as string | undefined;
  const lockDate = ld && ld !== "null" ? new Date(ld) : null;
  const resultsLocked = sm["results_locked"] === true;

  const predsObj: AllPredictions = {};
  playersList.forEach((playerName, idx) => {
    const matchPreds: Record<string, { outcome: string }> = {};
    ((matchPredRows ?? []) as Array<{ player_name: string; match_id: string; outcome: string }>)
      .filter(r => r.player_name === playerName)
      .forEach(r => { matchPreds[r.match_id] = { outcome: r.outcome }; });

    const tableOrder: Record<string, string[]> = {};
    ((tablePredRows ?? []) as Array<{ player_name: string; group_id: string; position: number; team: string }>)
      .filter(r => r.player_name === playerName)
      .forEach(r => {
        if (!tableOrder[r.group_id]) tableOrder[r.group_id] = [];
        tableOrder[r.group_id][r.position - 1] = r.team;
      });

    const bonus: Record<string, string> = {};
    const bonusCorrect: Record<string, boolean> = {};
    ((bonusAnswerRows ?? []) as Array<{ player_name: string; question_id: string; answer: string | null; is_correct: boolean | null }>)
      .filter(r => r.player_name === playerName)
      .forEach(r => {
        if (r.answer !== null) bonus[r.question_id] = r.answer;
        if (r.is_correct !== null) bonusCorrect[r.question_id] = r.is_correct;
      });

    const knockoutWinners: Record<string, string | null> = {};
    ((koPredRows ?? []) as Array<{ player_name: string; match_id: string; predicted_winner: string | null }>)
      .filter(r => r.player_name === playerName)
      .forEach(r => { knockoutWinners[r.match_id] = r.predicted_winner; });

    const thirdPlaces = ((thirdPlaceRows ?? []) as Array<{ player_name: string; group_id: string }>)
      .filter(r => r.player_name === playerName)
      .map(r => r.group_id);

    predsObj[idx] = { ...matchPreds, tableOrder, bonus, bonusCorrect, knockoutWinners, thirdPlaces };
  });

  const results = buildResults(matchRows, tiebreakerRows, bonusQRows);

  return { players: playersList, predictions: predsObj, results, lockDate, resultsLocked };
}

export async function loadResults(): Promise<AllResults> {
  const [
    { data: matchRows },
    { data: tiebreakerRows },
    { data: bonusQRows },
  ] = await Promise.all([
    supabase.from("matches").select("id, round, score_home, score_away, ko_winner").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("tiebreakers").select("group_id, type, team, value").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("bonus_questions").select("question_id, correct_answer").eq("tournament_id", TOURNAMENT_ID),
  ]);
  return buildResults(matchRows, tiebreakerRows, bonusQRows);
}

function buildResults(
  matchRows: unknown[] | null,
  tiebreakerRows: unknown[] | null,
  bonusQRows: unknown[] | null
): AllResults {
  const results: AllResults = {};

  ((matchRows ?? []) as Array<{ id: string; round: string; score_home: number | null; score_away: number | null; ko_winner: string | null }>)
    .forEach(m => {
      if (m.round === "group") {
        if (m.score_home !== null || m.score_away !== null) {
          results[m.id] = {
            home: m.score_home?.toString() ?? "",
            away: m.score_away?.toString() ?? "",
          };
        }
      } else {
        if (m.ko_winner !== null) {
          if (!results.knockoutWinners) results.knockoutWinners = {};
          (results.knockoutWinners as Record<string, string | null>)[m.id] = m.ko_winner;
        }
      }
    });

  if ((tiebreakerRows ?? []).length > 0) {
    const tiebreakers: Record<string, Record<string, Record<string, number>>> = {};
    ((tiebreakerRows ?? []) as Array<{ group_id: string; type: string; team: string; value: number | null }>)
      .forEach(r => {
        if (!tiebreakers[r.group_id]) tiebreakers[r.group_id] = {};
        if (!tiebreakers[r.group_id][r.type]) tiebreakers[r.group_id][r.type] = {};
        if (r.value !== null) tiebreakers[r.group_id][r.type][r.team] = r.value;
      });
    results.tiebreakers = tiebreakers;
  }

  const bonusAnswers: Record<string, string> = {};
  ((bonusQRows ?? []) as Array<{ question_id: string; correct_answer: string | null }>)
    .forEach(r => { if (r.correct_answer !== null) bonusAnswers[r.question_id] = r.correct_answer; });
  if (Object.keys(bonusAnswers).length > 0) results.bonusAnswers = bonusAnswers;

  return results;
}

// ── Prediction saves ──────────────────────────────────────────────────────────

export async function saveMatchPrediction(playerName: string, matchId: string, outcome: string | null): Promise<void> {
  if (outcome === null) {
    await supabase.from("match_predictions").delete()
      .eq("tournament_id", TOURNAMENT_ID).eq("player_name", playerName).eq("match_id", matchId);
  } else {
    await supabase.from("match_predictions").upsert({ tournament_id: TOURNAMENT_ID, player_name: playerName, match_id: matchId, outcome });
  }
}

export async function saveTablePrediction(playerName: string, groupId: string, teams: string[]): Promise<void> {
  const rows = teams.map((team, i) => ({ tournament_id: TOURNAMENT_ID, player_name: playerName, group_id: groupId, position: i + 1, team }));
  await supabase.from("table_predictions").upsert(rows);
}

export async function saveBonusAnswer(playerName: string, questionId: string, answer: string): Promise<void> {
  await supabase.from("bonus_answers").upsert({ tournament_id: TOURNAMENT_ID, player_name: playerName, question_id: questionId, answer });
}

export async function saveThirdPlacePicks(playerName: string, groups: string[]): Promise<void> {
  await supabase.from("third_place_picks").delete()
    .eq("tournament_id", TOURNAMENT_ID).eq("player_name", playerName);
  if (groups.length > 0) {
    await supabase.from("third_place_picks").insert(
      groups.map(group_id => ({ tournament_id: TOURNAMENT_ID, player_name: playerName, group_id }))
    );
  }
}

export async function saveKnockoutPrediction(playerName: string, matchId: string, winner: string | null): Promise<void> {
  await supabase.from("knockout_predictions").upsert({ tournament_id: TOURNAMENT_ID, player_name: playerName, match_id: matchId, predicted_winner: winner });
}

// ── Result saves ──────────────────────────────────────────────────────────────

export async function saveMatchScore(matchId: string, side: "home" | "away", val: string): Promise<void> {
  const col = side === "home" ? "score_home" : "score_away";
  const value = val === "" ? null : parseInt(val);
  await supabase.from("matches").update({ [col]: value })
    .eq("tournament_id", TOURNAMENT_ID).eq("id", matchId);
}

export async function saveKnockoutWinner(matchId: string, winner: string | null): Promise<void> {
  await supabase.from("matches").update({ ko_winner: winner })
    .eq("tournament_id", TOURNAMENT_ID).eq("id", matchId);
}

export async function saveTiebreaker(groupId: string, type: string, team: string, value: number | undefined): Promise<void> {
  if (value === undefined) {
    await supabase.from("tiebreakers").delete()
      .eq("tournament_id", TOURNAMENT_ID).eq("group_id", groupId).eq("type", type).eq("team", team);
  } else {
    await supabase.from("tiebreakers").upsert({ tournament_id: TOURNAMENT_ID, group_id: groupId, type, team, value });
  }
}

export async function saveBonusIsCorrect(playerName: string, questionId: string, isCorrect: boolean): Promise<void> {
  await supabase.from("bonus_answers").upsert({ tournament_id: TOURNAMENT_ID, player_name: playerName, question_id: questionId, is_correct: isCorrect });
}
