import { supabase } from "./supabase";
import type { AllPredictions, AllResults, BonusQuestion, GroupMatch, KnockoutRoundMeta, MatchPrediction, MatchOutcome } from "./types/index";
import { ROUND_MATCH_IDS } from "./tournaments/active";

const TOURNAMENT_ID = "wc_2026";

export interface PlayerMeta {
  name: string;
  email: string | null;
  isAdmin: boolean;
  approved: boolean;
}

export interface TournamentConfigData {
  groups: Record<string, string[]>;
  groupMatches: GroupMatch[];
  flags: Record<string, string>;
  bonusQuestions: BonusQuestion[];
  knockoutRounds: KnockoutRoundMeta[];
}

export interface AppData {
  players: string[];
  playersMeta: PlayerMeta[];
  predictions: AllPredictions;
  results: AllResults;
  lockDate: Date | null;
  resultsLocked: boolean;
  tournamentConfig: TournamentConfigData;
}

export async function loadAllData(): Promise<AppData> {
  const [
    { data: playerRows },
    { data: settingsRows },
    { data: teamRows },
    { data: bonusQRows },
    { data: koRoundRows },
    { data: matchPredRows },
    { data: tablePredRows },
    { data: bonusAnswerRows },
    { data: koPredRows },
    { data: thirdPlaceRows },
    { data: matchRows },
    { data: tiebreakerRows },
  ] = await Promise.all([
    supabase.from("players").select("name, email, is_admin, approved"),
    supabase.from("settings").select("key, date, locked").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("teams").select("name, flag, group_id, sort_order").eq("tournament_id", TOURNAMENT_ID).order("sort_order"),
    supabase.from("bonus_questions").select("question_id, label, pts, correct_answer").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("knockout_rounds").select("id, label, pts, sort_order").eq("tournament_id", TOURNAMENT_ID).order("sort_order"),
    supabase.from("match_predictions").select("player_name, match_id, outcome").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("table_predictions").select("player_name, group_id, position, team").eq("tournament_id", TOURNAMENT_ID).order("position"),
    supabase.from("bonus_answers").select("player_name, question_id, answer, is_correct").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("knockout_predictions").select("player_name, match_id, predicted_winner").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("third_place_picks").select("player_name, group_id").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("matches").select("id, round, score_home, score_away, ko_winner, home, away, date, group_id").eq("tournament_id", TOURNAMENT_ID),
    supabase.from("tiebreakers").select("group_id, type, team, value").eq("tournament_id", TOURNAMENT_ID),
  ]);

  const playerRows2 = (playerRows ?? []) as Array<{ name: string; email: string | null; is_admin: boolean; approved: boolean }>;
  const playersMeta: PlayerMeta[] = playerRows2.map(r => ({ name: r.name, email: r.email ?? null, isAdmin: r.is_admin ?? false, approved: r.approved ?? false }));
  const playersList = playerRows2.filter(r => r.approved).map(r => r.name);

  const settingRows2 = (settingsRows ?? []) as Array<{ key: string; date: string | null; locked: boolean | null }>;
  const lockDateStr = settingRows2.find(r => r.key === "predictions_lock_date")?.date ?? null;
  const lockDate = lockDateStr ? new Date(lockDateStr) : null;
  const resultsLocked = settingRows2.find(r => r.key === "results_locked")?.locked ?? false;

  // ── Build tournament config from DB rows ──────────────────────────────────
  const flags: Record<string, string> = {};
  const groupsMap: Record<string, string[]> = {};
    ((teamRows ?? []) as Array<{ name: string; flag: string; group_id: string; sort_order: number }>)
    .slice()
    .sort((a, b) => a.group_id.localeCompare(b.group_id) || a.sort_order - b.sort_order)
    .forEach(r => {
      flags[r.name] = r.flag;
      if (!groupsMap[r.group_id]) groupsMap[r.group_id] = [];
      groupsMap[r.group_id].push(r.name);
  });

  const groupMatchesList: GroupMatch[] = ((matchRows ?? []) as Array<{
    id: string; round: string; home: string; away: string; date: string | null; group_id: string | null;
  }>)
    .filter(m => m.round === "group")
    .map(m => ({ id: m.id, group: m.group_id ?? "", home: m.home, away: m.away, date: m.date ?? "" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bonusQuestions: BonusQuestion[] = ((bonusQRows ?? []) as Array<{
    question_id: string; label: string; pts: number;
  }>).map(r => ({ id: r.question_id, label: r.label, pts: r.pts }));

  const knockoutRounds: KnockoutRoundMeta[] = ((koRoundRows ?? []) as Array<{
    id: string; label: string; pts: number; sort_order: number;
  }>).map(r => ({
    id: r.id,
    label: r.label,
    pts: r.pts,
    matchIds: ROUND_MATCH_IDS[r.id] ?? [],
  }));

  const tournamentConfig: TournamentConfigData = { groups: groupsMap, groupMatches: groupMatchesList, flags, bonusQuestions, knockoutRounds };

  // ── Build predictions ─────────────────────────────────────────────────────
  const predsObj: AllPredictions = {};
  playersList.forEach((playerName, idx) => {
    const matchPreds: Record<string, MatchPrediction> = {};
    ((matchPredRows ?? []) as Array<{ player_name: string; match_id: string; outcome: string }>)
      .filter(r => r.player_name === playerName)
      .forEach(r => { matchPreds[r.match_id] = { outcome: r.outcome as MatchOutcome }; });

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

    predsObj[idx] = { matchPredictions: matchPreds, tableOrder, bonus, bonusCorrect, knockoutWinners, thirdPlaces };
  });

  const results = buildResults(matchRows, tiebreakerRows, bonusQRows);

  return { players: playersList, playersMeta, predictions: predsObj, results, lockDate, resultsLocked, tournamentConfig };
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
  const results: AllResults = { matchResults: {} };

  ((matchRows ?? []) as Array<{ id: string; round: string; score_home: number | null; score_away: number | null; ko_winner: string | null }>)
    .forEach(m => {
      if (m.round === "group") {
        if (m.score_home !== null || m.score_away !== null) {
          results.matchResults[m.id] = {
            home: m.score_home?.toString() ?? "",
            away: m.score_away?.toString() ?? "",
          };
        }
      } else {
        if (m.ko_winner !== null) {
          if (!results.knockoutWinners) results.knockoutWinners = {};
          results.knockoutWinners[m.id] = m.ko_winner;
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

// ── Setup saves ───────────────────────────────────────────────────────────────

export async function saveTeam(name: string, flag: string, groupId: string, sortOrder: number): Promise<void> {
  await supabase.from("teams").upsert({ tournament_id: TOURNAMENT_ID, name, flag, group_id: groupId, sort_order: sortOrder });
}

export async function deleteTeam(name: string): Promise<void> {
  await supabase.from("teams").delete().eq("tournament_id", TOURNAMENT_ID).eq("name", name);
}

export async function saveMatchFixture(id: string, home: string, away: string, groupId: string, date: string): Promise<void> {
  await supabase.from("matches").upsert({ tournament_id: TOURNAMENT_ID, id, home, away, group_id: groupId, round: "group", date });
}

export async function deleteMatchFixture(id: string): Promise<void> {
  await supabase.from("matches").delete().eq("tournament_id", TOURNAMENT_ID).eq("id", id);
}

export async function saveBonusQuestion(questionId: string, label: string, pts: number): Promise<void> {
  await supabase.from("bonus_questions").upsert({ tournament_id: TOURNAMENT_ID, question_id: questionId, label, pts });
}

export async function deleteBonusQuestion(questionId: string): Promise<void> {
  await supabase.from("bonus_questions").delete().eq("tournament_id", TOURNAMENT_ID).eq("question_id", questionId);
}

export async function savePlayer(name: string): Promise<void> {
  await supabase.from("players").insert({ name });
}

export async function deletePlayer(name: string): Promise<void> {
  await supabase.from("players").delete().eq("name", name);
}

export async function saveSettings(lockDate: string | null, resultsLocked: boolean): Promise<void> {
  await Promise.all([
    supabase.from("settings").upsert({ tournament_id: TOURNAMENT_ID, key: "predictions_lock_date", date: lockDate, locked: null }),
    supabase.from("settings").upsert({ tournament_id: TOURNAMENT_ID, key: "results_locked", date: null, locked: resultsLocked }),
  ]);
}

export async function savePlayerEmail(name: string, email: string): Promise<void> {
  await supabase.from("players").update({ email: email.trim() || null }).eq("name", name);
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const { data } = await supabase.from("players").select("name").eq("email", email).maybeSingle();
  return !!data;
}

export async function registerPlayer(name: string, email: string): Promise<{ error?: string }> {
  const { data: nameTaken } = await supabase.from("players").select("name").eq("name", name).maybeSingle();
  if (nameTaken) return { error: "That name is already taken. Choose a different display name." };
  const { error } = await supabase.from("players").insert({ name, email, approved: false, is_admin: false });
  if (error) return { error: error.message };
  return {};
}

export async function approvePlayer(name: string): Promise<void> {
  await supabase.from("players").update({ approved: true }).eq("name", name);
}
