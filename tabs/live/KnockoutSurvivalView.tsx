import { useTournament, useFlag } from "../../context/TournamentContext";
import { useGame } from "../../context/GameContext";
import { THEME } from "../../theme";
import { COLORS } from "../../config";
import { getQualifiers, buildFirstKOBracket, QUALIFICATION_ROUND_ID } from "../../bracketLogic";
import { buildPredFirstKOBracket } from "../../helpers";

const isPlaceholder = (t: string) =>
  /^[A-Z]\d$/.test(t) || t === "3rd TBD" || /^3rd\([A-Z]\)$/.test(t);

export default function KnockoutSurvivalView() {
  const { knockoutRounds, matchDates } = useTournament();
  const { predictions, results, activePlayers } = useGame();
  const flag = useFlag();

  const currentRound = knockoutRounds.find(round =>
    round.matchIds.some(id => !results.knockoutWinners?.[id])
  ) ?? knockoutRounds[knockoutRounds.length - 1];

  if (!currentRound) return null;

  const currentRoundIndex = knockoutRounds.indexOf(currentRound);
  const firstKOBracket = buildFirstKOBracket(getQualifiers(results), null, results.tiebreakers);

  const sortedMatchIds = [...currentRound.matchIds].sort(
    (a, b) => (matchDates[a] ?? "").localeCompare(matchDates[b] ?? "")
  );

  const flagOnly = currentRound.matchIds.length > 8;
  const totalPlayed = sortedMatchIds.filter(mid => results.knockoutWinners?.[mid]).length;

  function getTeamsThrough(pi: number): { count: number; total: number } | null {
    if (currentRound.id === QUALIFICATION_ROUND_ID) {
      const actualList = firstKOBracket.flatMap(m => [m.home, m.away]);
      if (actualList.some(isPlaceholder)) return null;
      const actualTeams = new Set(actualList);

      const playerList = buildPredFirstKOBracket(pi, predictions).flatMap(m => [m.home, m.away]);
      if (playerList.some(isPlaceholder)) return null;
      const playerTeams = new Set(playerList);

      return { count: [...playerTeams].filter(t => actualTeams.has(t)).length, total: actualTeams.size };
    }

    if (currentRoundIndex > 0) {
      const prevRound = knockoutRounds[currentRoundIndex - 1];
      const actualWinners = new Set(
        prevRound.matchIds.map(id => results.knockoutWinners?.[id]).filter((t): t is string => !!t)
      );
      if (actualWinners.size === 0) return null;
      const playerWinners = new Set(
        prevRound.matchIds.map(id => predictions[pi]?.knockoutWinners?.[id]).filter((t): t is string => !!t)
      );
      return { count: [...playerWinners].filter(t => actualWinners.has(t)).length, total: prevRound.matchIds.length };
    }

    return null;
  }

  type PickStatus = "correct" | "wrong" | "pending" | "nopick";
  interface Pick { mid: string; team: string | null; status: PickStatus }

  const playerData = activePlayers
    .map((name, pi) => {
      if (!name) return null;
      const picks: Pick[] = sortedMatchIds.map(mid => {
        const team = predictions[pi]?.knockoutWinners?.[mid] ?? null;
        const actual = results.knockoutWinners?.[mid] ?? null;
        const status: PickStatus = actual !== null
          ? (team !== null && team === actual ? "correct" : "wrong")
          : (team !== null ? "pending" : "nopick");
        return { mid, team, status };
      });
      const correctCount = picks.filter(p => p.status === "correct").length;
      const teamsThrough = getTeamsThrough(pi);
      return { pi, name, picks, correctCount, teamsThrough };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.correctCount - a.correctCount);

  return (
    <div>
      <div style={{
        fontSize: 11, color: THEME.textMuted, marginBottom: 14,
        letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
      }}>
        {currentRound.label} — {totalPlayed}/{sortedMatchIds.length} spilt
      </div>

      {playerData.map(({ pi, name, picks, correctCount, teamsThrough }) => (
        <div key={pi} style={{
          marginBottom: 10,
          background: THEME.bgCard,
          border: `1px solid ${THEME.borderCard}`,
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {/* Name */}
          <div style={{ padding: "7px 10px", background: THEME.bgInset, borderBottom: `1px solid ${THEME.borderFaint}` }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: COLORS[pi], letterSpacing: 0.5 }}>
              {name}
            </span>
          </div>

          {/* Past: how many of this round's teams they had */}
          {teamsThrough && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 10px",
              background: THEME.bgRowAlt,
              borderBottom: `1px solid ${THEME.borderFaint}`,
            }}>
              <span style={{ fontSize: 10, color: THEME.textFaint, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                Lag i {currentRound.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.textSecondary }}>
                {teamsThrough.count}/{teamsThrough.total}
              </span>
            </div>
          )}

          {/* Current: picks to advance from this round */}
          <div style={{ padding: "7px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: THEME.textFaint, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                Spår videre →
              </span>
              {totalPlayed > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: correctCount > 0 ? THEME.green : THEME.textFaint }}>
                  {correctCount}/{totalPlayed} ✓
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {picks.map(({ mid, team, status }) => {
                const isCorrect = status === "correct";
                const isWrong   = status === "wrong";
                const isPending = status === "pending";

                const bg     = isCorrect ? THEME.greenBg     : isWrong ? THEME.redBg     : THEME.bgInput;
                const border = isCorrect ? THEME.greenBorder : isWrong ? THEME.redBorder : THEME.borderInput;
                const color  = isCorrect ? THEME.green       : isWrong ? THEME.red       : isPending ? THEME.textSecondary : THEME.textFaint;

                const label = team
                  ? (flagOnly ? flag(team) : `${flag(team)} ${team}`)
                  : "—";

                return (
                  <span key={mid} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: flagOnly ? 17 : 11,
                    fontWeight: 700,
                    padding: flagOnly ? "3px 4px" : "3px 8px",
                    borderRadius: 7,
                    background: bg,
                    color,
                    border: `1px solid ${border}`,
                    opacity: isWrong ? 0.75 : 1,
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                    {isCorrect && <span style={{ fontSize: 10, marginLeft: 1 }}>✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
