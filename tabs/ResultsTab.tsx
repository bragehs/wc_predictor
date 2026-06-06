import type { AllResults, AllPredictions } from "../types/index";
import { useTournament, useFlag } from "../context/TournamentContext";
import { THEME } from "../theme";
import {
  getQualifiers, buildFirstKOBracket, getKnockoutMatchup, FINAL_MATCH_ID,
} from "../bracketLogic";
import { WinnerPoints } from "../config";
import STitle from "../components/STitle";
import SLabel from "../components/SLabel";
import StatusBanner from "../components/StatusBanner";
import PtsPill from "../components/PtsPill";
import FilterBar from "../components/FilterBar";
import GroupTable from "../components/GroupTable";
import TiebreakerSection from "../components/TiebreakerSection";
import ThirdPlaceTiebreakerSection from "../components/ThirdPlaceTiebreakerSection";

interface ResultsTabProps {
  groupFilter: string;
  setGroupFilter: (g: string) => void;
  results: AllResults;
  setResult: (matchId: string, side: string, val: string) => void;
  setKnockoutWinnerResult: (matchId: string, team: string | null) => void;
  setTiebreaker: (group: string, type: string, team: string, val: number | undefined) => void;
  isLocked: boolean;
  predLocked: boolean;
  isAdmin: boolean;
  activePlayers: string[];
  predictions: AllPredictions;
  setBonusIsCorrect: (playerName: string, qid: string, isCorrect: boolean) => void;
}

export default function ResultsTab({
  groupFilter, setGroupFilter,
  results, setResult, setKnockoutWinnerResult, setTiebreaker,
  isLocked, predLocked, isAdmin, activePlayers, predictions, setBonusIsCorrect,
}: ResultsTabProps) {
  const { groups, groupMatches, bonusQuestions, knockoutRounds } = useTournament();
  const flag = useFlag();
  const actualQ      = getQualifiers(results);
  const firstKOBracket = buildFirstKOBracket(actualQ, null, results.tiebreakers);
  const koWinners    = results.knockoutWinners ?? {};

  const groupFilters = Object.keys(groups).map(g => ({ key: g, label: g, activeColor: THEME.blue, activeTextColor: "#fff" }));
  const extraFilters = [
    { key: "BONUS",    label: "Bonus",    activeColor: THEME.purple, activeTextColor: "#fff" },
    { key: "KNOCKOUT", label: "Knockout", activeColor: THEME.green,  activeTextColor: "#000" },
  ];

  return (
    <div>
      <STitle>Enter Real Results</STitle>

      {isLocked && (
        <StatusBanner color="blue">🔒 Results are currently locked.</StatusBanner>
      )}
      {!isLocked && (
        <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>
          Enter actual scores and knockout results as the tournament progresses.
        </div>
      )}

      <FilterBar filters={[...groupFilters, ...extraFilters]} active={groupFilter} onChange={setGroupFilter} />

      {!["BONUS", "KNOCKOUT", "BRACKET"].includes(groupFilter) && (
        <>
          {groupMatches.filter(m => m.group === groupFilter).map(m => {
            const actual = results.matchResults[m.id] ?? {};
            return (
              <div key={m.id} className="match-row">
                <span style={{ fontSize: 10, color: THEME.textFaint, minWidth: 42, flexShrink: 0 }}>
                  {m.date}
                </span>
                <span style={{ fontSize: 12, flex: 1, textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
                  {flag(m.home)} {m.home}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <input
                    className="score-input actual"
                    type="number" min={0} max={99}
                    value={actual.home ?? ""}
                    onChange={e => !isLocked && setResult(m.id, "home", e.target.value)}
                    readOnly={isLocked}
                    style={{ opacity: isLocked ? 0.5 : 1 }}
                    placeholder="0"
                  />
                  <span style={{ color: THEME.textFaint, fontSize: 11 }}>–</span>
                  <input
                    className="score-input actual"
                    type="number" min={0} max={99}
                    value={actual.away ?? ""}
                    onChange={e => !isLocked && setResult(m.id, "away", e.target.value)}
                    readOnly={isLocked}
                    style={{ opacity: isLocked ? 0.5 : 1 }}
                    placeholder="0"
                  />
                </div>
                <span style={{ fontSize: 12, flex: 1, fontWeight: 600, whiteSpace: "nowrap", color: THEME.textPrimary }}>
                  {flag(m.away)} {m.away}
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 12 }}>
            <SLabel mb={6}>Group {groupFilter} Standings</SLabel>
            <GroupTable group={groupFilter} teams={groups[groupFilter]} results={results} highlight />
          </div>
          <TiebreakerSection group={groupFilter} results={results} setTiebreaker={setTiebreaker} isLocked={isLocked} />
        </>
      )}

      {groupFilter === "BONUS" && (
        <div>
          <SLabel mb={10}>Bonus — mark correct answers</SLabel>
          {bonusQuestions.map(bq => (
            <div key={bq.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textPrimary }}>{bq.label}</span>
                <PtsPill pts={bq.pts} color="blue" />
              </div>
              {(predLocked || isAdmin) ? activePlayers.map((playerName, pi) => {
                const answer    = predictions[pi]?.bonus?.[bq.id];
                const isCorrect = predictions[pi]?.bonusCorrect?.[bq.id] ?? false;
                return (
                  <div key={pi} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 5,
                    padding: "7px 10px",
                    background: THEME.bgButton,
                    borderRadius: 6,
                    border: `1px solid ${THEME.borderCard}`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, minWidth: 72, flexShrink: 0 }}>
                      {playerName}
                    </span>
                    <span style={{ fontSize: 12, flex: 1, color: answer ? THEME.textPrimary : THEME.textFaint, fontStyle: answer ? "normal" : "italic" }}>
                      {answer ?? "no answer"}
                    </span>
                    <button
                      onClick={() => isAdmin && !isLocked && setBonusIsCorrect(playerName, bq.id, !isCorrect)}
                      style={{
                        background:  isCorrect ? THEME.green : THEME.bgInput,
                        border:      `1.5px solid ${isCorrect ? THEME.green : THEME.borderInput}`,
                        color:       isCorrect ? "#000" : THEME.textMuted,
                        borderRadius: 5,
                        padding:     "4px 12px",
                        cursor:      isAdmin && !isLocked ? "pointer" : "default",
                        fontSize:    12,
                        fontWeight:  700,
                        fontFamily:  "'Barlow Condensed', Arial",
                        flexShrink:  0,
                        visibility:  isAdmin || isCorrect ? "visible" : "hidden",
                      }}
                    >
                      {isCorrect ? "Correct" : "Mark correct"}
                    </button>
                  </div>
                );
              }) : (
                <div style={{ fontSize: 12, color: THEME.textFaint, fontStyle: "italic", padding: "6px 0" }}>
                  Answers hidden until predictions are locked.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {groupFilter === "KNOCKOUT" && (
        <div>
          <ThirdPlaceTiebreakerSection results={results} setTiebreaker={setTiebreaker} isLocked={isLocked} />
          {knockoutRounds.map(round => (
            <div key={round.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.blue, letterSpacing: 1, textTransform: "uppercase" }}>
                  {round.label}
                </div>
                <PtsPill pts={round.pts} color="blue" />
              </div>
              {round.matchIds.map(mid => {
                const { home, away } = getKnockoutMatchup(mid, firstKOBracket, koWinners);
                const winner    = koWinners[mid] ?? null;
                const bothKnown = !home.startsWith("W(") && home !== "TBD" && !away.startsWith("W(") && away !== "TBD";
                return (
                  <div key={mid} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 9, color: THEME.textFaint, minWidth: 34, fontWeight: 700 }}>{mid}</span>
                    <button
                      className="ko-team"
                      onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === home ? null : home)}
                      style={{
                        background: winner === home ? THEME.blue : THEME.bgButton,
                        border:     `1px solid ${winner === home ? THEME.blue : THEME.borderCard}`,
                        color:      winner === home ? "#fff" : THEME.textSecondary,
                        cursor:     bothKnown && !isLocked ? "pointer" : "default",
                        opacity:    !bothKnown || isLocked ? 0.4 : 1,
                      }}
                    >
                      {flag(home)} {home}
                    </button>
                    <span style={{ color: THEME.textFaint, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>vs</span>
                    <button
                      className="ko-team"
                      onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === away ? null : away)}
                      style={{
                        background: winner === away ? THEME.blue : THEME.bgButton,
                        border:     `1px solid ${winner === away ? THEME.blue : THEME.borderCard}`,
                        color:      winner === away ? "#fff" : THEME.textSecondary,
                        cursor:     bothKnown && !isLocked ? "pointer" : "default",
                        opacity:    !bothKnown || isLocked ? 0.4 : 1,
                      }}
                    >
                      {flag(away)} {away}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          {(() => {
            const winner = koWinners[FINAL_MATCH_ID] ?? null;
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.blue, letterSpacing: 1, textTransform: "uppercase" }}>
                    Tournament Winner
                  </div>
                  <PtsPill pts={WinnerPoints} color="blue" />
                </div>
                {winner
                  ? <div style={{ padding: "10px 14px", background: THEME.bgButton, border: `1px solid ${THEME.blue}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: THEME.blue }}>
                      🏆 {flag(winner)} {winner}
                    </div>
                  : <div style={{ fontSize: 12, color: THEME.textFaint }}>Set the final match winner above.</div>
                }
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
