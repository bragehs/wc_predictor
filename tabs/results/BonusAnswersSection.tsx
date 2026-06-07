import { useGame } from "../../context/GameContext";
import { useTournament } from "../../context/TournamentContext";
import { THEME } from "../../theme";
import SLabel from "../../components/SLabel";
import PtsPill from "../../components/PtsPill";

export default function BonusAnswersSection() {
  const { predictions, results, activePlayers, isResultsLocked, isLocked: predLocked, isAdmin, setBonusIsCorrect } = useGame();
  const { bonusQuestions } = useTournament();

  return (
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
              <div key={pi} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, padding: "7px 10px", background: THEME.bgButton, borderRadius: 6, border: `1px solid ${THEME.borderCard}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textSecondary, minWidth: 72, flexShrink: 0 }}>
                  {playerName}
                </span>
                <span style={{ fontSize: 12, flex: 1, color: answer ? THEME.textPrimary : THEME.textFaint, fontStyle: answer ? "normal" : "italic" }}>
                  {answer ?? "no answer"}
                </span>
                <button
                  onClick={() => isAdmin && !isResultsLocked && setBonusIsCorrect(playerName, bq.id, !isCorrect)}
                  style={{
                    background:   isCorrect ? THEME.green : THEME.bgInput,
                    border:       `1.5px solid ${isCorrect ? THEME.green : THEME.borderInput}`,
                    color:        isCorrect ? "#000" : THEME.textMuted,
                    borderRadius: 5,
                    padding:      "4px 12px",
                    cursor:       isAdmin && !isResultsLocked ? "pointer" : "default",
                    fontSize:     12,
                    fontWeight:   700,
                    fontFamily:   "'Barlow Condensed', Arial",
                    flexShrink:   0,
                    visibility:   isAdmin || isCorrect ? "visible" : "hidden",
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
  );
}
