import { useTournament, useFlag } from "../../context/TournamentContext";
import { useGame } from "../../context/GameContext";
import { THEME } from "../../theme";
import { COLORS } from "../../config";
import { getQualifiers, buildFirstKOBracket, FINAL_MATCH_ID } from "../../bracketLogic";
import { buildPredFirstKOBracket } from "../../helpers";

const isPlaceholder = (t: string) =>
  /^[A-Z]\d$/.test(t) || t === "3rd TBD" || /^3rd\([A-Z]\)$/.test(t);

export default function KnockoutSurvivalView() {
  const { knockoutRounds } = useTournament();
  const { predictions, results, activePlayers } = useGame();
  const flag = useFlag();

  const actKoW = results.knockoutWinners ?? {};
  const firstKOBracket = buildFirstKOBracket(getQualifiers(results), null, results.tiebreakers);

  const players = activePlayers
    .map((name, pi) => ({ name, pi }))
    .filter(p => !!p.name);

  function getActualTeams(roundIdx: number): string[] {
    if (roundIdx === 0) {
      return firstKOBracket
        .flatMap(m => [m.home, m.away])
        .filter(t => !isPlaceholder(t));
    }
    return knockoutRounds[roundIdx - 1].matchIds
      .map(mid => actKoW[mid])
      .filter((t): t is string => !!t);
  }

  function getPlayerTeams(pi: number, roundIdx: number): string[] {
    if (roundIdx === 0) {
      return buildPredFirstKOBracket(pi, predictions)
        .flatMap(m => [m.home, m.away])
        .filter(t => !isPlaceholder(t));
    }
    return knockoutRounds[roundIdx - 1].matchIds
      .map(mid => predictions[pi]?.knockoutWinners?.[mid])
      .filter((t): t is string => !!t);
  }

  const champion = actKoW[FINAL_MATCH_ID] ?? null;

  return (
    <div>
      {knockoutRounds.map((round, roundIdx) => {
        const actualTeams = getActualTeams(roundIdx);
        const expectedTotal = roundIdx === 0
          ? round.matchIds.length * 2
          : knockoutRounds[roundIdx - 1].matchIds.length;
        if (actualTeams.length < expectedTotal) return null;

        const playerRows = players
          .map(({ name, pi }) => {
            const playerTeams = new Set(getPlayerTeams(pi, roundIdx));
            const count = actualTeams.filter(t => playerTeams.has(t)).length;
            return { name, pi, count };
          })
          .sort((a, b) => b.count - a.count);

        const maxCount = playerRows[0]?.count ?? 0;

        return (
          <div key={round.id} style={{ marginBottom: 22 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.gold, letterSpacing: 1, textTransform: "uppercase" }}>
                {round.label} · {actualTeams.length} teams
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, background: THEME.bgCard, border: `1px solid ${THEME.borderCard}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
              {actualTeams.map(team => (
                <span key={team} style={{ fontSize: 24 }} title={team}>
                  {flag(team)}
                </span>
              ))}
            </div>

            <div style={{ background: THEME.bgCard, border: `1px solid ${THEME.borderCard}`, borderRadius: 8, overflow: "hidden" }}>
              {playerRows.map(({ name, pi, count }, i, arr) => {
                const isTop = count === maxCount;
                return (
                  <div key={pi} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 12px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${THEME.borderFaint}` : "none",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[pi] }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isTop ? THEME.gold : THEME.textSecondary }}>
                      {count}/{actualTeams.length}{isTop ? " ✓" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Champion */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.gold, letterSpacing: 1, textTransform: "uppercase" }}>
            Champion
          </div>
        </div>

        <div style={{ background: THEME.bgCard, border: `1px solid ${THEME.borderCard}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${THEME.borderFaint}`, fontSize: 18, fontWeight: 700, color: THEME.textPrimary }}>
            {champion ? `${flag(champion)} ${champion}` : "TBD"}
          </div>
          {players.map(({ name, pi }, i, arr) => {
            const pick = predictions[pi]?.knockoutWinners?.[FINAL_MATCH_ID] ?? null;
            const isCorrect = !!champion && pick === champion;
            const isWrong = !!champion && !!pick && pick !== champion;
            return (
              <div key={pi} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: i < arr.length - 1 ? `1px solid ${THEME.borderFaint}` : "none",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[pi] }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isCorrect ? THEME.green : isWrong ? THEME.red : THEME.textFaint }}>
                  {pick ? `${flag(pick)} ${pick}` : "—"}
                  {isCorrect && " ✓"}
                  {isWrong && " ✗"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
