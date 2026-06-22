import { useGame } from "../../context/GameContext";
import { useTournament, useFlag } from "../../context/TournamentContext";
import { THEME } from "../../theme";
import { WinnerPoints } from "../../config";
import { getQualifiers, buildFirstKOBracket, getKnockoutMatchup, FINAL_MATCH_ID } from "../../bracketLogic";
import PtsPill from "../../components/PtsPill";
import ThirdPlaceTiebreakerSection from "../../components/ThirdPlaceTiebreakerSection";

export default function KnockoutResultsSection() {
  const { results, setKnockoutWinnerResult, setTiebreaker, isResultsLocked } = useGame();
  const { knockoutRounds, matchDates } = useTournament();
  const flag = useFlag();
  const isLocked = isResultsLocked;

  const actualQ      = getQualifiers(results);
  const firstKOBracket = buildFirstKOBracket(actualQ, null, results.tiebreakers);
  const koWinners    = results.knockoutWinners ?? {};

  return (
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
          {[...round.matchIds].sort((a, b) => (matchDates[a] ?? "").localeCompare(matchDates[b] ?? "")).map(mid => {
            const { home, away } = getKnockoutMatchup(mid, firstKOBracket, koWinners);
            const winner    = koWinners[mid] ?? null;
            const bothKnown = !home.startsWith("W(") && home !== "TBD" && !away.startsWith("W(") && away !== "TBD";
            return (
              <div key={mid} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: THEME.textFaint, minWidth: 34, fontWeight: 700 }}>{mid}</span>
                <button
                  className="ko-team"
                  onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === home ? null : home)}
                  style={{ background: winner === home ? THEME.blue : THEME.bgButton, border: `1px solid ${winner === home ? THEME.blue : THEME.borderCard}`, color: winner === home ? "#fff" : THEME.textSecondary, cursor: bothKnown && !isLocked ? "pointer" : "default", opacity: !bothKnown || isLocked ? 0.4 : 1 }}
                >
                  {flag(home)} {home}
                </button>
                <span style={{ color: THEME.textFaint, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>vs</span>
                <button
                  className="ko-team"
                  onClick={() => bothKnown && !isLocked && setKnockoutWinnerResult(mid, winner === away ? null : away)}
                  style={{ background: winner === away ? THEME.blue : THEME.bgButton, border: `1px solid ${winner === away ? THEME.blue : THEME.borderCard}`, color: winner === away ? "#fff" : THEME.textSecondary, cursor: bothKnown && !isLocked ? "pointer" : "default", opacity: !bothKnown || isLocked ? 0.4 : 1 }}
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
  );
}
